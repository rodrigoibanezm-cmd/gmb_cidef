import { dbQuery } from "./postgres.js";

function resolveTenantId(query = {}) {
  const tenantId = query.tenant_id || query.tenant || query.filters?.tenant_id;

  if (typeof tenantId !== "string" || !tenantId.trim()) {
    throw new Error("tenant_id_required");
  }

  return tenantId.trim();
}

function addFilter(clauses, params, sql, value) {
  params.push(value);
  clauses.push(sql.replace("$n", `$${params.length}`));
}

function addTextSearchFilter(clauses, params, fields, value) {
  params.push(`%${value}%`);
  const placeholder = `$${params.length}`;
  clauses.push(`(${fields.map((field) => `${field} ILIKE ${placeholder}`).join(" OR ")})`);
}

export async function readDailyMetricsFromPostgres(query = {}) {
  const tenantId = resolveTenantId(query);
  const filters = query.filters || {};
  const date = query.date || query.date_to;

  const clauses = [
    "p.tenant_id = $1",
    "coalesce(p.status, 'keep') = 'keep'",
  ];

  const params = [tenantId];

  if (query.has_explicit_date_filter) {
    addFilter(clauses, params, "m.captured_date = $n", date);
  }

  if (filters.place_id) {
    addFilter(clauses, params, "p.place_id = $n", filters.place_id);
  }

  if (filters.place_name) {
    addTextSearchFilter(clauses, params, ["p.name"], filters.place_name);
  }

  if (filters.mall_name) {
    addTextSearchFilter(clauses, params, ["p.name", "p.normalized_location", "p.market_group"], filters.mall_name);
  }

  if (filters.location) {
    addFilter(clauses, params, "p.normalized_location = $n", filters.location);
  }

  if (filters.market_group) {
    addFilter(clauses, params, "p.market_group = $n", filters.market_group);
  }

  if (filters.region) {
    addFilter(clauses, params, "p.region = $n", filters.region);
  }

  if (filters.industry) {
    addFilter(clauses, params, "p.industry = $n", filters.industry);
  }

  if (filters.store_role && filters.store_role !== "all") {
    if (query.metric === "gap_vs_top" && filters.store_role === "homecenter") {
      clauses.push("p.store_role in ('homecenter', 'competitor_store')");
    } else {
      addFilter(clauses, params, "p.store_role = $n", filters.store_role);
    }
  }

  if (query.metric !== "gap_vs_top" && filters.ownership_group && filters.ownership_group !== "all") {
    addFilter(clauses, params, "p.ownership_group = $n", filters.ownership_group);
  }

  if (filters.brand) {
    addFilter(clauses, params, "p.brand = $n", filters.brand);
  }

  const groupField = query.dimension === "market_group"
    ? "p.market_group"
    : query.dimension === "region"
      ? "p.region"
      : "p.normalized_location";

  return dbQuery(
    `
    select
      p.tenant_id,
      p.industry,
      p.place_id,
      p.name,
      p.brand,
      ${groupField} as location,
      p.normalized_location,
      p.market_group,
      p.region,
      p.operator,
      p.store_role,
      p.ownership_group,
      m.captured_date,
      m.rating,
      m.review_count as reviews_count,
      m.primary_type
    from places p
    join place_daily_metrics m
      on m.tenant_id = p.tenant_id
     and m.place_id = p.place_id
    where ${clauses.join("\n      and ")}
    order by location nulls last, p.brand nulls last, m.rating desc nulls last, m.review_count desc nulls last
    `,
    params
  );
}
