import mongoose from "mongoose";

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("MONGODB_URI is not defined; skipping MongoDB connection");
    return null;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // 2.5s fast timeout if local MongoDB service is inactive
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.warn("MongoDB not active on localhost; running in-memory session mode:", err.message);
  }
}
