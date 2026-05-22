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

function compactPlace(row) {
  if (!row) return null;

  return {
    brand: row.brand || null,
    name: row.name || null,
    place_id: row.place_id || null,
    location: row.location || row.normalized_location || null,
    market_group: row.market_group || null,
    region: row.region || null,
    store_role: row.store_role || null,
    ownership_group: row.ownership_group || null,
    rating: row.rating ?? null,
    reviews: row.reviews_count ?? row.reviews ?? null,
    confidence: row.confidence || null,
  };
}

function compactAggregateRow(row) {
  const dimensionKey = row.brand !== undefined
    ? "brand"
    : row.region !== undefined
      ? "region"
      : row.market_group !== undefined
        ? "market_group"
        : row.store_role !== undefined
          ? "store_role"
          : row.operator !== undefined
            ? "operator"
            : null;

  if (!dimensionKey) return null;

  return {
    [dimensionKey]: row[dimensionKey] || null,
    count: row.count ?? null,
    avg_value: row.avg_value ?? null,
    best: compactPlace(row.best),
    worst: compactPlace(row.worst),
  };
}

function compactLocationRow(row) {
  return {
    location: row.location || null,
    date_from: row.date_from || null,
    date_to: row.date_to || null,
    rating: row.owned?.rating ?? row.rating ?? null,
    rating_from: row.rating_from ?? null,
    rating_to: row.rating_to ?? null,
    delta_rating: row.delta_rating ?? null,
    reviews: row.owned?.reviews ?? row.reviews_count ?? row.reviews ?? null,
    reviews_from: row.reviews_from ?? null,
    reviews_to: row.reviews_to ?? null,
    delta_reviews_count: row.delta_reviews_count ?? null,
    confidence: row.owned?.confidence ?? row.confidence ?? null,
    gap_vs_top: row.owned?.gap_vs_top ?? row.gap_vs_top ?? null,
    gap_from: row.gap_from ?? null,
    gap_to: row.gap_to ?? null,
    delta_gap_vs_top: row.delta_gap_vs_top ?? null,
    position: row.owned?.position ?? row.position ?? null,
    position_from: row.position_from ?? null,
    position_to: row.position_to ?? null,
    delta_position: row.delta_position ?? null,
    top_brand: row.top?.brand || null,
    top_name: row.top?.name || null,
    top_rating: row.top?.rating ?? null,
    top_reviews: row.top?.reviews_count ?? null,
    stores_count: row.stores_count ?? null,
    owned_count: row.owned_count ?? null,
    competitor_count: row.competitor_count ?? null,
    evidence: compactEvidence(row.evidence || []),
  };
}

function compactRow(row) {
  return compactAggregateRow(row) || compactLocationRow(row);
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
