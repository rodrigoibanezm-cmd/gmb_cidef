import { dbQuery } from "./postgres.js";

function normalizeTenantId(value) {
  const tenantId = String(value || "").trim();
  if (!tenantId) throw new Error("tenant_id_required");
  return tenantId === "autos" ? "cidef" : tenantId;
}

function publicTenantId(value) {
  return value === "cidef" ? "autos" : value;
}

function confidence(reviews) {
  const count = Number(reviews || 0);
  if (count >= 100) return "alta";
  if