import { dbQuery } from "./postgres.js";

const MAX_LIMIT = 500;

function nTenant(v) {
  const t = String(v || "").trim().toLowerCase();
  if (!t) throw new Error("tenant_id_required");
  return t === "autos" ? "cidef" : t;
}

function nBool(v, d = true) {
  return v === undefined || v === null ? d : !(v === false || v === "false");
}

function nInt(v, d, max = MAX_LIMIT) {
  const n = Number