import { gmbCaptureKeys } from "../../../lib/gmb/keys.js";
import { redisCommand } from "../../../lib/gmb/redis.js";

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export default async function handler(req, res) {
  try {
    const limit = Number(req.query.limit || 3);
    const keys = await redisCommand(["HKEYS", gmbCaptureKeys.classifiedHash]);
    const placeIds = Array.isArray(keys) ? keys.slice(0, limit) : [];
    const sample = [];

    for (const placeId of placeIds) {
      const value = await redisCommand(["HGET", gmbCaptureKeys.classifiedHash, placeId]);
      sample.push({ place_id: placeId, classified: safeJson(value) });
    }

    return res.status(200).json({ ok: true, total_seen: keys?.length || 0, sample });
  } catch (error) {
    console.error("classified sample failed", error);
    return res.status(500).json({ ok: false, error: "classified_sample_failed" });
  }
}
