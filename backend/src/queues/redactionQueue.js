import { Queue } from "bullmq";
import { redis, isRedisReady } from "../config/redis.js";

const IN_MEMORY_QUEUE = [];
let IN_PROCESS_WORKER_STARTED = false;
let redactionQueue = null;

async function getBullQueue() {
  if (redactionQueue) return redactionQueue;
  if (!isRedisReady()) return null;

  redactionQueue = new Queue("docx-redaction", {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
  return redactionQueue;
}

export async function addJob(name, data, options = {}) {
  const queue = await getBullQueue();
  if (queue) {
    try {
      return await queue.add(name, data, options);
    } catch (err) {
      console.warn("[Queue] BullMQ add failed, falling back to in-process:", err.message);
    }
  }
  return await enqueueInProcess(name, data, options);
}

async function enqueueInProcess(name, data, options) {
  IN_MEMORY_QUEUE.push({ name, data, options });
  if (!IN_PROCESS_WORKER_STARTED) {
    IN_PROCESS_WORKER_STARTED = true;
    startInProcessWorker();
  }
  return { id: "inproc_" + Date.now(), data };
}

function startInProcessWorker() {
  const processNext = async () => {
    if (IN_MEMORY_QUEUE.length === 0) {
      setTimeout(processNext, 500);
      return;
    }
    const job = IN_MEMORY_QUEUE.shift();
    try {
      const { processJobInline } = await import("../workers/redactionWorker.js");
      if (processJobInline) {
        await processJobInline(job.data);
      }
    } catch (err) {
      console.error("[InProcessWorker] Job failed:", err.message);
    }
    setImmediate(processNext);
  };
  processNext();
}
