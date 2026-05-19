import { dbQuery } from "../../../lib/gmb/postgres.js";

const statements = [
  `
  create table if not exists places (
    tenant_id text not null,
    place_id text not null,
    name text,
    brand text,
    normalized_location text,
    operator text,
    ownership_group text,
    store_role text,
    status text,
    address text,
    raw jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (tenant_id, place_id)
  )
  `,
  `create index if not exists idx_places_tenant_brand on places (tenant_id, brand)`,
  `create index if not exists idx_places_tenant_location on places (tenant_id, normalized_location)`,
  `create index if not exists idx_places_tenant_status on places (tenant_id, status)`,
  `create index if not exists idx_places_tenant_role on places (tenant_id, store_role)`,
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    for (const statement of statements) {
      await dbQuery(statement);
    }

    return res.status(200).json({
      ok: true,
      message: "multi-tenant places schema initialized",
      statements: statements.length,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "db_init_failed",
      message: error.message,
    });
  }
}
