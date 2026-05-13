import { redisHlen, redisHset } from "../../lib/upstash.js";

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

    let saved = 0;

    for (const item of items) {
      if (!item.place_id) continue;

      await redisHset(KEY, item.place_id, item);
      saved++;
    }

    const total = await redisHlen(KEY);

    return res.status(200).json({
      ok: true,
      saved,
      total,
      key: KEY,
      storage: "redis_hash"
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
