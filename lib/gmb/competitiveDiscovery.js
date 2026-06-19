import { dbQuery } from "./postgres.js";

function tenant(v) {
  const t = String(v || "").trim().toLowerCase();
  if (!t) throw new Error("tenant_id_required");
  return t === "autos" ? "cidef" : t;
}

function bool(v, d = true) {
  return v == null ? d : !(v === false || v === "false");
}

function num(v, d, max) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), max) : d;
}

export async function executeCompetitiveDiscoveryLandscape(input = {}) {
  const p = input.params || input;
  const o = p.output || {};
  const q = {
    tenant_id: tenant(p.tenant_id || input.tenant_id || input.tenant),
    date: p.date || null,
    industry: p.industry || null,
    store_role: p.store_role || "dealer",
    ownership_group: p.ownership_group || "all",
    valid_only: bool(p.valid_only, true),
    limit: num(p.limit ?? o.limit, 200, 500),
    offset: num(p.offset ?? o.offset, 0, 1000000),
  };

  const [row] = await dbQuery(`
    with effective as (
      select coalesce($2::date, (
        select max(m.captured_date)
        from places p
        join place_daily_metrics m on m.tenant_id=p.tenant_id and m.place_id=p.place_id
        where p.tenant_id=$1
          and ($3::text is null or p.industry=$3)
          and ($4='all' or p.store_role=$4)
          and ($5='all' or p.ownership_group=$5)
          and ($6::boolean=false or coalesce(p.status,'keep')='keep')
      )) as date
    ),
    base as (
      select p.place_id,p.name,p.brand,p.ownership_group,p.store_role,
        p.normalized_location as location,p.market_group,p.region,
        coalesce(p.status,'keep') as status,m.rating,m.review_count as reviews
      from places p
      join place_daily_metrics m on m.tenant_id=p.tenant_id and m.place_id=p.place_id
      join effective e on m.captured_date=e.date
      where p.tenant_id=$1
        and ($3::text is null or p.industry=$3)
        and ($4='all' or p.store_role=$4)
        and ($5='all' or p.ownership_group=$5)
        and ($6::boolean=false or coalesce(p.status,'keep')='keep')
    ),
    ranked as (
      select *, row_number() over (
        partition by coalesce(market_group,location,'unknown')
        order by rating desc nulls last, reviews desc nulls last, name asc
      ) as position
      from base
    ),
    markets as (
      select
        coalesce(market_group,location,'unknown') as market_group,
        min(location) as location,
        count(*)::int as total_place_ids,
        count(*) filter (where ownership_group='own')::int as own_place_ids,
        count(*) filter (where ownership_group='competitor')::int as competitor_place_ids,
        count(distinct brand)::int as brands_count,
        round(avg(rating)::numeric,2)::float as avg_rating,
        sum(reviews)::int as total_reviews,
        (array_agg(to_jsonb(ranked) order by position))[1] as leader,
        (array_agg(to_jsonb(ranked) order by position) filter (where ownership_group='own'))[1] as own_best
      from ranked
      group by coalesce(market_group,location,'unknown')
    )
    select jsonb_build_object(
      'ok', true,
      'tenant_id', $1,
      'public_tenant_id', case when $1='cidef' then 'autos' else $1 end,
      'source', 'neon_competitive_discovery_landscape',
      'requested_date', $2::text,
      'effective_captured_date', (select date::text from effective),
      'universe', coalesce((select jsonb_build_object(
        'total_place_ids', count(*),
        'own_place_ids', count(*) filter (where ownership_group='own'),
        'competitor_place_ids', count(*) filter (where ownership_group='competitor'),
        'total_locations', count(distinct location),
        'total_market_groups', count(distinct market_group),
        'total_brands', count(distinct brand)
      ) from base), '{}'::jsonb),
      'markets', coalesce((select jsonb_agg(to_jsonb(m) || jsonb_build_object(
        'gap_vs_leader', case when own_best is null then null else round(((own_best->>'rating')::numeric - (leader->>'rating')::numeric),2) end,
        'own_position', (own_best->>'position')::int,
        'competitors_ahead', case when own_best is null then competitor_place_ids else greatest(((own_best->>'position')::int - 1),0) end
      ) order by total_place_ids desc) from markets m), '[]'::jsonb),
      'places', coalesce((select jsonb_agg(to_jsonb(x)) from (
        select *, case when reviews>=100 then 'alta' when reviews>=20 then 'media' else 'baja' end as confidence
        from ranked order by market_group nulls last, position limit $7 offset $8
      ) x), '[]'::jsonb),
      'pagination', jsonb_build_object(
        'limit', $7, 'offset', $8, 'total', (select count(*) from base),
        'has_more', $8 + $7 < (select count(*) from base),
        'next_offset', case when $8 + $7 < (select count(*) from base) then $8 + $7 else null end
      )
    ) as payload
  `, [q.tenant_id, q.date, q.industry, q.store_role, q.ownership_group, q.valid_only, q.limit, q.offset]);

  return row?.payload;
}
