import crypto from "crypto";

export function buildReviewHash(placeId, review) {
  const raw = [
    placeId,
    review.authorAttribution?.displayName || "",
    review.rating || "",
    review.originalText?.text || review.text?.text || "",
    review.publishTime || "",
  ].join("|");

  return crypto.createHash("sha1").update(raw).digest("hex");
}

export function normalizeReview({ capturedAt, capturedDate, placeId, reviewHash, review }) {
  return {
    captured_at: capturedAt,
    captured_date: capturedDate,
    place_id: placeId,
    review_hash: reviewHash,
    author: review.authorAttribution?.displayName || null,
    review_date: review.publishTime || null,
    rating: review.rating || null,
    text: review.text?.text || null,
    language: review.text?.languageCode || null,
    source: "google_places_reviews_once",
  };
}
