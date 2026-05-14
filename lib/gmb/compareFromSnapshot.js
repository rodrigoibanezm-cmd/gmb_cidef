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
    confidence: owned.confidence || confidence(owned.reviews_count || 0),
    gap_vs_top: +(top.rating - owned.rating).toFixed(2),
  };
}

async function getLocationRanking(date, location) {
  const raw = await redisCommand(["GET", `gmb:index:${date}:location:${location}:ranking`]);
  return safeJson(raw) || [];
}

async function getLocationSummaries(date) {
  const raw = await redisCommand(["GET", `gmb:index:${date}:locations`]);
  return safeJson(raw) || [];
}

export async function compareMallFromSnapshot({ mall, date = today(), includeReviews = false, evidenceLimit = 3 }) {
  const ranking = await getLocationRanking(date, mall);
  const allReviews = [];

  if (includeReviews) {
    for (const item of ranking) {
      const reviews = cleanReviews(await getReviews(date, item.place_id), evidenceLimit);
      item.reviews = reviews;
      allReviews.push(...reviews);
    }
  }

  return {
    date,
    mall,
    ranking,
    owned: buildOwnedSummary(ranking),
    insight: includeReviews ? analyzeReviews(allReviews) : null,
  };
}

export async function compareAllFromSnapshot({ date = today() } = {}) {
  const locations = await getLocationSummaries(date);
  return { date, locations };
}
