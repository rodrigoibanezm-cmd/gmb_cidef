import { getLocationReviewEvidence, getReviewEvidence } from "./evidence.js";

function hasRatingEvidenceFilter(filters = {}) {
  return filters.rating_min !== null || filters.rating_max !== null;
}

function resolvePlaceId(row = {}) {
  return row?.owned?.place_id || row?.place_id || row?.top?.place_id || row?.worst?.place_id || row?.best?.place_id;
}

async function getEvidenceForRow(row, query) {
  const location = row?.location;
  const shouldUseLocation = location && hasRatingEvidenceFilter(query.filters);

  if (shouldUseLocation) {
    return getLocationReviewEvidence({
      location,
      limit: query.output.evidence_per_row,
      tenantId: query.tenant_id,
      ownershipGroup: "own",
      ratingMin: query.filters.rating_min,
      ratingMax: query.filters.rating_max,
    });
  }

  const placeId = resolvePlaceId(row);
  if (!placeId) return null;

  return getReviewEvidence({
    placeId,
    limit: query.output.evidence_per_row,
    tenantId: query.tenant_id,
    reviewHash: query.filters.review_hash,
    ratingMin: query.filters.rating_min,
    ratingMax: query.filters.rating_max,
  });
}

export async function attachEvidence(rows, query) {
  if (!query.output.include_evidence) return rows;

  const enriched = [];

  for (const row of rows) {
    const evidence = await getEvidenceForRow(row, query);

    enriched.push({
      ...row,
      evidence: evidence || row.evidence || [],
    });
  }

  return enriched;
}
