import { dbQuery } from "./postgres.js";

export async function getReviewEvidence({ placeId, limit = 3, tenantId }) {
  if (!tenantId) throw new Error("tenant_id_required");
  if (!placeId) return [];

  const rows = await dbQuery(
    `select
       place_id,
       review_hash,
       rating,
       coalesce(text, original_text, '') as text,
       author,
       review_date
     from place_reviews
     where tenant_id = $1
       and place_id = $2
     order by review_date desc nulls last, updated_at desc
     limit $3`,
    [tenantId, placeId, limit]
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
