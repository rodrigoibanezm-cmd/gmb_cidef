import { executeCompareQuery } from "./queryExecutor.js";

const ALLOWED_INTENTS = ["ranking", "gap", "temporal", "evidence"];

function assertAllowedIntent(intent) {
  if (!ALLOWED_INTENTS.includes(intent)) {
    throw new Error("invalid_agent_intent");
  }
}

function buildCompareInput(intent, params = {}) {
  const input = { ...params };

  if (intent === "ranking") {
    input.scope = input.scope || "intra";
    input.metric = input.metric || "rating";
  }

  if (intent === "gap") {
    input.scope = input.scope || "extra";
    input.metric = input.metric || "gap_vs_top";
  }

  if (intent === "temporal") {
    input.scope = "temporal";
    input.metric = input.metric || "delta_gap_vs_top";
  }

  if (intent === "evidence") {
    input.scope = input.scope || "extra";
    input.metric = input.metric || "gap_vs_top";
    input.output = {
      ...(input.output || {}),
      include_evidence: true,
    };
  }

  return input;
}

export async function routeAgentIntent(input = {}) {
  const intent = input.intent;
  const params = input.params || {};

  assertAllowedIntent(intent);

  const compareInput = buildCompareInput(intent, params);
  const result = await executeCompareQuery(compareInput);

  return {
    ok: true,
    intent,
    engine: "compare_query",
    result,
  };
}
