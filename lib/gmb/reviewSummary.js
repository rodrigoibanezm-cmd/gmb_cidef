import { dbQuery } from "./postgres.js";

function addFilter(clauses, params, sql, value) {
  params.push(value);
  clauses.push(sql.replace("$n", `$${params.length}`));
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

function resolveTenantId(input = {}) {
  const tenantId = input.tenant_id || input.tenant || input.filters?.tenant_id;
  if (typeof tenantId !== "string" || !tenantId.trim()) {
    throw new Error("tenant_id_required");
  }
  return tenantId.trim().toLowerCase();
}

function buildBaseReviewClauses(query = {}) {
  const tenantId = resolveTenantId(query);
  const filters = query.filters || {};
  const clauses = ["r.tenant_id = $1"];
  const params = [tenantId];

  if (filters.place_id) {
    addFilter(clauses, params, "r.place_id = $n", filters.place_id);
  }

  if (filters.review_hash) {
    addFilter(clauses, params, "r.review_hash = $n", filters.review_hash);
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

  if (filters.ownership_group && filters.ownership_group !== "all") {
    addFilter(clauses, params, "p.ownership_group = $n", filters.ownership_group);
  }

  if (filters.brand) {
    addFilter(clauses, params, "p.brand = $n", filters.brand);
  }

  if (filters.sentiment) {
    addFilter(clauses, params, "c.sentiment = $n", filters.sentiment);
  }

  if (filters.topic) {
    addFilter(clauses, params, "c.topic = $n", filters.topic);
  }

  if (filters.severity) {
    addFilter(clauses, params, "c.severity = $n", filters.severity);
  }

  if (filters.risk_type) {
    addFilter(clauses, params, "c.risk_type = $n", filters.risk_type);
  }

  return { tenantId, clauses, params };
}

async function readSummary(query = {}) {
  const { clauses, params } = buildBaseReviewClauses(query);

  const rows = await dbQuery(
    `select
       min(r.place_id) as place_id,
       min(p.name) as name,
       count(*)::int as total_reviews,
       count(c.review_hash)::int as classified_reviews,
       count(*) filter (where c.sentiment = 'negative')::int as negative_reviews,
       count(*) filter (where c.sentiment = 'positive')::int as positive_reviews,
       count(*) filter (where c.sentiment = 'neutral')::int as neutral_reviews,
       count(*) filter (where c.sentiment = 'mixed')::int as mixed_reviews,
       count(*) filter (where c.severity = 'critical')::int as critical_reviews,
       count(*) filter (where c.severity = 'high')::int as high_reviews,
       count(*) filter (where c.requires_alert = true)::int as alert_reviews
     from place_reviews r
     join places p
       on p.tenant_id = r.tenant_id
      and p.place_id = r.place_id
     left join review_classifications c
       on c.tenant_id = r.tenant_id
      and c.place_id = r.place_id
      and c.review_hash = r.review_hash
     where ${clauses.join("\n       and ")}`,
    params
  );

  return rows[0] || null;
}

async function readEvidence(query = {}) {
  const output = query.output || {};
  const limit = Math.min(Number(output.evidence_per_row || 5), 10);
  const { clauses, params } = buildBaseReviewClauses(query);
  params.push(limit);

  return dbQuery(
    `select
       r.place_id,
       p.name,
       r.review_hash,
       r.rating,
       coalesce(r.text, r.original_text, '') as text,
       r.author,
       r.review_date,
       c.sentiment,
       c.topic,
       c.severity,
       c.risk_type,
       c.requires_alert,
       c.summary,
       c.evidence_excerpt
     from place_reviews r
     join places p
       on p.tenant_id = r.tenant_id
      and p.place_id = r.place_id
     left join review_classifications c
       on c.tenant_id = r.tenant_id
      and c.place_id = r.place_id
      and c.review_hash = r.review_hash
     where ${clauses.join("\n       and ")}
     order by
       case c.severity
         when 'critical' then 1
         when 'high' then 2
         when 'medium' then 3
         when 'low' then 4
         else 5
       end,
       r.review_date desc nulls last
     limit $${params.length}`,
    params
  );
}

export async function executeReviewSummary(input = {}) {
  const tenantId = resolveTenantId(input);
  const filters = input.filters || {};

  filters.place_id = normalizeText(filters.place_id);
  filters.place_name = normalizeText(filters.place_name);
  filters.mall_name = normalizeText(filters.mall_name);
  filters.review_hash = normalizeText(filters.review_hash);
  filters.sentiment = normalizeText(filters.sentiment);
  filters.topic = normalizeText(filters.topic);
  filters.severity = normalizeText(filters.severity);
  filters.risk_type = normalizeText(filters.risk_type);

  const query = {
    ...input,
    tenant_id: tenantId,
    filters,
    output: {
      include_evidence: true,
      evidence_per_row: 5,
      ...(input.output || {}),
    },
  };

  const summary = await readSummary(query);
  const evidence = query.output.include_evidence === false ? [] : await readEvidence(query);

  return {
    ok: true,
    query,
    place_id: summary?.place_id || filters.place_id || null,
    name: summary?.name || null,
    total_reviews: summary?.total_reviews || 0,
    classified_reviews: summary?.classified_reviews || 0,
    negative_reviews: summary?.negative_reviews || 0,
    positive_reviews: summary?.positive_reviews || 0,
    neutral_reviews: summary?.neutral_reviews || 0,
    mixed_reviews: summary?.mixed_reviews || 0,
    critical_reviews: summary?.critical_reviews || 0,
    high_reviews: summary?.high_reviews || 0,
    alert_reviews: summary?.alert_reviews || 0,
    evidence,
    source: "neon_review_classifications",
  };
}
