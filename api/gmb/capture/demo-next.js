import { capturePlacesDemo } from "../../../lib/gmb/capturePlacesDemo.js";
import { buildGmbIndexes } from "../../../lib/gmb/indexBuilder.js";
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
  const raw = await redisCommand(["GET", gmbCaptureKeys.run(date)]);
  return raw ? JSON.parse(raw) : null;
}

async function saveRun(date, run) {
  await redisCommand(["SET", gmbCaptureKeys.run(date), JSON.stringify(run)]);
}

function buildNextRun(previousRun, result, limit) {
  return {
    captured_date: result.captured_date,
    total: result.total,
    existing: result.existing,
    missing: result.missing,
    limit,
    saved: Number(previousRun?.saved || 0) + result.saved,
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
    const limit = parseNumber(req.query.limit, 25);
    const run = await readRun(date);
    const result = await capturePlacesDemo({ limit, offset: 0 });
    const nextRun = buildNextRun(run, result, limit);
    const index = result.done ? await buildGmbIndexes({ date }) : null;

    await saveRun(date, nextRun);

    return res.status(200).json({ ok: true, result, run: nextRun, index });
  } catch (error) {
    console.error("capture demo-next failed", error);
    return res.status(500).json({ ok: false, error: "capture_demo_next_failed" });
  }
}
