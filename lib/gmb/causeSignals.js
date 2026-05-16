const TOPICS = [
  {
    issue_type: "atencion",
    keywords: ["atencion", "atención", "trato", "atienden", "atendio", "atendió", "vendedor", "ejecutivo", "servicio"],
  },
  {
    issue_type: "demora",
    keywords: ["demora", "demoraron", "tarde", "espera", "esperando", "plazo", "retraso"],
  },
  {
    issue_type: "postventa",
    keywords: ["postventa", "mantencion", "mantención", "garantia", "garantía", "servicio tecnico", "servicio técnico", "taller"],
  },
  {
    issue_type: "precio",
    keywords: ["precio", "caro", "cobro", "cobraron", "valor", "descuento"],
  },
  {
    issue_type: "stock",
    keywords: ["stock", "disponible", "disponibilidad", "repuesto", "repuestos"],
  },
  {
    issue_type: "producto",
    keywords: ["producto", "auto", "vehiculo", "vehículo", "camioneta", "falla", "fallo", "defecto"],
  },
];

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function detectTopic(text) {
  const normalized = normalizeText(text);

  for (const topic of TOPICS) {
    if (topic.keywords.some((keyword) => normalized.includes(keyword))) {
      return topic.issue_type;
    }
  }

  return "otro";
}

function collectEvidence(rows) {
  const evidence = [];

  for (const row of rows) {
    for (const review of row.evidence || []) {
      evidence.push({
        location: row.location,
        place_id: review.place_id || row.owned?.place_id || null,
        rating: review.rating ?? null,
        text: review.text || "",
        author: review.author || null,
        review_date: review.review_date || null,
      });
    }
  }

  return evidence;
}

function isNegative(review) {
  return Number(review.rating || 0) > 0 && Number(review.rating || 0) <= 3;
}

function countByTopic(reviews) {
  const counts = {};

  for (const review of reviews) {
    const issueType = detectTopic(review.text);
    counts[issueType] = (counts[issueType] || 0) + 1;
    review.issue_type = issueType;
  }

  return counts;
}

function topIssue(counts) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function detectCauseSignals(rows = []) {
  const allEvidence = collectEvidence(rows);
  const negativeEvidence = allEvidence.filter(isNegative);
  const evidenceUsed = negativeEvidence.length ? negativeEvidence : allEvidence;
  const topic_counts = countByTopic(evidenceUsed);
  const top_issue = topIssue(topic_counts);

  return {
    issue_detected: Boolean(top_issue && top_issue !== "otro"),
    top_issue,
    topic_counts,
    evidence_count: evidenceUsed.length,
    negative_evidence_count: negativeEvidence.length,
    evidence: evidenceUsed,
  };
}
