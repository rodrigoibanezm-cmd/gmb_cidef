import { dbQuery } from "../../../lib/gmb/postgres.js";
import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const sqlPath = path.join(process.cwd(), "sql", "001_init_places.sql");
    const sql = await fs.readFile(sqlPath, "utf8");

    await dbQuery(sql);

    return res.status(200).json({
      ok: true,
      message: "places schema initialized",
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
