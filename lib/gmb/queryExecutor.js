import { redisCommand } from "./redis.js";
import { normalizeCompareQuery } from "./queryContract.js";
import { getReviewEvidence } from "./evidence.js";
import { gmbCaptureKeys } from "./keys.js";

function tenantId(query = {}) {
  return query.tenant_id || query.tenant || query.filters?.tenant_id || "cidef";
}

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readLocationSummaries(date, role = "dealer", tenant = "cidef") {
  const suffix = role === "dealer" ? "locations" : `locations:${role}`;
  const raw = await redisCommand(["GET", gmbCaptureKeys.index(date, suffix, tenant)]);
  return safeJson(raw) || [];
}

async function readLocationRanking(date, location, role = "dealer", tenant = "cidef") {
  const raw = await redisCommand(["GET", gmbCaptureKeys.locationRanking(date, location, role, tenant)]);
  return safeJson(raw) || [];
}

function isValidConfidence(value) {
  return value === "media" || value === "alta";
}

function isValidRow(row, filters) {
  if (!filters.valid_only) return true;
  return isValidConfidence(row.confidence);
}

function matchesOwnership(rowValue, filters) {
  if (filters.ownership_group === "all") return true;
  if (filters.ownership_group === "own") return filters.own_values.includes(rowValue);
  return rowValue === filters.ownership_group;
}

function applyEntityFilters(rows, filters) {
  return rows.filter((row) => {
    if (!isValidRow(row, filters)) return false;
    if (!matchesOwnership(row.ownership_group, filters)) return false;
    if (filters.store_role !== "all" && row.store_role !== filters.store_role) return false;
    if (filters.location && row.location !== filters.location) return false;
    return true;
  });
}

function metricValue(row, metric) {
  if (metric === "rating") return Number(row.rating || 0);
  if (metric === "reviews_count") return Number(row.reviews_count || row.reviews || 0);
  if (metric === "gap_vs_top") return Number(row.owned?.gap_vs_top ?? row.gap_vs_top ?? 0);
  if (metric === "position") return Number(row.owned?.position ?? row.position ?? 9999);
  if (metric === "avg_value") return Number(row.avg_value || 0);
  if (metric === "delta_rating") return Number(row.delta_rating || 0);
  if (metric === "delta_reviews_count") return Number(row.delta_reviews_count || 0);
  if (metric === "delta_gap_vs_top") return Number(row.delta_gap_vs_top || 0);
  if (metric === "delta_position") return Number(row.delta_position || 0);
  return 0;
}

function sortRows(rows, metric, sort) {
  const direction = sort === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => (metricValue(a, metric) - metricValue(b, metric)) * direction);
}

function groupRows(rows, dimension, metric) {
  const groups = new Map();

  for (const row of rows) {
    const key = row[dimension] || "unknown";
    const current = groups.get(key) || { dimension_value: key, count: 0, total: 0, best: null, worst: null };
    const value = metricValue(row, metric);

    current.count += 1;
    current.total += value;
    if (!current.best || value > current.best.value) current.best = { value, row };
    if (!current.worst || value < current.worst.value) current.worst = { value, row };
    groups.set(key, current);
  }

  return [...groups.values()].map((group) => ({
    [dimension]: group.dimension_value,
    count: group.count,
    avg_value: group.count ? +(group.total / group.count).toFixed(2) : 0,
    best: group.best?.row || null,
    worst: group.worst?.row || null,
  }));
}

function eligibleTop(ranking) {
  return ranking.find((item) => item.confidence !== "baja") || ranking[0] || null;
}

function buildOwnedSummary(ranking, filters) {
  const owned = ranking.find((item) => filters.own_values.includes(item.ownership_group));
  const top = eligibleTop(ranking);

  if (!owned || !top) return null;
  if (filters.valid_only && !isValidConfidence(owned.confidence)) return null;

  return {
    position: ranking.indexOf(owned) + 1,
    brand: owned.brand,
    rating: owned.rating,
    reviews: owned.reviews_count,
    confidence: owned.confidence,
    gap_vs_top: +(top.rating - owned.rating).toFixed(2),
    place_id: owned.place_id,
  };
}

