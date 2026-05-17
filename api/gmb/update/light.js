import { capturePlacesDemo } from "../../../lib/gmb/capturePlacesDemo.js";
import { buildGmbIndexes } from "../../../lib/gmb/indexBuilder.js";
import { redisCommand } from "../../../lib/gmb/redis.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

function snapshotPlaceId(date, key) {
  return key.replace(`gmb:snapshot:${date}:`, "");
}

async function getSnapshotPlaceIds(date) {
  const snapshotKeys = await scanKeys(`gmb:snapshot:${date}:*`);
  return snapshotKeys.map((key) => snapshotPlaceId(date, key));
}

async function getStatus(date) {
  const snapshotPlaceIds = await getSnapshotPlaceIds(date);
  const reviewSeenKeys = await scanKeys(`gmb:review_seen:${date}:*`);
  const indexedPlaceIds = safeJson(await redisCommand(["GET", `gmb:index:${date}:place_ids`])) || [];
  const indexedReviewKeys = safeJson(await redisCommand(["GET", `gmb:index:${date}:review_keys`])) || [];
  const locations = safeJson(await redisCommand(["GET", `gmb:index:${date}:locations`])) || [];

  const indexedSet = new Set(indexedPlaceIds);
  const missingInIndex = snapshotPlaceIds.filter((placeId) => !indexedSet.has(placeId));

  return {
    updated: missingInIndex.length === 0 && snapshotPlaceIds.length === indexedPlaceIds.length,
    snapshots_updated: missingInIndex.length === 0 && snapshotPlaceIds.length === indexedPlaceIds.length,
    reviews_updated: reviewSeenKeys.length === indexedReviewKeys.length,
    snapshots: snapshotPlaceIds.length,
    indexed_places: indexedPlaceIds.length,
    reviews: reviewSeenKeys.length,
    indexed_reviews: indexedReviewKeys.length,
    locations: locations.length,
    missing_in_index_count: missingInIndex.length,
    missing_in_index: missingInIndex.slice(0, 20),
  };
}

async function saveRunLog(date, log) {
  const key = `gmb:update:light:${date}:${log.run_id}`;
  await redisCommand(["SET", key, JSON.stringify(log)]);
  await redisCommand(["SET", `gmb:update:light:${date}:latest`, JSON.stringify(log)]);
  await redisCommand(["LPUSH", `gmb:update:light:${date}:runs`, key]);
  await redisCommand(["LTRIM", `gmb:update:light:${date}:runs`, "0", "19"]);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const startedAt = new Date().toISOString();
  const runId = startedAt.replace(/[:.]/g, "-");
  const date = today();
  const limit = parseNumber(req.query.limit, 25);
  const maxBatches = parseNumber(req.query.max_batches, 40);

  const batches = [];
  const errors = [];

  try {
    const beforePlaceIds = await getSnapshotPlaceIds(date);
    const beforePlaceSet = new Set(beforePlaceIds);
    const initialIndex = await buildGmbIndexes({ date });
    const initialStatus = await getStatus(date);

    let done = false;
    let batchCount = 0;
    let noProgressCount = 0;

    while (!done && batchCount < maxBatches && noProgressCount < 3) {
      const result = await capturePlacesDemo({ limit, offset: 0 });
      batches.push({
        existing: result.existing,
        missing: result.missing,
        processed: result.processed,
        saved: result.saved,
        failed: result.failed,
        done: result.done,
      });

      if (Array.isArray(result.errors)) errors.push(...result.errors);

      done = result.done || result.processed === 0;
      noProgressCount = result.saved === 0 ? noProgressCount + 1 : 0;
      batchCount += 1;
    }

    const finalIndex = await buildGmbIndexes({ date });
    const finalStatus = await getStatus(date);
    const afterPlaceIds = await getSnapshotPlaceIds(date);
    const newPlaceIds = afterPlaceIds.filter((placeId) => !beforePlaceSet.has(placeId));
    const endedAt = new Date().toISOString();

    const log = {
      ok: true,
      mode: "light",
      run_id: runId,
      date,
      started_at: startedAt,
      ended_at: endedAt,
      limit,
      max_batches: maxBatches,
      batches_run: batches.length,
      done: batches.at(-1)?.done || false,
      stopped_reason: done ? "done" : noProgressCount >= 3 ? "no_progress" : "max_batches_reached",
      totals: {
        before_snapshots: beforePlaceIds.length,
        after_snapshots: afterPlaceIds.length,
        new_snapshots: newPlaceIds.length,
        processed: batches.reduce((sum, item) => sum + item.processed, 0),
        saved: batches.reduce((sum, item) => sum + item.saved, 0),
        failed: batches.reduce((sum, item) => sum + item.failed, 0),
      },
      new_place_ids: newPlaceIds.slice(0, 200),
      failed_place_ids: [...new Set(errors.map((item) => item.place_id).filter(Boolean))],
      initial_index: initialIndex,
      initial_status: initialStatus,
      final_index: finalIndex,
      final_status: finalStatus,
      errors: errors.slice(0, 50),
      batches,
    };

    await saveRunLog(date, log);

    return res.status(200).json(log);
  } catch (error) {
    console.error("light update failed", error);
    const log = {
      ok: false,
      mode: "light",
      run_id: runId,
      date,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      error: "light_update_failed",
      message: error.message,
      batches,
      errors: errors.slice(0, 50),
    };
    await saveRunLog(date, log);
    return res.status(500).json(log);
  }
}
