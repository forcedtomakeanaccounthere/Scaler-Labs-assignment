import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let errorLogged = false;

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  reconnectOnError: () => false,
  retryStrategy: () => null,
});

redis.on("error", (err) => {
  if (!errorLogged) {
    console.warn(
      "[Redis] Connection error — queue operations will fall back to in-process:",
      err.message.split("\n")[0]
    );
    errorLogged = true;
  }
});

/** Attempt to connect to Redis. Returns true if ready, false otherwise. */
export async function connectRedis() {
  if (redis.status === "ready") return true;

  try {
    await redis.connect();
    await new Promise((resolve, reject) => {
      if (redis.status === "ready") return resolve();
      const timeout = setTimeout(() => reject(new Error("Redis connection timeout")), 4000);
      const onReady = () => {
        clearTimeout(timeout);
        redis.off("error", onError);
        resolve();
      };
      const onError = (err) => {
        clearTimeout(timeout);
        redis.off("ready", onReady);
        reject(err);
      };
      redis.once("ready", onReady);
      redis.once("error", onError);
    });
    console.log("[Redis] Connected — BullMQ queue enabled");
    return true;
  } catch {
    if (!errorLogged) {
      console.warn("[Redis] Could not connect — running without BullMQ queue (fallback mode)");
      errorLogged = true;
    }
    try {
      redis.disconnect();
    } catch {
      /* ignore */
    }
    return false;
  }
}

export function isRedisReady() {
  return redis.status === "ready";
}
