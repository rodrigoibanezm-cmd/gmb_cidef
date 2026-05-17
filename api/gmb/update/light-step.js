import lightHandler from "./light.js";

export default async function handler(req, res) {
  req.query.limit = req.query.limit || "25";
  req.query.max_batches = req.query.max_batches || "2";
  return lightHandler(req, res);
}
