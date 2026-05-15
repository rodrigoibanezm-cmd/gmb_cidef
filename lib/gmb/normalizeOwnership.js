import { gmbCaptureKeys } from "./keys.js";
import { redisCommand } from "./redis.js";

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeOwnership(value) {
  if (value === "own" || value === "cidef") return "own";
  return "competitor";
}

export async function normalizeClassifiedOwnership() {
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

  return {
    scanned,
    updated,
    skipped,
    counts_before,
    counts_after,
  };
}
