import { redisCommand } from "../../../lib/gmb/redis.js";
import { gmbCaptureKeys } from "../../../lib/gmb/keys.js";

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

function snapshotPlaceId(date, key, tenantId) {
  return key.replace(gmbCaptureKeys.snapshot(date, "", tenantId), "");
}

function reviewSeenParts(date, key, tenantId) {
  const raw = key.replace(gmbCaptureKeys.reviewSeen(date, "", "", tenantId), "");
  const [placeId, reviewHash] = raw.split(":");
  return { placeId, reviewHash };
}

function reviewKeyFromSeen(date, key, tenantId) {
  const { placeId, reviewHash } = reviewSeenParts(date, key, tenantId);
  return gmbCaptureKeys.review(placeId, reviewHash, tenantId);
}

function unique(values) {
  return [...new Set(values)];
}

export default async function handler(req, res) {
  try {
    const date = req.query.date || today();
    const tenantId = req.query.tenant || req.query.tenant_id || "cidef";

    const snapshotKeys = await scanKeys(gmbCaptureKeys.snapshot(date, "*", tenantId));
    const reviewSeenKeys = await scanKeys(gmbCaptureKeys.reviewSeen(date, "*", "*", tenantId));
    const reviewKeys = reviewSeenKeys.map((key) => reviewKeyFromSeen(date, key, tenantId));

    const indexedPlaceIds = safeJson(await redisCommand(["GET", gmbCaptureKeys.index(date, "place_ids", tenantId)])) || [];
    const indexedReviewKeys = safeJson(await redisCommand(["GET", gmbCaptureKeys.index(date, "review_keys", tenantId)])) || [];
    const locations = safeJson(await redisCommand(["GET", gmbCaptureKeys.index(date, "locations", tenantId)])) || [];

    const snapshotPlaceIds = snapshotKeys.map((key) => snapshotPlaceId(date, key, tenantId));
    const reviewedPlaceIds = unique(reviewSeenKeys.map((key) => reviewSeenParts(date, key, tenantId).placeId));

    const indexedSet = new Set(indexedPlaceIds);
    const indexedReviewSet = new Set(indexedReviewKeys);

    const missing_in_index = snapshotPlaceIds.filter((placeId) => !indexedSet.has(placeId));
    const missing_review_keys_in_global_index = reviewKeys.filter((key) => !indexedReviewSet.has(key));

    const missing_place_review_index = [];

    for (const placeId of reviewedPlaceIds) {
      const perPlaceKeys = safeJson(await redisCommand(["GET", gmbCaptureKeys.placeReviewIndex(date, placeId, tenantId)])) || [];

      if (perPlaceKeys.length === 0) {
        missing_place_review_index.push(placeId);
      }
    }

    const snapshotsUpdated = missing_in_index.length === 0 && snapshotPlaceIds.length === indexedPlaceIds.length;

    const reviewsUpdated =
      missing_review_keys_in_global_index.length === 0 &&
      reviewKeys.length === indexedReviewKeys.length &&
      missing_place_review_index.length === 0;

    return res.status(200).json({
      ok: true,
      tenant_id: tenantId,
      date,
      updated: snapshotsUpdated && reviewsUpdated,
      snapshots_updated: snapshotsUpdated,
      reviews_updated: reviewsUpdated,
      snapshots: snapshotPlaceIds.length,
      indexed_places: indexedPlaceIds.length,
      reviews: reviewKeys.length,
      indexed_reviews: indexedReviewKeys.length,
      review_seen: reviewSeenKeys.length,
      reviewed_places: reviewedPlaceIds.length,
      locations: locations.length,
      missing_in_index_count: missing_in_index.length,
      missing_in_index: missing_in_index.slice(0, 20),
      missing_review_keys_in_global_index_count: missing_review_keys_in_global_index.length,
      missing_review_keys_in_global_index: missing_review_keys_in_global_index.slice(0, 20),
      missing_place_review_index_count: missing_place_review_index.length,
      missing_place_review_index: missing_place_review_index.slice(0, 20),
    });
  } catch (error) {
    console.error("index status failed", error);
    return res.status(500).json({ ok: false, error: "index_status_failed" });
  }
}
