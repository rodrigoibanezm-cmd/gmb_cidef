const ALLOWED = {
  scope: ["intra", "extra", "temporal"],
  dimension: ["location", "brand", "operator", "store_role"],
  metric: [
    "rating",
    "reviews_count",
    "gap_vs_top",
    "position",
    "delta_rating",
    "delta_reviews_count",
    "delta_gap_vs_top",
    "delta_position",
  ],
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
    own_values: ["own"],
    store_role: "dealer",
    valid_only: true,
    location: null,
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

function normalizeList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((item) => typeof item === "string" && item.length > 0);
  return cleaned.length ? cleaned.slice(0, 20) : fallback;
}

function normalizeLocation(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, "_");
  return cleaned || null;
}

function assertAllowed(field, value) {
  if (!isAllowed(field, value)) {
    throw new Error(`invalid_${field}`);
  }
}

function yesterday(date) {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function normalizeCompareQuery(input = {}) {
  const dateTo = input.date_to || input.date || DEFAULTS.date();

  const query = {
    date: dateTo,
    date_from: input.date_from || yesterday(dateTo),
    date_to: dateTo,
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

  if (query.scope === "temporal" && !String(query.metric).startsWith("delta_")) {
    query.metric = `delta_${query.metric}`;
  }

  assertAllowed("scope", query.scope);
  assertAllowed("dimension", query.dimension);
  assertAllowed("metric", query.metric);
  assertAllowed("ownership_group", query.filters.ownership_group);
  assertAllowed("store_role", query.filters.store_role);
  assertAllowed("sort", query.output.sort);

  query.filters.own_values = normalizeList(query.filters.own_values, DEFAULTS.filters.own_values);
  query.filters.valid_only = query.filters.valid_only !== false;
  query.filters.location = normalizeLocation(query.filters.location);
  query.output.max_rows = normalizeNumber(query.output.max_rows, 50, 200);
  query.output.evidence_per_row = normalizeNumber(query.output.evidence_per_row, 3, 10);
  query.output.include_evidence = query.output.include_evidence === true;

  return query;
}
