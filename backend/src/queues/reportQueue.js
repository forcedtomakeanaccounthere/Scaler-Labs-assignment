import { Queue } from "bullmq";

import { redis } from "../config/redis.js";

export const reportQueue = new Queue("report-generation", {
  connection: redis,
});
