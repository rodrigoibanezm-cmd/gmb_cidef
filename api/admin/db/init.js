import { dbQuery } from "../../../lib/gmb/postgres.js";

const statements = [
  `
  create table if not exists places (
    place_id text primary key,
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
    updated_at timestamptz not null default now()
  )
  `,
  `create index if not exists idx_places_brand on places (brand)`,
  `create index if not exists idx_places_location on places (normalized_location)`,
  `create index if not exists idx_places_status on places (status)`,
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
      message: "places schema initialized",
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
