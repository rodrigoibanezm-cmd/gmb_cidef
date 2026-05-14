import { capturePlacesReviews } from "../../../lib/gmb/capturePlacesReviews.js";
import { gmbCaptureKeys } from "../../../lib/gmb/keys.js";
import { redisCommand } from "../../../lib/gmb/redis.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function readRun(date) {
  const raw = await redisCommand(["GET", gmbCaptureKeys.reviewsRun(date)]);
  return raw ? JSON.parse(raw) : null;
}

async function saveRun(date, run) {
  await redisCommand(["SET", gmbCaptureKeys.reviewsRun(date), JSON.stringify(run)]);
}

function buildNextRun(previousRun, result, limit) {
  return {
    captured_date: result.captured_date,
    total: result.total,
    limit,
    next_offset: result.next_offset,
    saved: Number(previousRun?.saved || 0) + result.saved,
    reviews_saved: Number(previousRun?.reviews_saved || 0) + result.reviews_saved,
    failed: Number(previousRun?.failed || 0) + result.failed,
    done: result.done,
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const date = today();
    const limit = parseNumber(req.query.limit, 10);
    const run = await readRun(date);

    if (run?.done) {
      return res.status(200).json({ ok: true, skipped: true, run });
    }

    const offset = Number(run?.next_offset || 0);
    const result = await capturePlacesReviews({ limit, offset });
    const nextRun = buildNextRun(run, result, limit);

    await saveRun(date, nextRun);

    return res.status(200).json({ ok: true, result, run: nextRun });
  } catch (error) {
    console.error("capture reviews-next failed", error);
    return res.status(500).json({ ok: false, error: "capture_reviews_next_failed" });
  }
}
