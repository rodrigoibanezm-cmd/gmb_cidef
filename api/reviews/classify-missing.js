const OPS_BASE = "https://gmb-cidef-ops.vercel.app";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const target = `${OPS_BASE}/api/reviews/classify-missing${url.search}`;

  try {
    const response = await fetch(target, {
      method: req.method,
      headers: {
        "content-type": req.headers["content-type"] || "application/json",
      },
      body: req.method === "POST" ? JSON.stringify(req.body || {}) : undefined,
    });

    const text = await response.text();
    res.status(response.status);
    res.setHeader("content-type", response.headers.get("content-type") || "application/json");
    return res.send(text);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "review_classification_proxy_failed",
      message: error.message,
    });
  }
}
