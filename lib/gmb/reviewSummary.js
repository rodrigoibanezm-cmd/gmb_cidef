import { dbQuery } from "./postgres.js";
import { buildBaseReviewClauses, normalizeReviewFilters } from "./reviewQueryFilters.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_FIELDS = [
  "place_id",
  "name",
  "review_hash",
  "rating",
  "text",
  "author",
  "review_date",
  "sentiment",
  "topic",
  "severity",
  "risk_type",
  "requires_alert",
  "summary",
  "evidence_excerpt",
];

const FIELD_SELECTORS = {
  place_id: "r.place_id",
  name: "p.name",
  review_hash: "r.review_hash",
  rating: "r.rating",
  text: "coalesce(r.text, r.original_text, '') as text",
  author: "r.author",
  review_date: "r.review_date",
  sentiment: "c.sentiment",
  topic: "c.topic",
  severity: "c.severity",
  risk_type: "c.risk_type",
  requires_alert: "c.requires_alert",
  summary: "c.summary",
  evidence_excerpt: "c.evidence_excerpt",
};

function resolveTenantId(input = {}) {
  const tenantId = input.tenant_id || input.tenant || input.filters?.tenant_id;
  if (typeof tenantId !== "string" || !tenantId.trim()) {
    throw new Error("tenant_id_required");
  }

  const normalized = tenantId.trim().toLowerCase();
  return normalized === "autos" ? "cidef" : normalized;
}

function boundedInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function resolveLimit(output = {}) {
  return boundedInteger(output.limit ?? output.evidence_per_row, DEFAULT_LIMIT, { min: 1, max: MAX_LIMIT });
}

function resolveOffset(output = {}) {
  return boundedInteger(output.offset, 0, { min: 0 });
}

function normalizeFields(fields) {
  const raw = Array.isArray(fields)
    ? fields
    : typeof fields === "string"
      ? fields.split(",")
      : DEFAULT_FIELDS;

  const selected = raw
    .map((field) => String(field || "").trim())
    .filter((field) => FIELD_SELECTORS[field]);

  return selected.length ? [...new Set(selected)] : DEFAULT_FIELDS;
}

function buildSelectList(fields) {
  return fields.map((field) => FIELD_SELECTORS[field]).join(",\n       ");
}

function isPlaceScoped(filters = {}) {
  return Boolean(filters.place_id || filters.review_hash);
}

async function readSummary(query = {}) {
  const { clauses, params } = buildBaseReviewClauses(query);

  const rows = await dbQuery(
    `select
       min(r.place_id) as sample_place_id,
       min(p.name) as sample_name,
       count(distinct r.place_id)::int as places_count,
       count(*)::int as total_reviews,
       count(c.review_hash)::int as classified_reviews,
       count(*) filter (where r.rating = 1)::int as rating_1_reviews,
       count(*) filter (where r.rating = 2)::int as rating_2_reviews,
       count(*) filter (where r.rating = 3)::int as rating_3_reviews,
       count(*) filter (where r.rating = 4)::int as rating_4_reviews,
       count(*) filter (where r.rating = 5)::int as rating_5_reviews,
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

async function readReviews(query = {}) {
  const limit = resolveLimit(query.output || {});
  const offset = resolveOffset(query.output || {});
  const fields = normalizeFields(query.output?.fields);
  const { clauses, params } = buildBaseReviewClauses(query);

  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const rows = await dbQuery(
    `select
       ${buildSelectList(fields)}
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
       r.review_date desc nulls last,
       r.rating asc nulls last,
       r.updated_at desc nulls last,
       r.review_hash asc
     limit ${limitParam}
     offset ${offsetParam}`,
    params
  );

  return { rows, limit, offset, fields };
}

export async function executeReviewSummary(input = {}) {
  const tenantId = resolveTenantId(input);
  const filters = normalizeReviewFilters(input.filters || {});
  const placeScoped = isPlaceScoped(filters);

  const query = {
    ...input,
    tenant_id: tenantId,
    filters,
    output: {
      include_evidence: true,
      limit: DEFAULT_LIMIT,
      offset: 0,
      ...(input.output || {}),
    },
  };

  const summary = await readSummary(query);
  const totalReviews = summary?.total_reviews || 0;
  const includeReviews = query.output.include_evidence !== false && query.output.include_reviews !== false;
  const page = includeReviews
    ? await readReviews(query)
    : { rows: [], limit: resolveLimit(query.output), offset: resolveOffset(query.output), fields: normalizeFields(query.output.fields) };
  const nextOffset = page.offset + page.rows.length;
  const hasMore = nextOffset < totalReviews;

  return {
    ok: true,
    query: {
      ...query,
      output: {
        ...query.output,
        limit: page.limit,
        offset: page.offset,
        fields: page.fields,
      },
    },
    scope: placeScoped ? "place" : "network",
    place_id: placeScoped ? (filters.place_id || summary?.sample_place_id || null) : null,
    name: placeScoped ? (summary?.sample_name || null) : null,
    sample_place_id: summary?.sample_place_id || null,
    sample_name: summary?.sample_name || null,
    places_count: summary?.places_count || 0,
    total_reviews: totalReviews,
    rating_1_reviews: summary?.rating_1_reviews || 0,
    rating_2_reviews: summary?.rating_2_reviews || 0,
    rating_3_reviews: summary?.rating_3_reviews || 0,
    rating_4_reviews: summary?.rating_4_reviews || 0,
    rating_5_reviews: summary?.rating_5_reviews || 0,
    classified_reviews: summary?.classified_reviews || 0,
    negative_reviews: summary?.negative_reviews || 0,
    positive_reviews: summary?.positive_reviews || 0,
    neutral_reviews: summary?.neutral_reviews || 0,
    mixed_reviews: summary?.mixed_reviews || 0,
    critical_reviews: summary?.critical_reviews || 0,
    high_reviews: summary?.high_reviews || 0,
    alert_reviews: summary?.alert_reviews || 0,
    limit: page.limit,
    offset: page.offset,
    reviews_returned: page.rows.length,
    has_more: hasMore,
    next_offset: hasMore ? nextOffset : null,
    is_partial: hasMore,
    reviews: page.rows,
    evidence_returned: page.rows.length,
    evidence_limit: page.limit,
    evidence: page.rows,
    source: "neon_place_reviews_with_optional_classifications",
  };
}
