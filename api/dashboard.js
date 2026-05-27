import { readOperationalCards } from "../lib/gmb/operationalCards.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    const result = await readOperationalCards(req.query || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error("dashboard failed", error);

    return res.status(400).json({
      ok: false,
      error: error.message || "dashboard_failed",
    });
  }
}
