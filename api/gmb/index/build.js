import { buildGmbIndexes } from "../../../lib/gmb/indexBuilder.js";
import { normalizeClassifiedOwnership } from "../../../lib/gmb/normalizeOwnership.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const date = req.query.date || undefined;
    const tenantId = req.query.tenant || req.query.tenant_id || "cidef";
    const normalizeOwnership = req.query.normalize_ownership === "true";

    let normalization = null;

    if (normalizeOwnership) {
      normalization = await normalizeClassifiedOwnership();
    }

    const result = await buildGmbIndexes({ date, tenantId });

    return res.status(200).json({
      ok: true,
      tenant_id: tenantId,
      normalization,
      index: result,
    });
  } catch (error) {
    console.error("build gmb indexes failed", error);
    return res.status(500).json({ ok: false, error: "build_indexes_failed" });
  }
}
