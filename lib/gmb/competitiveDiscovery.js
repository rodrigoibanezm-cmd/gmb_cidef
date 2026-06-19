import { dbQuery } from "./postgres.js";

const MAX_LIMIT = 300;

function tenant(v) {
  const t = String(v || "").trim().toLowerCase();
  if (!t) throw new Error("tenant_id_required");
  return t === "autos" ? "cidef" : t;
}

function bool(v, d = true) {
  return v === undefined || v === null ? d : !(v === false || v === "false");
}

function num(v, d, max = MAX_LIMIT) {
  const n = Number