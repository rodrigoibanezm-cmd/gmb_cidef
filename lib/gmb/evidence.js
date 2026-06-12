import { dbQuery } from "./postgres.js";

function addNumericFilter(clauses, params, sql, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return;
  params.push(number);
  clauses.push(sql.replace("$n", `$${params.length}`));
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
  const clauses = [
    "tenant_id = $1",
    "place_id = $2",
  ];

  if (reviewHash) {
    params.push(reviewHash);
    clauses.push(`review_hash = $${params.length}`);
  }

  addNumericFilter(clauses, params, "rating >= $n", ratingMin);
  addNumericFilter(clauses, params, "rating <= $n", ratingMax);

  params.push(limit);

  const rows = await dbQuery(
    `select
       place_id,
       review_hash,
       rating,
       coalesce(text, original_text, '') as text,
       author,
       review_date
     from place_reviews
     where ${clauses.join(" and ")}
     order by rating asc nulls last, review_date desc nulls last, updated_at desc
     limit $${params.length}`,
    params
  );

  return rows.map((review) => ({
    place_id: review.place_id || placeId,
    review_hash: review.review_hash || null,
    rating: review.rating ?? null,
    text: review.text || "",
    author: review.author || null,
    review_date: review.review_date || null,
  }));
}
