import { redisCommand } from "./redis.js";
import { normalizeCompareQuery } from "./queryContract.js";

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readLocationSummaries(date) {
  const raw = await redisCommand(["GET", `gmb:index:${date}:locations`]);
  return safeJson(raw) || [];
}

async function readLocationRanking(date, location) {
  const raw = await redisCommand(["GET", `gmb:index:${date}:location:${location}:ranking`]);
  return safeJson(raw) || [];
}

function matchesOwnership(rowValue, filters) {
  if (filters.ownership_group === "all") return true;
  if (filters.ownership_group === "own") return filters.own_values.includes(rowValue);
  return rowValue === filters.ownership_group;
}

function isValidConfidence(value) {
  return value === "media" || value === "alta";
}

function isValidRow(row, filters) {
  if (!filters.valid_only) return true;

  if (row.owned) return isValidConfidence(row.owned.confidence);
  return isValidConfidence(row.confidence);
}

function applyEntityFilters(rows, filters) {
  return rows.filter((row) => {
    if (!isValidRow(row, filters)) return false;
    if (!matchesOwnership(row.ownership_group, filters)) return false;
    if (filters.store_role !== "all" && row.store_role !== filters.store_role) return false;
    return true;
  });
}

function applySummaryFilters(rows, filters) {
  return rows.filter((row) => isValidRow(row, filters));
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

async function executeExtra(query) {
  const rows = applySummaryFilters(await readLocationSummaries(query.date), query.filters);
  const sorted = sortRows(rows, query.metric, query.output.sort);

  return sorted.slice(0, query.output.max_rows);
}

async function executeIntra(query) {
  const locations = await readLocationSummaries(query.date);
  const allRows = [];

  for (const location of locations) {
    const ranking = await readLocationRanking(query.date, location.location);
    const rowsWithLocation = ranking.map((row) => ({ ...row, location: location.location }));
    allRows.push(...applyEntityFilters(rowsWithLocation, query.filters));
  }

  const grouped = groupRows(allRows, query.dimension, query.metric);
  const sorted = sortRows(grouped, "avg_value", query.output.sort);

  return sorted.slice(0, query.output.max_rows);
}

export async function executeCompareQuery(input) {
  const query = normalizeCompareQuery(input);
  const rows = query.scope === "intra" ? await executeIntra(query) : await executeExtra(query);

  return {
    ok: true,
    query,
    rows,
    row_count: rows.length,
    source: "upstash_analytic_indexes",
  };
}
