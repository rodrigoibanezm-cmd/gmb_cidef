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
  const entries = Array.isArray(raw) ? Object.entries(Object.fromEntries(raw.map((v, i, a) => i % 2 === 0 ? [v, a[i + 1]] : null).filter(Boolean))) : Object.entries(raw || {});

  return entries.map(([placeId, value]) => ({
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

function groupByMall(places) {
  return places.reduce((acc, place) => {
    const mall = place.mall || place.mall_id || place.mall_name;
    const brand = place.brand || place.brand_id || place.name;

    if (!mall || !brand) return acc;
    if (!acc[mall]) acc[mall] = [];
    acc[mall].push({ ...place, mall, brand });

    return acc;
  }, {});
}

function cleanReviews(reviews) {
  return reviews.map((review) => ({
    rating: review.rating ?? 0,
    text: review.text || review.original_text || "",
  }));
}

function analyzeReviews(allReviews) {
  const keywords = [
    "mala atención",
    "pésima atención",
    "no atienden",
    "ignoran",
    "no saludan",
    "mal servicio",
  ];

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

export async function compareMallFromSnapshot({ mall, date = today() }) {
  const classified = await getClassifiedPlaces();
  const placesByMall = groupByMall(classified);
  const stores = placesByMall[mall] || [];
  const results = [];

  for (const place of stores) {
    const snapshot = await getSnapshot(date, place.place_id);
    if (!snapshot) continue;

    const reviews = cleanReviews(await getReviews(date, place.place_id));
    const reviewsCount = snapshot.review_count ?? 0;

    results.push({
      brand: place.brand,
      place_id: place.place_id,
      rating: snapshot.rating ?? 0,
      reviews_count: reviewsCount,
      confidence: confidence(reviewsCount),
      reviews,
    });
  }

  const ranking = results.sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count);
  const allReviews = results.flatMap((result) => result.reviews);
  const beautyPlus = ranking.find((item) => item.brand === "beauty_plus");
  const top = ranking[0] || null;

  return {
    date,
    mall,
    ranking,
    beauty_plus: beautyPlus && top ? {
      position: ranking.indexOf(beautyPlus) + 1,
      rating: beautyPlus.rating,
      reviews: beautyPlus.reviews_count,
      confidence: beautyPlus.confidence,
      gap_vs_top: +(top.rating - beautyPlus.rating).toFixed(2),
    } : null,
    insight: analyzeReviews(allReviews),
  };
}

export async function compareAllFromSnapshot({ date = today() } = {}) {
  const classified = await getClassifiedPlaces();
  const placesByMall = groupByMall(classified);
  const malls = [];

  for (const mall of Object.keys(placesByMall)) {
    malls.push(await compareMallFromSnapshot({ mall, date }));
  }

  return { date, malls };
}
