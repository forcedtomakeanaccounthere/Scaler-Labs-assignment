import dotenv from "dotenv";
dotenv.config();

async function main() {
  const { default: app } = await import("./app.js");
  const { appConfig } = await import("./config/app.js");
  const { connectMongo } = await import("./config/db.js");
  const { connectRedis } = await import("./config/redis.js");
  const { startBullMQWorker } = await import("./workers/redactionWorker.js");

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

main().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
