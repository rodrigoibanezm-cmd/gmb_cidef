import { normalizeCompareQuery } from "./queryContract.js";
import { readDailyMetricsFromPostgres } from "./metricsReader.js";
import { getReviewEvidence } from "./evidence.js";

function metricValue(row, metric) {
  if (metric === "rating") return Number(row.rating || row.top?.rating || 0);
  if (metric === "reviews_count") return Number(row.reviews_count || row.reviews || row.top?.reviews_count || 0);
  if (metric === "gap_vs_top") return Number(row.owned?.gap_vs_top ?? row.gap_vs_top ?? 0);
  if (metric === "position") return Number(row.owned?.position ?? row.position ?? 9999);
  if (metric === "delta_rating") return Number(row.delta_rating || 0);
  if (metric === "delta_reviews_count") return Number(row.delta_reviews_count || 0);
  if (metric === "delta_gap_vs_top") return Number(row.delta_gap_vs_top || 0);
  if (metric === "delta_position") return Number(row.delta_position || 0);
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

function indexByKey(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row?.[key];
    if (value) map.set(value, row);
  }
  return map;
}

function roundDelta(value) {
  return Number.isFinite(value) ? +value.toFixed(2) : null;
}

function temporalAggregateBaseMetric(metric) {
  if (metric === "delta_reviews_count") return "reviews_count";
  return "rating";
}

async function attachEvidence(rows, query) {
  if (!query.output.include_evidence) return rows;

  const enriched = [];

  for (const row of rows) {
    const placeId = row?.owned?.place_id || row?.place_id || row?.top?.place_id || row?.worst?.place_id || row?.best?.place_id;

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

async function executeTemporalLocation(query, internalOutput) {
  const fromRows = await executeExtra({
    ...query,
    date: query.date_from,
    date_to: query.date_from,
    output: internalOutput,
  });

  const toRows = await executeExtra({
    ...query,
    date: query.date_to,
    output: internalOutput,
  });

  const fromByLocation = indexByKey(fromRows, "location");
  const rows = [];

  for (const to of toRows) {
    const from = fromByLocation.get(to.location);
    if (!from?.owned || !to?.owned) continue;

    rows.push({
      location: to.location,
      date_from: query.date_from,
      date_to: query.date_to,
      rating_from: from.owned.rating,
      rating_to: to.owned.rating,
      delta_rating: roundDelta(Number(to.owned.rating) - Number(from.owned.rating)),
      reviews_from: from.owned.reviews,
      reviews_to: to.owned.reviews,
      delta_reviews_count: Number(to.owned.reviews || 0) - Number(from.owned.reviews || 0),
      gap_from: from.owned.gap_vs_top,
      gap_to: to.owned.gap_vs_top,
      delta_gap_vs_top: roundDelta(Number(to.owned.gap_vs_top) - Number(from.owned.gap_vs_top)),
      position_from: from.owned.position,
      position_to: to.owned.position,
      delta_position: Number(to.owned.position || 0) - Number(from.owned.position || 0),
      owned: to.owned,
      top: to.top,
      stores_count: to.stores_count,
      owned_count: to.owned_count,
      competitor_count: to.competitor_count,
    });
  }

  return rows;
}

async function executeTemporalAggregate(query, internalOutput) {
  const baseMetric = temporalAggregateBaseMetric(query.metric);
  const base = { ...query, metric: baseMetric };

  const fromRows = await executeIntra({
    ...base,
    date: query.date_from,
    date_to: query.date_from,
    output: internalOutput,
  });

  const toRows = await executeIntra({
    ...base,
    date: query.date_to,
    output: internalOutput,
  });

  const fromByDimension = indexByKey(fromRows, query.dimension);
  const rows = [];

  for (const to of toRows) {
    const key = to?.[query.dimension];
    const from = fromByDimension.get(key);
    if (!key || !from) continue;

    const deltaValue = roundDelta(Number(to.avg_value) - Number(from.avg_value));

    rows.push({
      [query.dimension]: key,
      date_from: query.date_from,
      date_to: query.date_to,
      metric: baseMetric,
      value_from: from.avg_value,
      value_to: to.avg_value,
      delta_rating: query.metric === "delta_rating" ? deltaValue : null,
      delta_reviews_count: query.metric === "delta_reviews_count" ? deltaValue : null,
      count_from: from.count,
      count_to: to.count,
      best: to.best,
      worst: to.worst,
    });
  }

  return rows;
}

async function executeTemporal(query) {
  const internalOutput = { ...query.output, include_evidence: false, max_rows: 20000 };
  const rows = query.dimension === "location"
    ? await executeTemporalLocation(query, internalOutput)
    : await executeTemporalAggregate(query, internalOutput);

  return sortRows(rows, query.metric, query.output.sort).slice(0, query.output.max_rows);
}

export async function executeCompareQueryNeon(input) {
  const query = normalizeCompareQuery(input);

  let rows = [];
  if (query.scope === "temporal") {
    rows = await executeTemporal(query);
  } else if (query.scope === "intra") {
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