function buildLocationSummary({ location, ranking, filters }) {
  if (ranking.length === 0) return null;

  const owned = buildOwnedSummary(ranking, filters);
  if (filters.ownership_group === "own" && !owned) return null;

  return {
    location,
    stores_count: ranking.length,
    owned_count: ranking.filter((item) => filters.own_values.includes(item.ownership_group)).length,
    competitor_count: ranking.filter((item) => item.ownership_group === "competitor").length,
    top: eligibleTop(ranking),
    owned,
  };
}

async function attachEvidence(rows, query) {
  if (!query.output.include_evidence) return rows;

  const enriched = [];
  const tenant = tenantId(query);

  for (const row of rows) {
    const placeId = row?.owned?.place_id || row?.place_id || row?.top?.place_id;

    if (!placeId) {
      enriched.push(row);
      continue;
    }

    const evidence = await getReviewEvidence({
      date: query.date_to || query.date,
      placeId,
      limit: query.output.evidence_per_row,
      tenantId: tenant,
    });

    enriched.push({
      ...row,
      evidence,
    });
  }

  return enriched;
}

async function getTargetLocations(query) {
  if (query.filters.location) {
    return [{ location: query.filters.location }];
  }

  return readLocationSummaries(query.date, query.filters.store_role, tenantId(query));
}

async function executeExtra(query) {
  const locations = await getTargetLocations(query);
  const rows = [];
  const tenant = tenantId(query);

  for (const location of locations) {
    const ranking = await readLocationRanking(query.date, location.location, query.filters.store_role, tenant);
    const summary = buildLocationSummary({ location: location.location, ranking, filters: query.filters });
    if (summary) rows.push(summary);
  }

  const sorted = sortRows(rows, query.metric, query.output.sort);
  return sorted.slice(0, query.output.max_rows);
}

async function executeIntra(query) {
  const locations = await getTargetLocations(query);
  const allRows = [];
  const tenant = tenantId(query);

  for (const location of locations) {
    const ranking = await readLocationRanking(query.date, location.location, query.filters.store_role, tenant);
    const rowsWithLocation = ranking.map((row) => ({ ...row, location: location.location }));
    allRows.push(...applyEntityFilters(rowsWithLocation, query.filters));
  }

  const grouped = groupRows(allRows, query.dimension, query.metric);
  const sorted = sortRows(grouped, "avg_value", query.output.sort);

  return sorted.slice(0, query.output.max_rows);
}

async function executeTemporal(query) {
  const fromRows = await executeExtra({ ...query, date: query.date_from, metric: "gap_vs_top" });
  const toRows = await executeExtra({ ...query, date: query.date_to, metric: "gap_vs_top" });

  const fromMap = new Map(fromRows.map((row) => [row.location, row]));
  const rows = [];

  for (const current of toRows) {
    const previous = fromMap.get(current.location);
    if (!previous) continue;

    rows.push({
      location: current.location,
      date_from: query.date_from,
      date_to: query.date_to,
      rating_from: previous.owned?.rating ?? null,
      rating_to: current.owned?.rating ?? null,
      delta_rating: +((current.owned?.rating || 0) - (previous.owned?.rating || 0)).toFixed(2),
      reviews_from: previous.owned?.reviews ?? 0,
      reviews_to: current.owned?.reviews ?? 0,
      delta_reviews_count: (current.owned?.reviews || 0) - (previous.owned?.reviews || 0),
      gap_from: previous.owned?.gap_vs_top ?? null,
      gap_to: current.owned?.gap_vs_top ?? null,
      delta_gap_vs_top: +((current.owned?.gap_vs_top || 0) - (previous.owned?.gap_vs_top || 0)).toFixed(2),
      position_from: previous.owned?.position ?? null,
      position_to: current.owned?.position ?? null,
      delta_position: (current.owned?.position || 0) - (previous.owned?.position || 0),
      owned: current.owned,
      top: current.top,
    });
  }

  const sorted = sortRows(rows, query.metric, query.output.sort);
  return sorted.slice(0, query.output.max_rows);
}

export async function executeCompareQuery(input) {
  const query = normalizeCompareQuery(input);

  let baseRows = [];

  if (query.scope === "temporal") {
    baseRows = await executeTemporal(query);
  } else if (query.scope === "intra") {
    baseRows = await executeIntra(query);
  } else {
    baseRows = await executeExtra(query);
  }

  const rows = await attachEvidence(baseRows, query);

  return {
    ok: true,
    query,
    rows,
    row_count: rows.length,
    source: "upstash_analytic_indexes",
  };
}
