import { gmbCaptureKeys } from "../../../lib/gmb/keys.js";
import { redisCommand } from "../../../lib/gmb/redis.js";

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hasConfirm(req) {
  return req.query.confirm === "true";
}

function normalizeOwnership(value) {
  if (value === "own" || value === "cidef") return "own";
  return "competitor";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!hasConfirm(req)) {
    return res.status(400).json({ ok: false, error: "normalize_requires_confirm" });
  }

  try {
    const raw = await redisCommand(["HGETALL", gmbCaptureKeys.classifiedHash]);
    const entries = Object.entries(raw || {});

    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    const counts_before = {};
    const counts_after = {};

    for (const [placeId, value] of entries) {
      scanned += 1;

      const item = safeJson(value);
      if (!item) {
        skipped += 1;
        continue;
      }

      const before = item.ownership_group || null;
      const after = normalizeOwnership(before);

      counts_before[before || "null"] = (counts_before[before || "null"] || 0) + 1;
      counts_after[after] = (counts_after[after] || 0) + 1;

      if (before === after) continue;

      item.ownership_group = after;
      await redisCommand(["HSET", gmbCaptureKeys.classifiedHash, placeId, JSON.stringify(item)]);
      updated += 1;
    }

    return res.status(200).json({
      ok: true,
      scanned,
      updated,
      skipped,
      counts_before,
      counts_after,
    });
  } catch (error) {
    console.error("normalize ownership failed", error);
    return res.status(500).json({ ok: false, error: "normalize_ownership_failed" });
  }
}
