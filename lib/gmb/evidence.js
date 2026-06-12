import { dbQuery } from "./postgres.js";

function addNumericFilter(clauses, params, sql, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return;
  params.push(number);
  clauses.push(sql.replace("$n", `$${params.length}`));
}

function mapReview(review, fallbackPlaceId = null) {
  return {
    place_id: review.place_id || fallbackPlaceId,
    review_hash: review.review_hash || null,
    rating: review.rating ?? null,
    text: review.text || "",
    author: review.author || null,
    review_date: review.review_date || null,
  };
}

export async function getReviewEvidence({
  placeId,
  limit = 3,
  tenantId,
  reviewHash = null,
  ratingMin = null,
  ratingMax = null,
}) {
  if (!tenantId) throw new Error("tenant_id_required");
  if (!placeId) return [];

  const params = [tenantId, placeId];
  const clauses = ["tenant_id = $1", "place_id = $2"];

  if (reviewHash) {
    params.push(reviewHash);
    clauses.push(`review_hash = $${params.length}`);
  }

  addNumericFilter(clauses, params, "rating >= $n", ratingMin);
  addNumericFilter(clauses, params, "rating <= $n", ratingMax);

  params.push(limit);

  const rows = await dbQuery(
    `select place_id, review_hash, rating, coalesce(text, original_text, '') as text, author, review_date
     from place_reviews
     where ${clauses.join(" and ")}
     order by rating asc nulls last, review_date desc nulls last, updated_at desc
     limit $${params.length}`,
    params
  );

  return rows.map((review) => mapReview(review, placeId));
}

export async function getLocationReviewEvidence({
  location,
  limit = 3,
  tenantId,
  ownershipGroup = "own",
  ratingMin = null,
  ratingMax = null,
}) {
  if (!tenantId) throw new Error("tenant_id_required");
  if (!location) return [];

  const params = [tenantId, location, ownershipGroup];
  const clauses = [
    "r.tenant_id = $1",
    "p.normalized_location = $2",
    "p.ownership_group = $3",
    "coalesce(p.status, 'keep') = 'keep'",
  ];

  addNumericFilter(clauses, params, "r.rating >= $n", ratingMin);
  addNumericFilter(clauses, params, "r.rating <= $n", ratingMax);

  params.push(limit);

  const rows = await dbQuery(
    `select r.place_id, r.review_hash, r.rating, coalesce(r.text, r.original_text, '') as text, r.author, r.review_date
     from place_reviews r
     join places p on p.tenant_id = r.tenant_id and p.place_id = r.place_id
     where ${clauses.join(" and ")}
     order by r.rating asc nulls last, r.review_date desc nulls last, r.updated_at desc
     limit $${params.length}`,
    params
  );

  return rows.map((review) => mapReview(review));
}
