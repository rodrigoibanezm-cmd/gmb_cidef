import { redisCommand } from "./redis.js";
import { normalizeCompareQuery } from "./queryContract.js";
import { getReviewEvidence } from "./evidence.js";

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readLocationSummaries(date, role = "dealer") {
  const suffix = role === "dealer" ? "locations" : `locations:${role}`;
  const raw = await redisCommand(["GET", `gmb:index:${date}:${suffix}`]);
  return safeJson(raw) || [];
}

async function readLocationRanking(date, location, role = "dealer") {
  const suffix = role === "dealer" ? "ranking" : `ranking:${role}`;
  const raw = await redisCommand(["GET", `gmb:index:${date}:location:${location}:${suffix}`]);
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
    return true;
  });
}

function metricValue(row, metric) {
  if (metric === "rating") return Number(row.rating || 0);
  if (metric === "reviews_count") return Number(row.reviews_count || row.reviews || 0);
  if (metric === "gap_vs_top") return Number(row.owned?.gap_vs_top ?? row.gap_vs_top ?? 0);
  if (metric === "position") return Number(row.owned?.position ?? row.position ?? 9999);
  if (metric === "avg_value") return Number(row.avg_value || 0);
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

  for (const row of rows) {
    const placeId = row?.owned?.place_id || row?.place_id || row?.top?.place_id;

    if (!placeId) {
      enriched.push(row);
      continue;
    }

    const evidence = await getReviewEvidence({
      date: query.date,
      placeId,
      limit: query.output.evidence_per_row,
    });

    enriched.push({
      ...row,
      evidence,
    });
  }

  return enriched;
}

async function executeExtra(query) {
  const locations = await readLocationSummaries(query.date, query.filters.store_role);
  const rows = [];

  for (const location of locations) {
    const ranking = await readLocationRanking(query.date, location.location, query.filters.store_role);
    const summary = buildLocationSummary({ location: location.location, ranking, filters: query.filters });
    if (summary) rows.push(summary);
  }

  const sorted = sortRows(rows, query.metric, query.output.sort);
  return sorted.slice(0, query.output.max_rows);
}

async function executeIntra(query) {
  const locations = await readLocationSummaries(query.date, query.filters.store_role);
  const allRows = [];

  for (const location of locations) {
    const ranking = await readLocationRanking(query.date, location.location, query.filters.store_role);
    const rowsWithLocation = ranking.map((row) => ({ ...row, location: location.location }));
    allRows.push(...applyEntityFilters(rowsWithLocation, query.filters));
  }

  const grouped = groupRows(allRows, query.dimension, query.metric);
  const sorted = sortRows(grouped, "avg_value", query.output.sort);

  return sorted.slice(0, query.output.max_rows);
}

export async function executeCompareQuery(input) {
  const query = normalizeCompareQuery(input);
  const baseRows = query.scope === "intra" ? await executeIntra(query) : await executeExtra(query);
  const rows = await attachEvidence(baseRows, query);

  return {
    ok: true,
    query,
    rows,
    row_count: rows.length,
    source: "upstash_analytic_indexes",
  };
}
