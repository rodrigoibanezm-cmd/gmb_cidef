import { redisCommand } from "../../../lib/gmb/redis.js";
import { dbQuery } from "../../../lib/gmb/postgres.js";

const HASH_KEY = "gmb:classified:v1";
const TENANT_ID = "cidef";

function parseEntries(result) {
  const entries = [];

  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) {
      entries.push({
        field: result[i],
        value: result[i + 1],
      });
    }
  }

  return entries;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const result = await redisCommand(["HGETALL", HASH_KEY]);
    const entries = parseEntries(result);

    let inserted = 0;
    let failed = 0;
    const errors = [];

    for (const entry of entries) {
      try {
        const item = JSON.parse(entry.value);

        if (!item.place_id) continue;

        await dbQuery(
          `
          insert into places (
            tenant_id,
            place_id,
            name,
            brand,
            normalized_location,
            operator,
            ownership_group,
            store_role,
            status,
            address,
            raw,
            updated_at
          )
          values (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now()
          )
          on conflict (tenant_id, place_id)
          do update set
            name = excluded.name,
            brand = excluded.brand,
            normalized_location = excluded.normalized_location,
            operator = excluded.operator,
            ownership_group = excluded.ownership_group,
            store_role = excluded.store_role,
            status = excluded.status,
            address = excluded.address,
            raw = excluded.raw,
            updated_at = now()
          `,
          [
            TENANT_ID,
            item.place_id,
            item.name || null,
            item.brand || null,
            item.normalized_location || null,
            item.operator || null,
            item.ownership_group || null,
            item.store_role || null,
            item.status || null,
            item.address || null,
            JSON.stringify(item),
          ]
        );

        inserted += 1;
      } catch (error) {
        failed += 1;
        errors.push({
          field: entry.field,
          message: error.message,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      tenant_id: TENANT_ID,
      hash: HASH_KEY,
      total: entries.length,
      inserted,
      failed,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "migration_failed",
      message: error.message,
    });
  }
}
