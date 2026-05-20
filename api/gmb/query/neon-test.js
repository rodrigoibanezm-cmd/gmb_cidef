import { executeCompareQueryNeon } from "../../../lib/gmb/queryExecutorNeon.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const result = await executeCompareQueryNeon(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error("neon query test failed", error);
    return res.status(500).json({
      ok: false,
      error: "neon_query_test_failed",
      message: error.message,
    });
  }
}
