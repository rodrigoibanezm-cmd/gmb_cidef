const ALLOWED_SHAPES = ["raw", "compact"];

function normalizeShape(value) {
  return ALLOWED_SHAPES.includes(value) ? value : "raw";
}

function compactEvidence(evidence = []) {
  return evidence.map((review) => ({
    rating: review.rating ?? null,
    text: review.text || "",
    author: review.author || null,
    review_date: review.review_date || null,
  }));
}

function compactRow(row) {
  return {
    location: row.location || null,
    rating: row.owned?.rating ?? row.rating ?? null,
    reviews: row.owned?.reviews ?? row.reviews_count ?? row.reviews ?? null,
    confidence: row.owned?.confidence ?? row.confidence ?? null,
    gap_vs_top: row.owned?.gap_vs_top ?? row.gap_vs_top ?? null,
    position: row.owned?.position ?? row.position ?? null,
    top_brand: row.top?.brand || null,
    top_name: row.top?.name || null,
    top_rating: row.top?.rating ?? null,
    top_reviews: row.top?.reviews_count ?? null,
    evidence: compactEvidence(row.evidence || []),
  };
}

export function shapeAgentResult(result, shape) {
  const normalizedShape = normalizeShape(shape);

  if (normalizedShape === "raw") {
    return {
      shape: "raw",
      result,
    };
  }

  return {
    shape: "compact",
    result: {
      ok: result.ok,
      query: {
        date: result.query?.date,
        date_from: result.query?.date_from,
        date_to: result.query?.date_to,
        scope: result.query?.scope,
        dimension: result.query?.dimension,
        metric: result.query?.metric,
        filters: result.query?.filters,
        output: result.query?.output,
      },
      rows: (result.rows || []).map(compactRow),
      row_count: result.row_count,
      source: result.source,
    },
  };
}
