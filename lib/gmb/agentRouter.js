import { executeCompareQuery } from "./queryExecutor.js";
import { shapeAgentResult } from "./responseShape.js";

const ALLOWED_INTENTS = ["ranking", "gap", "temporal", "evidence", "action", "cause"];

function assertAllowedIntent(intent) {
  if (!ALLOWED_INTENTS.includes(intent)) {
    throw new Error("invalid_agent_intent");
  }
}

function withDefaultFilters(params, defaults) {
  return {
    ...params,
    filters: {
      ...defaults,
      ...(params.filters || {}),
    },
  };
}

function buildCompareInput(intent, params = {}) {
  let input = { ...params };

  if (intent === "ranking") {
    input = withDefaultFilters(input, { ownership_group: "own" });
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

  if (intent === "action") {
    input = withDefaultFilters(input, { ownership_group: "own" });
    input.scope = input.scope || "extra";
    input.metric = input.metric || "gap_vs_top";
  }

  if (intent === "cause") {
    input = withDefaultFilters(input, { ownership_group: "own" });
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
  const output = params.output || {};

  assertAllowedIntent(intent);

  const compareInput = buildCompareInput(intent, params);
  const result = await executeCompareQuery(compareInput);
  const shaped = shapeAgentResult(result, output.shape);

  return {
    ok: true,
    intent,
    engine: "compare_query",
    semantic_required: intent === "action" || intent === "cause",
    shape: shaped.shape,
    result: shaped.result,
  };
}
