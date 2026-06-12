const ALLOWED = {
  scope: ["intra", "extra", "temporal"],
  dimension: ["location", "brand", "operator", "store_role", "market_group", "region"],
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
    store_role: "all",
    valid_only: true,
    location: null,
    market_group: null,
    region: null,
    place_id: null,
    place_name: null,
    mall_name: null,
    review_hash: null,
    rating_min: null,
    rating_max: null,
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

function normalizeOptionalNumber(value, max) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(parsed, max);
}

function normalizeList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((item) => typeof item === "string" && item.length > 0);
  return cleaned.length ? cleaned.slice(0, 20) : fallback;
}

function normalizeSlug(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, "_");
  return cleaned || null;
}

function normalizeText(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function normalizeStoreRole(value) {
  return normalizeSlug(value) || DEFAULTS.filters.store_role;
}

function normalizeTenantId(value) {
  const tenantId = String(value || "").trim().toLowerCase();

  if (tenantId === "autos") {
    return "cidef";
  }

  return tenantId;
}

function assertAllowed(field, value) {
  if (!isAllowed(field, value)) {
    throw new Error(`invalid_${field}`);
  }
}

function requireTenantId(input = {}) {
  const tenantId = input.tenant_id || input.tenant || input.filters?.tenant_id;
  if (typeof tenantId !== "string" || !tenantId.trim()) {
    throw new Error("tenant_id_required");
  }
  return normalizeTenantId(tenantId);
}

function yesterday(date) {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function normalizeCompareQuery(input = {}) {
  const hasExplicitDateFilter = Boolean(input.date || input.date_from || input.date_to);
  const dateTo = input.date_to || input.date || DEFAULTS.date();

  const query = {
    tenant_id: requireTenantId(input),
    date: dateTo,
    date_from: input.date_from || yesterday(dateTo),
    date_to: dateTo,
    has_explicit_date_filter: hasExplicitDateFilter,
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

  query.filters.store_role = normalizeStoreRole(query.filters.store_role);

  assertAllowed("scope", query.scope);
  assertAllowed("dimension", query.dimension);
  assertAllowed("metric", query.metric);
  assertAllowed("ownership_group", query.filters.ownership_group);
  assertAllowed("sort", query.output.sort);

  query.filters.own_values = normalizeList(query.filters.own_values, DEFAULTS.filters.own_values);
  query.filters.valid_only = query.filters.valid_only !== false;
  query.filters.location = normalizeSlug(query.filters.location);
  query.filters.market_group = normalizeSlug(query.filters.market_group);
  query.filters.region = normalizeSlug(query.filters.region);
  query.filters.place_id = normalizeText(query.filters.place_id);
  query.filters.place_name = normalizeText(query.filters.place_name);
  query.filters.mall_name = normalizeText(query.filters.mall_name);
  query.filters.review_hash = normalizeText(query.filters.review_hash);
  query.filters.rating_min = normalizeOptionalNumber(query.filters.rating_min, 5);
  query.filters.rating_max = normalizeOptionalNumber(query.filters.rating_max, 5);
  query.output.max_rows = normalizeNumber(query.output.max_rows, 50, 200);
  query.output.evidence_per_row = normalizeNumber(query.output.evidence_per_row, 3, 10);
  query.output.include_evidence = query.output.include_evidence === true;

  return query;
}
