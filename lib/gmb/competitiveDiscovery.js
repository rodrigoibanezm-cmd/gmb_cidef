import { dbQuery } from "./postgres.js";

const MAX_LIMIT = 500;

function tenant(v) {
  const t = String(v || "").trim().toLowerCase();
  if (!t) throw new Error("tenant_id_required");
  return t === "autos" ? "cidef" : t;
}

function bool(v, d = true) {
  return v === undefined || v === null ? d : !(v === false || v === "false");
}

function num(v, d, max = MAX_LIMIT) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), max) : d;
}

function conf(n) {
  n = Number(n) || 0;
  if (n >= 100) return "alta";
  if (n >= 20) return "media";
  return "baja";
}

function readParams(input = {}) {
  const p = input.params || input;
  const o = p.output || {};
  return {
    tenant_id: tenant(p.tenant_id || input.tenant_id || input.tenant),
    requested_date: p.date || null,
    industry: p.industry || null,
    store_role: p.store_role || "dealer",
    ownership_group: p.ownership_group || "all",
    valid_only: bool(p.valid_only, true),
    limit: num(p.limit ?? o.limit, 200),
    offset: num(p.offset ?? o.offset, 0, 1000000),
  };
}

function where(q, start = 1) {
  const values = [q.tenant_id];
  const parts = [`p.tenant_id = $${start}`];
  const add = (col, val) => {
    values.push(val);
    parts.push(`${col} = $${start + values.length - 1}`);
  };
  if (q.valid_only) parts.push("coalesce(p.status, 'keep') = 'keep'");
  if (q.industry) add("p.industry", q.industry);
  if (q.store_role !== "all") add("p.store_role", q.store_role);
  if (q.ownership_group !== "all") add("p.ownership_group", q.ownership_group);
  return { sql: parts.join(" and "), values };
}

async function effectiveDate(q) {
  if (q.requested_date) return q.requested_date;
  const w = where(q, 1);
  const rows = await dbQuery(`
    select max(m.captured_date)::text as date
    from places p
    join place_daily_metrics m on m.tenant_id=p.tenant_id and m.place_id=p.place_id
    where ${w.sql}
  `, w.values);
  return rows[0]?.date || null;
}

function baseCte(w) {
  return `
    base as (
      select p.place_id,p.name,p.brand,p.ownership_group,p.store_role,
             p.normalized_location as location,p.market_group,p.region,
             coalesce(p.status,'keep') as status,m.rating,m.review_count as reviews
      from places p
      join place_daily_metrics m on m.tenant_id=p.tenant_id and m.place_id=p.place_id
      where ${w.sql} and m.captured_date = $2
    ),
    ranked as (
      select *, row_number() over (
        partition by coalesce(market_group,location,'unknown')
        order by rating desc nulls last, reviews desc nulls last, name asc
      ) as position
      from base
    )`;
}

export async function executeCompetitiveDiscoveryLandscape(input = {}) {
  const q = readParams(input);
  const date = await effectiveDate(q);
  if (!date) return empty(q);

  const w0 = where(q, 3);
  const values = [q.tenant_id, date, ...w0.values.slice(1)];
  const cte = baseCte({ sql: w0.sql.replace("$3", "$1") });

  const [universe] = await dbQuery(`with ${cte}
    select count(*)::int total_place_ids,
      count(*) filter (where ownership_group='own')::int own_place_ids,
      count(*) filter (where ownership_group='competitor')::int competitor_place_ids,
      count(distinct location)::int total_locations,
      count(distinct market_group)::int total_market_groups,
      count(distinct brand)::int total_brands
    from base`, values);

  const markets = await dbQuery(`with ${cte}
    select coalesce(market_group,location,'unknown') as market_group,
      min(location) as location, count(*)::int total_place_ids,
      count(*) filter (where ownership_group='own')::int own_place_ids,
      count(*) filter (where ownership_group='competitor')::int competitor_place_ids,
      count(distinct brand)::int brands_count,
      round(avg(rating)::numeric,2)::float avg_rating, sum(reviews)::int total_reviews,
      (select row_to_json(r) from ranked r where coalesce(r.market_group,r.location,'unknown')=coalesce(base.market_group,base.location,'unknown') order by position limit 1) leader,
      (select row_to_json(r) from ranked r where coalesce(r.market_group,r.location,'unknown')=coalesce(base.market_group,base.location,'unknown') and ownership_group='own' order by position limit 1) own_best
    from base group by coalesce(market_group,location,'unknown')
    order by total_place_ids desc`, values);

  const total = Number(universe.total_place_ids || 0);
  const places = await dbQuery(`with ${cte}
    select * from ranked order by market_group nulls last, position
    limit $${values.length + 1} offset $${values.length + 2}`, [...values, q.limit, q.offset]);

  return {
    ok: true, tenant_id: q.tenant_id, public_tenant_id: q.tenant_id === "cidef" ? "autos" : q.tenant_id,
    source: "neon_competitive_discovery_landscape",
    requested_date: q.requested_date, effective_captured_date: date,
    universe,
    markets: markets.map(m => ({ ...m, gap_vs_leader: gap(m), own_position: m.own_best?.position || null, competitors_ahead: ahead(m) })),
    places: places.map(p => ({ ...p, confidence: conf(p.reviews) })),
    pagination: { limit: q.limit, offset: q.offset, total, has_more: q.offset + q.limit < total, next_offset: q.offset + q.limit < total ? q.offset + q.limit : null },
  };
}

function gap(m) {
  if (!m.own_best || !m.leader) return null;
  return Number((Number(m.own_best.rating) - Number(m.leader.rating)).toFixed(2));
}

function ahead(m) {
  if (!m.own_best) return m.competitor_place_ids || 0;
  return Math.max(0, Number(m.own_best.position || 1) - 1);
}

function empty(q) {
  return { ok: true, tenant_id: q.tenant_id, requested_date: q.requested_date, effective_captured_date: null, universe: {}, markets: [], places: [], pagination: { limit: q.limit, offset: q.offset, total: 0, has_more: false, next_offset: null } };
}
