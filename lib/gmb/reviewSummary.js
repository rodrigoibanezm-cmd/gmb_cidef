import { dbQuery } from "./postgres.js";
import { buildBaseReviewClauses, normalizeReviewFilters } from "./reviewQueryFilters.js";

function resolveTenantId(input = {}) {
  const tenantId = input.tenant_id || input.tenant || input.filters?.tenant_id;
  if (typeof tenantId !== "string" || !tenantId.trim()) {
    throw new Error("tenant_id_required");
  }
  const normalized = tenantId.trim().toLowerCase();
  return normalized === "autos" ? "cidef" : normalized;
}

function resolveEvidenceLimit(output = {}) {
  return Math.min(Number(output.evidence_per_row || 5), 25);
}

async function readSummary(query = {}) {
  const { clauses, params } = buildBaseReviewClauses(query);

  const rows = await dbQuery(
    `select
       min(r.place_id) as place_id,
       min(p.name) as name,
       count(*)::int as total_reviews,
       count(c.review_hash)::int as classified_reviews,
       count(*) filter (where r.rating = 1)::int as rating_1_reviews,
       count(*) filter (where r.rating = 2)::int as rating_2_reviews,
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
  const limit = resolveEvidenceLimit(query.output || {});
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
       r.rating asc nulls last,
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
  const filters = normalizeReviewFilters(input.filters || {});

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
  const evidenceLimit = resolveEvidenceLimit(query.output);
  const evidence = query.output.include_evidence === false ? [] : await readEvidence(query);
  const totalReviews = summary?.total_reviews || 0;

  return {
    ok: true,
    query,
    place_id: summary?.place_id || filters.place_id || null,
    name: summary?.name || null,
    total_reviews: totalReviews,
    rating_1_reviews: summary?.rating_1_reviews || 0,
    rating_2_reviews: summary?.rating_2_reviews || 0,
    classified_reviews: summary?.classified_reviews || 0,
    negative_reviews: summary?.negative_reviews || 0,
    positive_reviews: summary?.positive_reviews || 0,
    neutral_reviews: summary?.neutral_reviews || 0,
    mixed_reviews: summary?.mixed_reviews || 0,
    critical_reviews: summary?.critical_reviews || 0,
    high_reviews: summary?.high_reviews || 0,
    alert_reviews: summary?.alert_reviews || 0,
    evidence_returned: evidence.length,
    evidence_limit: evidenceLimit,
    is_partial: evidence.length < totalReviews,
    evidence,
    source: "neon_review_classifications",
  };
}
