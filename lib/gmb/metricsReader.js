import { dbQuery } from "./postgres.js";

function resolveTenantId(query = {}) {
  return query.tenant_id || query.tenant || query.filters?.tenant_id || "cidef";
}

function addFilter(clauses, params, sql, value) {
  params.push(value);
  clauses.push(sql.replace("$n", `$${params.length}`));
}

export async function readDailyMetricsFromPostgres(query = {}) {
  const tenantId = resolveTenantId(query);
  const filters = query.filters || {};
  const date = query.date || query.date_to;

  const clauses = [
    "p.tenant_id = $1",
    "m.captured_date = $2",
    "coalesce(p.status, 'keep') = 'keep'",
  ];

  const params = [tenantId, date];

  if (filters.location) {
    addFilter(clauses, params, "p.normalized_location = $n", filters.location);
  }

  if (filters.industry) {
    addFilter(clauses, params, "p.industry = $n", filters.industry);
  }

  if (filters.store_role && filters.store_role !== "all") {
    addFilter(clauses, params, "p.store_role = $n", filters.store_role);
  }

  // gap_vs_top needs the full competitive universe. The target ownership is selected after ranking.
  if (query.metric !== "gap_vs_top" && filters.ownership_group && filters.ownership_group !== "all") {
    addFilter(clauses, params, "p.ownership_group = $n", filters.ownership_group);
  }

  if (filters.brand) {
    addFilter(clauses, params, "p.brand = $n", filters.brand);
  }

  return dbQuery(
    `
    select
      p.tenant_id,
      p.industry,
      p.place_id,
      p.name,
      p.brand,
      p.normalized_location as location,
      p.normalized_location,
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
    order by p.normalized_location nulls last, p.brand nulls last, m.rating desc nulls last, m.review_count desc nulls last
    `,
    params
  );
}
