import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchSheetRows } from "../../lib/sheetCsv.js";

const BATCH_SIZE = 25;

export default async function handler(req, res) {
  try {
    const offset = Number(req.query.offset || 0);
    const [schema, catalogs, rows] = await Promise.all([
      readJson("config/classification_schema.json"),
      readJson("config/catalogs.json"),
      fetchSheetRows()
    ]);

    const batch = rows
      .slice(offset, offset + BATCH_SIZE)
      .map((row) => ({
        place_id: row.place_id || "",
        name: row.name || row.displayname || "",
        address: row.address || row.formattedaddress || "",
        types: row.types || "",
        query_origin: row.query_origin || ""
      }));

    return res.status(200).json({
      ok: true,
      offset,
      next_offset: offset + batch.length,
      batch_size: batch.length,
      schema,
      catalogs,
      rows: batch
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}

async function readJson(path) {
  const fullPath = join(process.cwd(), path);
  const content = await readFile(fullPath, "utf8");
  return JSON.parse(content);
}
