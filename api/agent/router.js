import { routeAgentIntent } from "../../lib/gmb/agentRouter.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const result = await routeAgentIntent(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error("agent router failed", error);

    return res.status(400).json({
      ok: false,
      error: error.message || "agent_router_failed",
    });
  }
}
