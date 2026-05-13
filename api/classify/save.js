import { redisGet, redisSet } from "../../lib/upstash.js";

const KEY = "gmb:classified:v1";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "method_not_allowed"
      });
    }

    const items = Array.isArray(req.body) ? req.body : req.body.items;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        ok: false,
        error: "invalid_items"
      });
    }

    const existing = (await redisGet(KEY)) || [];

    const map = new Map(existing.map((x) => [x.place_id, x]));

    for (const item of items) {
      if (!item.place_id) continue;
      map.set(item.place_id, item);
    }

    const merged = Array.from(map.values());

    await redisSet(KEY, merged);

    return res.status(200).json({
      ok: true,
      saved: items.length,
      total: merged.length,
      key: KEY
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
