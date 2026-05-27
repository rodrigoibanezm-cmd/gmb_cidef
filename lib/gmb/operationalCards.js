import { dbQuery } from "./postgres.js";

const SECTION_ORDER = ["urgente", "tareas", "importante"];
const MAX_CARDS = 12;

function normalizeTenantId(value) {
  const tenantId = String(value || "").trim().toLowerCase();

  if (!tenantId) {
    throw new Error("tenant_id_required");
  }

  if (tenantId === "autos") {
    return "cidef";
  }

  return tenantId;
}

function normalizeDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

function emptySections() {
  return SECTION_ORDER.map((id) => ({ id, cards: [] }));
}

function groupIntoSections(cards) {
  const sections = emptySections();
  const byId = new Map(sections.map((section) => [section.id, section]));

  for (const card of cards) {
    const section = byId.get(card.section);
    if (section) section.cards.push(card);
  }

  return sections;
}

function shapeCard(row) {
  return {
    id: row.id,
    section: row.section,
    type: row.type,
    scope: row.scope,
    status: row.status,
    color_key: row.color_key,
    icon_key: row.icon_key,
    headline: row.headline,
    why_it_matters: row.why_it_matters,
    suggested_action: row.suggested_action,
    evidence: row.evidence_json || [],
    children: row.children_json || [],
    priority_order: row.priority_order,
    agent_context: row.agent_context || {},
  };
}

export async function readOperationalCards(input = {}) {
  const tenantId = normalizeTenantId(input.tenant_id || input.tenant);
  const date = normalizeDate(input.date);

  const rows = await dbQuery(
    `
    select
      id,
      tenant_id,
      card_date,
      section,
      type,
      scope,
      status,
      color_key,
      icon_key,
      headline,
      why_it_matters,
      suggested_action,
      evidence_json,
      children_json,
      agent_context,
      priority_order
    from operational_cards
    where tenant_id = $1
      and card_date = $2
    order by priority_order asc
    limit ${MAX_CARDS}
    `,
    [tenantId, date]
  );

  const cards = rows.map(shapeCard);

  return {
    ok: true,
    tenant_id: tenantId,
    date,
    max_cards: MAX_CARDS,
    card_count: cards.length,
    sections: groupIntoSections(cards),
  };
}
