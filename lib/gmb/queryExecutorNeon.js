import { normalizeCompareQuery } from "./queryContract.js";
import { readDailyMetricsFromPostgres } from "./metricsReader.js";
import { getReviewEvidence } from "./evidence.js";

function metricValue(row, metric) {
  if (metric === "rating") return Number(row.rating || row.top?.rating || 0);
  if (metric === "reviews_count") return Number(row.reviews_count || row.reviews || row.top?.reviews_count || 0);
  if (metric === "gap_vs_top") return Number(row.owned?.gap_vs_top ?? row.gap_vs_top ?? 0);
  if (metric === "position") return Number(row.owned?.position ?? row.position ?? 9999);
  if (metric === "avg_value") return Number(row.avg_value || 0);
  return 0;
}

function sortRows(rows, metric, sort) {
  const direction = sort === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => (metricValue(a, metric) - metricValue(b, metric)) * direction);
}

function withConfidence(row) {
  const reviews = Number(row.reviews_count || 0);
  return {
    ...row,
    confidence: reviews >= 100 ? "alta" : reviews >= 20 ? "media" : "baja",
  };
}

function isValidConfidence(value) {
  return value === "media" || value === "alta";
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

function groupByLocation(rows) {
  const groups = new Map();

  for (const row of rows) {
    const location = row.location || "unknown";
    if (!groups.has(location)) groups.set(location, []);
    groups.get(location).push(row);
  }

  return groups;
}

function buildRanking(rows) {
  return [...rows]
    .map(withConfidence)
    .sort((a, b) => {
      const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return Number(b.reviews_count || 0) - Number(a.reviews_count || 0);
    });
}

function eligibleRows(ranking, filters) {
  if (!filters.valid_only) return ranking;
  return ranking.filter((item) => isValidConfidence(item.confidence));
}

function eligibleTop(ranking, filters) {
  return eligibleRows(ranking, filters)[0] || null;
}

function buildOwnedSummary(ranking, filters) {
  const eligibleRanking = eligibleRows(ranking, filters);
  const owned = eligibleRanking.find((item) => filters.own_values.includes(item.ownership_group)) || null;
  const top = eligibleRanking[0] || null;

  if (!owned || !top) return null;

  return {
    position: eligibleRanking.indexOf(owned) + 1,
    brand: owned.brand,
    rating: owned.rating,
    reviews: owned.reviews_count,
    confidence: owned.confidence,
    gap_vs_top: Math.max(0, +(Number(top.rating || 0) - Number(owned.rating || 0)).toFixed(2)),
    place_id: owned.place_id,
  };
}

function buildLocationSummary(location, ranking, filters) {
  const top = eligibleTop(ranking, filters);
  if (!top) return null;

  const owned = buildOwnedSummary(ranking, filters);
  if (filters.ownership_group === "own" && !owned) return null;

  return {
    location,
    stores_count: ranking.length,
    owned_count: ranking.filter((item) => filters.own_values.includes(item.ownership_group)).length,
    competitor_count: ranking.filter((item) => item.ownership_group === "competitor").length,
    top,
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
      placeId,
      limit: query.output.evidence_per_row,
      tenantId: query.tenant_id,
    });

    enriched.push({
      ...row,
      evidence,
    });
  }

  return enriched;
}

async function executeExtra(query) {
  const metricRows = await readDailyMetricsFromPostgres(query);
  const groups = groupByLocation(metricRows);
  const rows = [];

  for (const [location, locationRows] of groups.entries()) {
    const ranking = buildRanking(locationRows);
    const summary = buildLocationSummary(location, ranking, query.filters);
    if (summary) rows.push(summary);
  }

  return sortRows(rows, query.metric, query.output.sort).slice(0, query.output.max_rows);
}

async function executeIntra(query) {
  const metricRows = (await readDailyMetricsFromPostgres(query)).map(withConfidence);
  const rows = query.filters.valid_only
    ? metricRows.filter((row) => isValidConfidence(row.confidence))
    : metricRows;
  const grouped = groupRows(rows, query.dimension, query.metric);
  return sortRows(grouped, "avg_value", query.output.sort).slice(0, query.output.max_rows);
}

export async function executeCompareQueryNeon(input) {
  const query = normalizeCompareQuery(input);

  let rows = [];
  if (query.scope === "intra") {
    rows = await executeIntra(query);
  } else {
    rows = await executeExtra(query);
  }

  rows = await attachEvidence(rows, query);

  return {
    ok: true,
    query,
    rows,
    row_count: rows.length,
    source: "neon_place_daily_metrics",
  };
}
