import { compareMallFromSnapshot } from "../lib/gmb/compareFromSnapshot.js";

export default async function handler(req, res) {
  try {
    const mall = req.query.mall;
    const date = req.query.date || undefined;

    if (!mall) {
      return res.status(400).json({ ok: false, error: "missing_mall" });
    }

    const result = await compareMallFromSnapshot({ mall, date });
    return res.status(200).json(result);
  } catch (error) {
    console.error("compare from snapshot failed", error);
    return res.status(500).json({ ok: false, error: "compare_failed" });
  }
}
