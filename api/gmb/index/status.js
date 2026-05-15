import { redisCommand } from "../../../lib/gmb/redis.js";

function today() {
  return new Date().toISOString().slice(0, 10);
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

async function scanKeys(pattern) {
  let cursor = "0";
  const keys = [];

  do {
    const result = await redisCommand(["SCAN", cursor, "MATCH", pattern, "COUNT", "200"]);
    cursor = String(result?.[0] || "0");
    keys.push(...(result?.[1] || []));
  } while (cursor !== "0");

  return keys;
}

export default async function handler(req, res) {
  try {
    const date = req.query.date || today();
    const snapshotKeys = await scanKeys(`gmb:snapshot:${date}:*`);
    const indexedPlaceIds = safeJson(await redisCommand(["GET", `gmb:index:${date}:place_ids`])) || [];
    const locations = safeJson(await redisCommand(["GET", `gmb:index:${date}:locations`])) || [];

    const snapshotPlaceIds = snapshotKeys.map((key) => key.replace(`gmb:snapshot:${date}:`, ""));
    const indexedSet = new Set(indexedPlaceIds);
    const missing_in_index = snapshotPlaceIds.filter((placeId) => !indexedSet.has(placeId));

    return res.status(200).json({
      ok: true,
      date,
      updated: missing_in_index.length === 0 && snapshotPlaceIds.length === indexedPlaceIds.length,
      snapshots: snapshotPlaceIds.length,
      indexed_places: indexedPlaceIds.length,
      locations: locations.length,
      missing_in_index_count: missing_in_index.length,
      missing_in_index: missing_in_index.slice(0, 20),
    });
  } catch (error) {
    console.error("index status failed", error);
    return res.status(500).json({ ok: false, error: "index_status_failed" });
  }
}
