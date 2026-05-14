import { gmbCaptureKeys } from "./keys.js";
import { redisCommand } from "./redis.js";
import { getPlaceIdsFromClassifiedHash } from "./placesSource.js";
import { buildReviewHash, normalizeReview } from "./reviews.js";

const FIELD_MASK = [
  "id",
  "displayName",
  "rating",
  "userRatingCount",
  "primaryType",
  "reviews",
].join(",");

function getCapturedAt() {
  return new Date().toISOString();
}

function getCapturedDate(capturedAt) {
  return capturedAt.slice(0, 10);
}

async function fetchPlaceWithReviews(placeId) {
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

function buildSnapshot({ capturedAt, capturedDate, placeId, data, reviewHashes }) {
  return {
    captured_at: capturedAt,
    captured_date: capturedDate,
    place_id: placeId,
    name: data.displayName?.text || null,
    rating: data.rating ?? null,
    review_count: data.userRatingCount ?? 0,
    primary_type: data.primaryType || null,
    visible_reviews_count: reviewHashes.length,
    reviews: reviewHashes,
    source: "google_places_reviews_once",
  };
}

async function saveReviews({ capturedAt, capturedDate, placeId, reviews }) {
  const reviewHashes = [];

  for (const review of reviews) {
    const reviewHash = buildReviewHash(placeId, review);
    const normalized = normalizeReview({ capturedAt, capturedDate, placeId, reviewHash, review });
    const reviewKey = gmbCaptureKeys.review(capturedDate, placeId, reviewHash);

    await redisCommand(["SET", reviewKey, JSON.stringify(normalized)]);
    reviewHashes.push(reviewHash);
  }

  return reviewHashes;
}

export async function capturePlacesReviews({ limit = 10, offset = 0 } = {}) {
  const capturedAt = getCapturedAt();
  const capturedDate = getCapturedDate(capturedAt);
  const placeIds = await getPlaceIdsFromClassifiedHash();
  const batch = placeIds.slice(offset, offset + limit);

  let saved = 0;
  let failed = 0;
  let reviewsSaved = 0;
  const errors = [];

  for (const placeId of batch) {
    try {
      const data = await fetchPlaceWithReviews(placeId);
      const reviews = data.reviews || [];
      const reviewHashes = await saveReviews({ capturedAt, capturedDate, placeId, reviews });
      const snapshot = buildSnapshot({ capturedAt, capturedDate, placeId, data, reviewHashes });

      await redisCommand(["SET", gmbCaptureKeys.snapshot(capturedDate, placeId), JSON.stringify(snapshot)]);
      saved += 1;
      reviewsSaved += reviewHashes.length;
    } catch (error) {
      failed += 1;
      errors.push({ place_id: placeId, message: error.message, status: error.status || null, details: error.details || null });
      console.error(`Failed capturing reviews for ${placeId}`, error);
    }
  }

  return {
    ok: true,
    captured_date: capturedDate,
    total: placeIds.length,
    offset,
    limit,
    processed: batch.length,
    saved,
    reviews_saved: reviewsSaved,
    failed,
    errors,
    next_offset: offset + batch.length,
    done: offset + batch.length >= placeIds.length,
  };
}
