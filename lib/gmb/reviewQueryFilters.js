function addFilter(clauses, params, sql, value) {
  params.push(value);
  clauses.push(sql.replace("$n", `$${params.length}`));
}

function addNumericFilter(clauses, params, sql, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return;
  addFilter(clauses, params, sql, number);
}

function addDateFilter(clauses, params, sql, value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return;
  addFilter(clauses, params, sql, value.trim());
}

function addTextSearchFilter(clauses, params, fields, value) {
  params.push(`%${value}%`);
  const placeholder = `$${params.length}`;
  clauses.push(`(${fields.map((field) => `${field} ILIKE ${placeholder}`).join(" OR ")})`);
}

function normalizeText(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function normalizeBoolean(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

export function normalizeReviewFilters(filters = {}) {
  return {
    ...filters,
    place_id: normalizeText(filters.place_id),
    place_name: normalizeText(filters.place_name),
    mall_name: normalizeText(filters.mall_name),
    review_hash: normalizeText(filters.review_hash),
    location: normalizeText(filters.location),
    market_group: normalizeText(filters.market_group),
    region: normalizeText(filters.region),
    ownership_group: normalizeText(filters.ownership_group),
    store_role: normalizeText(filters.store_role),
    brand: normalizeText(filters.brand),
    sentiment: normalizeText(filters.sentiment),
    topic: normalizeText(filters.topic),
    severity: normalizeText(filters.severity),
    risk_type: normalizeText(filters.risk_type),
    date_from: normalizeText(filters.date_from),
    date_to: normalizeText(filters.date_to),
    valid_only: normalizeBoolean(filters.valid_only),
  };
}

export function buildBaseReviewClauses(query = {}) {
  const filters = query.filters || {};
  const clauses = ["r.tenant_id = $1"];
  const params = [query.tenant_id];

  if (filters.place_id) addFilter(clauses, params, "r.place_id = $n", filters.place_id);
  if (filters.review_hash) addFilter(clauses, params, "r.review_hash = $n", filters.review_hash);
  if (filters.place_name) addTextSearchFilter(clauses, params, ["p.name"], filters.place_name);
  if (filters.mall_name) addTextSearchFilter(clauses, params, ["p.name", "p.normalized_location", "p.market_group"], filters.mall_name);
  if (filters.location) addFilter(clauses, params, "p.normalized_location = $n", filters.location);
  if (filters.market_group) addFilter(clauses, params, "p.market_group = $n", filters.market_group);
  if (filters.region) addFilter(clauses, params, "p.region = $n", filters.region);
  if (filters.ownership_group && filters.ownership_group !== "all") addFilter(clauses, params, "p.ownership_group = $n", filters.ownership_group);
  if (filters.store_role) addFilter(clauses, params, "p.store_role = $n", filters.store_role);
  if (filters.brand) addFilter(clauses, params, "p.brand = $n", filters.brand);
  if (filters.valid_only === true) clauses.push("coalesce(p.status, 'keep') = 'keep'");
  if (filters.sentiment) addFilter(clauses, params, "c.sentiment = $n", filters.sentiment);
  if (filters.topic) addFilter(clauses, params, "c.topic = $n", filters.topic);
  if (filters.severity) addFilter(clauses, params, "c.severity = $n", filters.severity);
  if (filters.risk_type) addFilter(clauses, params, "c.risk_type = $n", filters.risk_type);

  addNumericFilter(clauses, params, "r.rating >= $n", filters.rating_min);
  addNumericFilter(clauses, params, "r.rating <= $n", filters.rating_max);
  addDateFilter(clauses, params, "r.review_date::date >= $n::date", filters.date_from);
  addDateFilter(clauses, params, "r.review_date::date <= $n::date", filters.date_to);

  return { clauses, params };
}
