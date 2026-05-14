import { executeCompareQuery } from "../../lib/gmb/queryExecutor.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const result = await executeCompareQuery(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error("compare query failed", error);
    return res.status(400).json({
      ok: false,
      error: error.message || "compare_query_failed",
    });
  }
}
