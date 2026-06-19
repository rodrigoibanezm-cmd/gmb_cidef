import { dbQuery } from "./postgres.js";

const MAX_LIMIT = 500;

function nTenant(v) {
  const t = String(v || "").trim().toLowerCase();
  if (!t) throw new Error("tenant_id_required");
  return t === "autos" ? "cidef" : t;
}

function nBool(v, d = true) {
  return v === undefined || v === null ? d : !(v === false || v === "false");
}

function nInt(v, d, max = MAX_LIMIT) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), max) : d;
}

function confidence(reviews) {
  const n = Number(reviews) || 0;
  if (n >= 100) return "alta";
  if (n >= 20) return "media";
  return "baja";
}

function filters(q) {
  const p = [q.tenant_id];
  const w = ["p.tenant_id = $1"];
  const add = (s, v) => { p.push(v); w.push(s.replace("$n", `$${p.length}`)); };
  if (q.valid_only) w.push("coalesce(p.status, 'keep') = 'keep'");
  if (q.industry) add("p.industry = $n", q.industry);
  if (q.store_role && q.store_role !== "all") add("p.store_role = $n", q.store_role);
  if (q.ownership_group && q.ownership_group !== "all") add("p.ownership_group = $n", q.ownership_group);
  return { p, where: w.join(" and ") };
}

function params(input = {}) {
  const raw = input.params || input;
  const out = raw.output || {};
  return {
    tenant_id: nTenant(raw.tenant_id || input.tenant_id || input.tenant),
    requested_date: raw.date || null,
    industry: raw.industry || null,
    store_role: raw.store_role || "dealer",
    ownership_group: raw.ownership_group || "all",
    valid_only: nBool(raw.valid_only, true),
    limit: nInt(raw.limit ?? out.limit, 200),
    offset: nInt(raw.offset ?? out.offset, 0, 1000000),
  };
}

async function effectiveDate(q) {
  if (q.requested_date) return q.requested_date;
  const f = filters(q);
  const r = await dbQuery(`
    select max(m.captured_date)::text as date
    from places p join place_daily_metrics m on m.tenant_id=p.tenant_id and m.place_id=p.place_id
    where ${f.where}`, f.p);
  return r[0]?.date || null;
}

function baseSql(where) {
  return `
    base as (
      select p.place_id,p.name,p.brand,p.ownership_group,p.store_role,p.normalized_location as location,
             p.market_group,p.region,coalesce(p.status,'keep') as status,m.rating,m.review_count as reviews
      from places p join place_daily_metrics m on m.tenant_id=p.tenant_id and m.place_id=p.place_id
      where ${where} and m.captured_date = $2
    ), ranked as (
      select *, row_number() over (partition by coalesce(market_group,location,'unknown') order by rating desc nulls last, reviews desc nulls last) as position
      from base
    )`;
}

export async function executeCompetitiveDiscoveryLandscape(input = {}) {
  const q = params(input);
  const date = await effectiveDate(q);
  if (!date) return { ok: true, tenant_id: q.tenant_id, requested_date: q.requested_date, effective_captured_date: null, universe: {}, markets: [], places: [], pagination: { limit: q.limit, offset: q.offset, total: 0, has_more: false, next_offset: null } };

  const f = filters(q);
  const p = [f.p[0], date, ...f.p.slice(1)];
  const where = f.where.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + 1}`).replace("$2", "$1");
  const cte = baseSql(where);

  const [universe] = await dbQuery(`with ${cte} select count(*)::int total_place_ids,
    count(*) filter (where ownership_group='own')::int own_place_ids,
    count(*) filter (where ownership_group='competitor')::int competitor_place_ids,
    count(distinct location)::int total_locations,
    count(distinct market_group)::int total_market_groups,
    count(distinct brand)::int total_brands from base`, p);

  const markets = await dbQuery(`with ${cte} select coalesce(market_group,location,'unknown') market_group,
    min(location) location, count(*)::int total_place_ids,
    count(*) filter (where ownership_group='own')::int own_place_ids,
    count(*) filter (where ownership_group='competitor')::int competitor_place_ids,
    count(distinct brand)::int brands_count, round(avg(rating)::numeric,2)::float avg_rating, sum(reviews)::int total_reviews,
    jsonb_build_object('place_id',max(place_id) filter (where position=1),'name',max(name) filter (where position=1),'brand',max(brand) filter (where position=1),'ownership_group',max(ownership_group) filter (where position=1),'rating',max(rating) filter (where position=1),'reviews',max(reviews) filter (where position=1)) leader,
    jsonb_agg(jsonb_build_object('place_id',place_id,'name',name,'brand',brand,'rating',rating,'reviews',reviews,'position',position) order by position) filter (where ownership_group='own') -> 0 own_best
    from ranked group by 1 order by total_place_ids desc`, p);

  const total = Number(universe?.total_place_ids || 0);
  const places = await dbQuery(`with ${cte} select * from ranked order by market_group nulls last, position limit $${p.length + 1} offset $${p.length + 2}`, [...p, q.limit, q.offset]);

  return { ok: true, tenant_id: q.tenant_id, public_tenant_id: q.tenant_id === "cidef" ? "autos" : q.tenant_id,
    source: "neon_competitive_discovery_landscape", requested_date: q.requested_date, effective_captured_date: date,
    filters: { industry: q.industry, store_role: q.store_role, ownership_group: q.ownership_group, valid_only: q.valid_only },
    universe, markets: markets.map(m => ({ ...m, gap_vs_leader: m.own_best ? Number((Number(m.own_best.rating) - Number(m.leader.rating)).toFixed(2)) : null, own_position: m.own_best?.position || null, competitors_ahead: m.own_best ? Math.max(0, m.own_best.position - 1) : m.competitor_place_ids })),
    places: places.map(x => ({ ...x, confidence: confidence(x.reviews) })),
    pagination: { limit: q.limit, offset: q.offset, total, has_more: q.offset + q.limit < total, next_offset: q.offset + q.limit < total ? q.offset + q.limit : null } };
}
