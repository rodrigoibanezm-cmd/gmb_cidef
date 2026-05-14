import { gmbCaptureKeys } from "./keys.js";
import { redisCommand } from "./redis.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function confidence(n) {
  if (n < 10) return "baja";
  if (n < 30) return "media";
  return "alta";
}

async function getClassifiedPlaces() {
  const raw = await redisCommand(["HGETALL", gmbCaptureKeys.classifiedHash]);
  return Object.entries(raw || {}).map(([placeId, value]) => ({
    place_id: placeId,
    ...(safeJson(value) || {}),
  }));
}

async function getSnapshot(date, placeId) {
  const raw = await redisCommand(["GET", gmbCaptureKeys.snapshot(date, placeId)]);
  return safeJson(raw);
}

async function getReviews(date, placeId) {
  const raw = await redisCommand(["GET", `gmb:index:${date}:place:${placeId}:review_keys`]);
  const keys = safeJson(raw) || [];
  const reviews = [];

  for (const key of keys) {
    const review = safeJson(await redisCommand(["GET", key]));
    if (review) reviews.push(review);
  }

  return reviews;
}

function groupByLocation(places) {
  return places.reduce((acc, place) => {
    const location = place.normalized_location || place.mall || place.city;
    const brand = place.brand || place.name;

    if (!location || !brand) return acc;
    if (!acc[location]) acc[location] = [];
    acc[location].push({ ...place, location, brand });

    return acc;
  }, {});
}

function cleanReviews(reviews, limit) {
  return reviews.slice(0, limit).map((review) => ({
    rating: review.rating ?? 0,
    text: review.text || review.original_text || "",
  }));
}

function analyzeReviews(allReviews) {
  const keywords = ["atención", "servicio", "espera", "demora", "problema"];
  const evidenceCount = allReviews.filter((review) => {
    const text = String(review.text || "").toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  }).length;

  let severity = "baja";
  if (evidenceCount >= 3) severity = "alta";
  else if (evidenceCount >= 1) severity = "media";

  return {
    main_issue: "atención en tienda",
    severity,
    evidence_count: evidenceCount,
  };
}

function buildOwnedSummary(ranking) {
  const owned = ranking.find((item) => item.ownership_group === "cidef" || item.ownership_group === "own");
  const top = ranking[0] || null;

  if (!owned || !top) return null;

  return {
    position: ranking.indexOf(owned) + 1,
    brand: owned.brand,
    rating: owned.rating,
    reviews: owned.reviews_count,
    confidence: owned.confidence,
    gap_vs_top: +(top.rating - owned.rating).toFixed(2),
  };
}

async function buildRanking({ date, stores, includeReviews, evidenceLimit }) {
  const results = [];
  const allReviews = [];

  for (const place of stores) {
    const snapshot = await getSnapshot(date, place.place_id);
    if (!snapshot) continue;

    const reviewsCount = snapshot.review_count ?? 0;
    const item = {
      brand: place.brand,
      name: place.name || snapshot.name,
      place_id: place.place_id,
      ownership_group: place.ownership_group || null,
      store_role: place.store_role || null,
      rating: snapshot.rating ?? 0,
      reviews_count: reviewsCount,
      confidence: confidence(reviewsCount),
    };

    if (includeReviews) {
      const reviews = cleanReviews(await getReviews(date, place.place_id), evidenceLimit);
      item.reviews = reviews;
      allReviews.push(...reviews);
    }

    results.push(item);
  }

  return {
    ranking: results.sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count),
    allReviews,
  };
}

export async function compareMallFromSnapshot({ mall, date = today(), includeReviews = false, evidenceLimit = 3 }) {
  const classified = await getClassifiedPlaces();
  const placesByLocation = groupByLocation(classified);
  const stores = placesByLocation[mall] || [];
  const { ranking, allReviews } = await buildRanking({ date, stores, includeReviews, evidenceLimit });

  return {
    date,
    mall,
    ranking,
    owned: buildOwnedSummary(ranking),
    insight: includeReviews ? analyzeReviews(allReviews) : null,
  };
}

export async function compareAllFromSnapshot({ date = today() } = {}) {
  const classified = await getClassifiedPlaces();
  const placesByLocation = groupByLocation(classified);
  const malls = [];

  for (const mall of Object.keys(placesByLocation)) {
    const stores = placesByLocation[mall];
    const { ranking } = await buildRanking({ date, stores, includeReviews: false, evidenceLimit: 0 });

    malls.push({
      date,
      mall,
      stores_count: ranking.length,
      top: ranking[0] || null,
      owned: buildOwnedSummary(ranking),
    });
  }

  return { date, malls };
}
