const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export async function redisGet(key) {
  const data = await redisCommand(["GET", key]);
  return data.result ? JSON.parse(data.result) : null;
}

export async function redisSet(key, value) {
  return redisCommand(["SET", key, JSON.stringify(value)]);
}

export async function redisHset(key, field, value) {
  return redisCommand(["HSET", key, field, JSON.stringify(value)]);
}

export async function redisHlen(key) {
  const data = await redisCommand(["HLEN", key]);
  return Number(data.result || 0);
}

async function redisCommand(command) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("missing_upstash_env");
  }

  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  if (!res.ok) {
    throw new Error(`upstash_failed:${res.status}`);
  }

  return res.json();
}
