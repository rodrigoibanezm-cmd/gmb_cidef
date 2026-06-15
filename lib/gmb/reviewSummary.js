import { dbQuery } from "./postgres.js";
import { buildBaseReviewClauses, normalizeReviewFilters } from "./reviewQueryFilters.js";

const DEFAULT_EVIDENCE_LIMIT = 5;
const MAX_EVIDENCE_LIMIT = 200;

function resolveTenantId(input = {}) {
  const tenantId = input.tenant_id || input.tenant || input.filters?.tenant_id;
  if (typeof tenantId !== "string" || !tenantId.trim()) {
    throw new Error("tenant_id_required");
  }
  const normalized = tenantId.trim().toLowerCase