import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { appConfig } from "./config/app.js";
import { connectMongo } from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { startBullMQWorker } from "./workers/redactionWorker.js";

async function start() {
  const redisOk = await connectRedis();
  if (redisOk) {
    const worker = await startBullMQWorker();
    console.log(`Redaction worker started: ${worker?.name || "docx-redaction"}`);
  } else {
    console.log("Redaction worker: in-process fallback mode (no Redis)");
  }

  app.listen(appConfig.port, () => {
    console.log(`RedactIQ backend listening on port ${appConfig.port}`);
    console.log(`API URL: ${appConfig.backendUrl}`);
  });

  connectMongo().catch((error) => {
    console.warn("MongoDB connection failed; continuing in fallback mode:", error.message);
  });
}

start().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
