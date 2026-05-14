import { compareMallFromSnapshot } from "../lib/gmb/compareFromSnapshot.js";

function parseBool(value) {
  return value === "true" || value === "1";
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function handler(req, res) {
  try {
    const mall = req.query.mall;
    const date = req.query.date || undefined;
    const includeReviews = parseBool(req.query.include_reviews);
    const evidenceLimit = parseNumber(req.query.evidence_limit, 3);

    if (!mall) {
      return res.status(400).json({ ok: false, error: "missing_mall" });
    }

    const result = await compareMallFromSnapshot({ mall, date, includeReviews, evidenceLimit });
    return res.status(200).json(result);
  } catch (error) {
    console.error("compare from snapshot failed", error);
    return res.status(500).json({ ok: false, error: "compare_failed" });
  }
}
