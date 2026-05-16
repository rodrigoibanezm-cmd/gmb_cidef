function actionForLowConfidence(row) {
  return {
    priority: "baja",
    reason: "La ubicación tiene baja confianza estadística por bajo volumen de reviews.",
    action: "Pedir más reviews antes de declarar un problema reputacional.",
  };
}

function actionForHighRisk(row) {
  return {
    priority: "alta",
    reason: "Gap alto contra el líder local o rating propio bajo.",
    action: "Priorizar intervención reputacional y revisar la experiencia comercial en esta ubicación.",
  };
}

function actionForMediumRisk(row) {
  return {
    priority: "media",
    reason: "Existe brecha relevante contra el líder local.",
    action: "Monitorear la ubicación y levantar evidencia operativa antes de intervenir fuerte.",
  };
}

function actionForLowRisk(row) {
  return {
    priority: "baja",
    reason: "No hay una brecha reputacional fuerte con la información disponible.",
    action: "Mantener seguimiento y reforzar captura de reviews.",
  };
}

function classifyRow(row) {
  const owned = row.owned || {};
  const confidence = owned.confidence || null;
  const gap = Number(owned.gap_vs_top || 0);
  const rating = Number(owned.rating || 0);

  if (confidence === "baja") return actionForLowConfidence(row);
  if (gap >= 1.5 || rating < 3) return actionForHighRisk(row);
  if (gap >= 1) return actionForMediumRisk(row);
  return actionForLowRisk(row);
}

function priorityScore(priority) {
  if (priority === "alta") return 3;
  if (priority === "media") return 2;
  return 1;
}

function riskScore(item) {
  const owned = item.row.owned || {};
  return priorityScore(item.priority) * 1000 + Number(owned.gap_vs_top || 0) * 100 + Number(owned.reviews || 0) / 1000;
}

export function applyActionPolicy(rows = []) {
  const actions = rows.map((row) => {
    const decision = classifyRow(row);

    return {
      location: row.location,
      priority: decision.priority,
      reason: decision.reason,
      action: decision.action,
      metrics: {
        rating: row.owned?.rating ?? null,
        reviews: row.owned?.reviews ?? null,
        confidence: row.owned?.confidence ?? null,
        gap_vs_top: row.owned?.gap_vs_top ?? null,
        position: row.owned?.position ?? null,
      },
      row,
    };
  });

  actions.sort((a, b) => riskScore(b) - riskScore(a));

  return {
    recommended: actions[0] || null,
    actions,
    count: actions.length,
  };
}
