import { executeCompareQuery } from "../../lib/gmb/queryExecutor.js";
import { executeCompareQueryNeon } from "../../lib/gmb/queryExecutorNeon.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const engine = req.query.engine || req.body?.engine || "neon";
    const executor = engine === "redis" ? executeCompareQuery : executeCompareQueryNeon;
    const result = await executor(req.body || {});

    return res.status(200).json({
      ...result,
      engine,
    });
  } catch (error) {
    console.error("compare query failed", error);
    return res.status(400).json({
      ok: false,
      error: error.message || "compare_query_failed",
    });
  }
}
