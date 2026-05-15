export const CLASSIFIED_HASH_KEY = "gmb:classified:v1";

export const gmbCaptureKeys = {
  classifiedHash: CLASSIFIED_HASH_KEY,
  run: (date) => `gmb:capture:run:${date}`,
  reviewsRun: (date) => `gmb:capture:reviews:run:${date}`,
  manifest: (date) => `gmb:capture:manifest:${date}`,
  snapshot: (date, placeId) => `gmb:snapshot:${date}:${placeId}`,
  review: (placeId, reviewHash) => `gmb:review:${placeId}:${reviewHash}`,
  reviewSeen: (date, placeId, reviewHash) => `gmb:review_seen:${date}:${placeId}:${reviewHash}`,
  legacyReview: (date, placeId, reviewHash) => `gmb:review:${date}:${placeId}:${reviewHash}`,
  indexDatePlaces: (date) => `gmb:index:date:${date}:places`,
  indexPlaceDates: (placeId) => `gmb:index:place:${placeId}:dates`,
};

export const gmbCapturePaths = {
  raw: (date, placeId) => `gmb/raw/${date}/${placeId}.json`,
};
