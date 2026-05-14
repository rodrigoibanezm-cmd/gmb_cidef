import { gmbCaptureKeys } from "./keys.js";
import { redisCommand } from "./redis.js";

export async function getPlaceIdsFromClassifiedHash() {
  const result = await redisCommand(["HKEYS", gmbCaptureKeys.classifiedHash]);

  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") return Object.keys(result);

  return [];
}
