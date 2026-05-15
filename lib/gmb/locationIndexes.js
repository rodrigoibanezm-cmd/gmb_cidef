import { gmbCaptureKeys } from "./keys.js";
import { redisCommand } from "./redis.js";

const STORE_ROLES = ["dealer", "service", "parts", "all"];

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function confidence(n) {
  if (n < 10) return "baja";
  if (n < 30) return "media";
  return "alta";
}

function groupByLocation(places) {
  return places.reduce((acc, place) => {
    const location = place.normalized_location || place.mall || place.city;
    const brand = place.brand || place.name;

    if (!location || !brand) return acc;
    if (!acc[location]) acc[location] = [];
    acc[location].push({ ...place, location, brand });

    return acc;
  }, {});
}

async function getClassifiedPlaces() {
  const raw = await redisCommand(["HGETALL", gmbCaptureKeys.classifiedHash]);
  return Object.entries(raw || {}).map(([placeId, value]) => ({
    place_id: placeId,
    ...(safeJson(value) || {}),
  }));
}

async function getSnapshot(date, placeId) {
  const raw = await redisCommand(["GET", gmbCaptureKeys.snapshot(date, placeId)]);
  return safeJson(raw);
}

function buildStore(place, snapshot) {
  const reviewsCount = snapshot.review_count ?? 0;

  return {
    brand: place.brand,
    name: place.name || snapshot.name,
    place_id: place.place_id,
    ownership_group: place.ownership_group || null,
    store_role: place.store_role || null,
    rating: snapshot.rating ?? 0,
    reviews_count: reviewsCount,
    confidence: confidence(reviewsCount),
  };
}

function isOwned(item) {
  return item.ownership_group === "own";
}

function eligibleTop(ranking) {
  return ranking.find((item) => item.confidence !== "baja") || ranking[0] || null;
}

function buildOwnedSummary(ranking) {
  const owned = ranking.find(isOwned);
  const top = eligibleTop(ranking);

  if (!owned || !top) return null;

  return {
    position: ranking.indexOf(owned) + 1,
    brand: owned.brand,
    rating: owned.rating,
    reviews: owned.reviews_count,
    confidence: owned.confidence,
    gap_vs_top: +(top.rating - owned.rating).toFixed(2),
  };
}

function filterByRole(ranking, role) {
  if (role === "all") return ranking;
  return ranking.filter((item) => item.store_role === role);
}

function buildSummary(location, ranking) {
  if (ranking.length === 0) return null;

  return {
    location,
    stores_count: ranking.length,
    owned_count: ranking.filter(isOwned).length,
    competitor_count: ranking.filter((item) => item.ownership_group === "competitor").length,
    top: eligibleTop(ranking),
    owned: buildOwnedSummary(ranking),
  };
}

async function saveRoleIndexes({ date, role, rankingsByLocation }) {
  const locations = [];

  for (const [location, baseRanking] of Object.entries(rankingsByLocation)) {
    const ranking = filterByRole(baseRanking, role);
    const summary = buildSummary(location, ranking);

    await redisCommand(["SET", `gmb:index:${date}:location:${location}:ranking:${role}`, JSON.stringify(ranking)]);
    if (summary) locations.push(summary);

    if (role === "dealer") {
      await redisCommand(["SET", `gmb:index:${date}:location:${location}:ranking`, JSON.stringify(ranking)]);
    }
  }

  await redisCommand(["SET", `gmb:index:${date}:locations:${role}`, JSON.stringify(locations)]);

  if (role === "dealer") {
    await redisCommand(["SET", `gmb:index:${date}:locations`, JSON.stringify(locations)]);
  }

  return locations.length;
}

export async function buildLocationIndexes(date) {
  const classified = await getClassifiedPlaces();
  const byLocation = groupByLocation(classified);
  const rankingsByLocation = {};

  for (const [location, places] of Object.entries(byLocation)) {
    const ranking = [];

    for (const place of places) {
      const snapshot = await getSnapshot(date, place.place_id);
      if (snapshot) ranking.push(buildStore(place, snapshot));
    }

    ranking.sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count);
    rankingsByLocation[location] = ranking;
  }

  const counts = {};
  for (const role of STORE_ROLES) {
    counts[role] = await saveRoleIndexes({ date, role, rankingsByLocation });
  }

  return {
    locations: counts.dealer,
    ranked_locations: counts.dealer,
    role_locations: counts,
  };
}
