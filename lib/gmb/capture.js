const DEFAULT_BATCH_SIZE = 25;

export const CLASSIFIED_HASH_KEY = "gmb:classified:v1";

export const gmbCaptureKeys = {
  classifiedHash: CLASSIFIED_HASH_KEY,
  run: (date) => `gmb:capture:run:${date}`,
  manifest: (date) => `gmb:capture:manifest:${date}`,
  snapshot: (date, placeId) => `gmb:snapshot:${date}:${placeId}`,
  indexDatePlaces: (date) => `gmb:index:date:${date}:places`,
  indexPlaceDates: (placeId) => `gmb:index:place:${placeId}:dates`,
};

export const gmbCapturePaths = {
  raw: (date, placeId) => `gmb/raw/${date}/${placeId}.json`,
};

export function getTodayDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function buildRun({ date, total, batchSize = DEFAULT_BATCH_SIZE }) {
  return {
    captured_date: date,
    total,
    offset: 0,
    batch_size: batchSize,
    ok: 0,
    failed: 0,
    status: total > 0 ? "running" : "done",
  };
}

export function buildManifest({ date, placeIds }) {
  return {
    captured_date: date,
    total: placeIds.length,
    place_ids: placeIds,
  };
}

export function getBatchFromManifest(manifest, run) {
  const offset = Number(run.offset || 0);
  const batchSize = Number(run.batch_size || DEFAULT_BATCH_SIZE);
  const placeIds = manifest.place_ids || [];

  return {
    offset,
    batch_size: batchSize,
    place_ids: placeIds.slice(offset, offset + batchSize),
    next_offset: Math.min(offset + batchSize, placeIds.length),
    done: offset >= placeIds.length,
  };
}
