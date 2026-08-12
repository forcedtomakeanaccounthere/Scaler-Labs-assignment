import { Worker } from "bullmq";

import { redis } from "../config/redis.js";

export const reportWorker = new Worker(
  "report-generation",
  async (job) => {
    console.log("Processing report job", job.id, job.data);
    return { processed: true };
  },
  {
    connection: redis,
  }
);
