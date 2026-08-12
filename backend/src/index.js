import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectMongo } from "./config/db.js";

const port = process.env.PORT || 5000;

async function start() {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });

  connectMongo().catch((error) => {
    console.warn("MongoDB connection failed; continuing in fallback mode:", error.message);
  });
}

start().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
