import { redisCommand } from "./redis.js";
import { buildLocationIndexes } from "./locationIndexes.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function scanKeys(pattern) {
  let cursor = "0";
  const keys = [];

  do {
    const result = await redisCommand(["SCAN", cursor, "MATCH", pattern, "COUNT", "200"]);
    cursor = String(result?.[0] || "0");
    keys.push(...(result?.[1] || []));
  } while (cursor !== "0");

  return keys;
}

function snapshotPlaceId(date, key) {
  return key.replace(`gmb:snapshot:${date}:`, "");
}

function reviewPlaceId(date, key) {
  return key.replace(`gmb:review:${date}:`, "").split(":")[0];
}

function groupReviewsByPlace(date, reviewKeys) {
  const grouped = {};

  for (const key of reviewKeys) {
    const placeId = reviewPlaceId(date, key);
    if (!grouped[placeId]) grouped[placeId] = [];
    grouped[placeId].push(key);
  }

  return grouped;
}

export async function buildGmbIndexes({ date = today() } = {}) {
  const snapshotKeys = await scanKeys(`gmb:snapshot:${date}:*`);
  const reviewKeys = await scanKeys(`gmb:review:${date}:*`);
  const placeIds = snapshotKeys.map((key) => snapshotPlaceId(date, key));
  const reviewsByPlace = groupReviewsByPlace(date, reviewKeys);
  const locationIndexes = await buildLocationIndexes(date);

  await redisCommand(["SET", `gmb:index:${date}:snapshot_keys`, JSON.stringify(snapshotKeys)]);
  await redisCommand(["SET", `gmb:index:${date}:place_ids`, JSON.stringify(placeIds)]);
  await redisCommand(["SET", `gmb:index:${date}:review_keys`, JSON.stringify(reviewKeys)]);

  for (const [placeId, keys] of Object.entries(reviewsByPlace)) {
    await redisCommand(["SET", `gmb:index:${date}:place:${placeId}:review_keys`, JSON.stringify(keys)]);
  }

  return {
    ok: true,
    date,
    snapshots: snapshotKeys.length,
    places: placeIds.length,
    reviews: reviewKeys.length,
    places_with_reviews: Object.keys(reviewsByPlace).length,
    locations: locationIndexes.locations,
    ranked_locations: locationIndexes.ranked_locations,
    role_locations: locationIndexes.role_locations,
  };
}
