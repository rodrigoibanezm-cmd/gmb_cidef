import { redisCommand } from "./redis.js";

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function getReviewEvidence({ date, placeId, limit = 3 }) {
  if (!date || !placeId) return [];

  const rawKeys = await redisCommand(["GET", `gmb:index:${date}:place:${placeId}:review_keys`]);
  const keys = safeJson(rawKeys) || [];
  const evidence = [];

  for (const key of keys.slice(0, limit)) {
    const review = safeJson(await redisCommand(["GET", key]));
    if (!review) continue;

    evidence.push({
      place_id: review.place_id || placeId,
      review_hash: review.review_hash || null,
      rating: review.rating ?? null,
      text: review.text || review.original_text || "",
      author: review.author || null,
      review_date: review.review_date || null,
    });
  }

  return evidence;
}
