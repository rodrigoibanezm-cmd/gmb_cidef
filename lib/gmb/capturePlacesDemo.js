import { gmbCaptureKeys } from "./keys.js";

const FIELD_MASK = [
  "id",
  "displayName",
  "rating",
  "userRatingCount",
  "primaryType",
].join(",");

function getCapturedAt() {
  return new Date().toISOString();
}

function getCapturedDate(capturedAt) {
  return capturedAt.slice(0, 10);
}

async function redisCommand(command) {
  const response = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Upstash error: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}

function parseHashKeys(result) {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") return Object.keys(result);
  return [];
}

async function scanKeys(pattern) {
  let cursor = "0";
  const keys = [];

  do {
    const result = await redisCommand(["SCAN", cursor, "MATCH", pattern, "COUNT", "500"]);
    cursor = String(result?.[0] || "0");
    keys.push(...(result?.[1] || []));
  } while (cursor !== "0");

  return keys;
}

function snapshotPlaceId(date, key) {
  return key.replace(`gmb:snapshot:${date}:`, "");
}

async function getPlaceIdsFromHash() {
  const result = await redisCommand(["HKEYS", gmbCaptureKeys.classifiedHash]);
  return parseHashKeys(result);
}

async function getMissingPlaceIds(date, placeIds) {
  const snapshotKeys = await scanKeys(`gmb:snapshot:${date}:*`);
  const existingPlaceIds = new Set(snapshotKeys.map((key) => snapshotPlaceId(date, key)));
  return placeIds.filter((placeId) => !existingPlaceIds.has(placeId));
}

async function fetchPlace(placeId) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`Google Places error: ${response.status}`);
    error.status = response.status;
    error.details = details.slice(0, 300);
    throw error;
  }

  return response.json();
}

function buildSnapshot({ capturedAt, capturedDate, placeId, data }) {
  return {
    captured_at: capturedAt,
    captured_date: capturedDate,
    place_id: placeId,
    name: data.displayName?.text || null,
    rating: data.rating ?? null,
    review_count: data.userRatingCount ?? 0,
    primary_type: data.primaryType || null,
    source: "google_places_demo_no_reviews",
  };
}

export async function capturePlacesDemo({ limit = 25, offset = 0 } = {}) {
  const capturedAt = getCapturedAt();
  const capturedDate = getCapturedDate(capturedAt);
  const placeIds = await getPlaceIdsFromHash();
  const missingPlaceIds = await getMissingPlaceIds(capturedDate, placeIds);
  const batch = missingPlaceIds.slice(offset, offset + limit);

  let ok = 0;
  let failed = 0;
  const errors = [];

  for (const placeId of batch) {
    try {
      const data = await fetchPlace(placeId);
      const snapshot = buildSnapshot({ capturedAt, capturedDate, placeId, data });
      const key = gmbCaptureKeys.snapshot(capturedDate, placeId);

      await redisCommand(["SET", key, JSON.stringify(snapshot)]);
      ok += 1;
    } catch (error) {
      failed += 1;
      errors.push({
        place_id: placeId,
        message: error.message,
        status: error.status || null,
        details: error.details || null,
      });
      console.error(`Failed capturing place ${placeId}`, error);
    }
  }

  return {
    ok: true,
    captured_date: capturedDate,
    total: placeIds.length,
    existing: placeIds.length - missingPlaceIds.length,
    missing: missingPlaceIds.length,
    offset,
    limit,
    processed: batch.length,
    saved: ok,
    failed,
    errors,
    next_offset: offset + batch.length,
    done: offset + batch.length >= missingPlaceIds.length,
  };
}
