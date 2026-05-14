import { capturePlacesDemo } from "../../../lib/gmb/capturePlacesDemo.js";

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const limit = parseNumber(req.query.limit, 25);
    const offset = parseNumber(req.query.offset, 0);
    const result = await capturePlacesDemo({ limit, offset });

    return res.status(200).json(result);
  } catch (error) {
    console.error("capture demo failed", error);

    return res.status(500).json({
      ok: false,
      error: "capture_demo_failed",
    });
  }
}
