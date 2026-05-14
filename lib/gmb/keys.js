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
