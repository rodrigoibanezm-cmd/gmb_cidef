import { compareAllFromSnapshot } from "../lib/gmb/compareFromSnapshot.js";

export default async function handler(req, res) {
  try {
    const date = req.query.date || undefined;
    const result = await compareAllFromSnapshot({ date });

    return res.status(200).json(result);
  } catch (error) {
    console.error("compare-all from snapshot failed", error);
    return res.status(500).json({ ok: false, error: "compare_all_failed" });
  }
}
