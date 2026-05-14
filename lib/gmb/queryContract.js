const ALLOWED = {
  scope: ["intra", "extra"],
  dimension: ["location", "brand", "operator", "store_role"],
  metric: ["rating", "reviews_count", "gap_vs_top", "position"],
  ownership_group: ["own", "competitor", "all"],
  store_role: ["dealer", "service", "parts", "all"],
  sort: ["asc", "desc"],
};

const DEFAULTS = {
  date: () => new Date().toISOString().slice(0, 10),
  scope: "extra",
  dimension: "location",
  metric: "gap_vs_top",
  filters: {
    ownership_group: "all",
    store_role: "dealer",
    valid_only: true,
  },
  output: {
    max_rows: 50,
    include_evidence: false,
    evidence_per_row: 3,
    sort: "desc",
  },
};

function isAllowed(field, value) {
  return ALLOWED[field].includes(value);
}

function normalizeNumber(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function assertAllowed(field, value) {
  if (!isAllowed(field, value)) {
    throw new Error(`invalid_${field}`);
  }
}

export function normalizeCompareQuery(input = {}) {
  const query = {
    date: input.date || DEFAULTS.date(),
    scope: input.scope || DEFAULTS.scope,
    dimension: input.dimension || DEFAULTS.dimension,
    metric: input.metric || DEFAULTS.metric,
    filters: {
      ...DEFAULTS.filters,
      ...(input.filters || {}),
    },
    output: {
      ...DEFAULTS.output,
      ...(input.output || {}),
    },
  };

  assertAllowed("scope", query.scope);
  assertAllowed("dimension", query.dimension);
  assertAllowed("metric", query.metric);
  assertAllowed("ownership_group", query.filters.ownership_group);
  assertAllowed("store_role", query.filters.store_role);
  assertAllowed("sort", query.output.sort);

  query.filters.valid_only = query.filters.valid_only !== false;
  query.output.max_rows = normalizeNumber(query.output.max_rows, 50, 200);
  query.output.evidence_per_row = normalizeNumber(query.output.evidence_per_row, 3, 10);
  query.output.include_evidence = query.output.include_evidence === true;

  return query;
}
