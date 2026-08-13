import fs from "fs";
import FormData from "form-data";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filePath = path.join(__dirname, "test-pii-sample.docx");
const form = new FormData();
form.append("file", fs.createReadStream(filePath), {
  filename: "test-pii-sample.docx",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});
form.append("policy", JSON.stringify({
  EMAIL: "MASK",
  PHONE_IN: "MASK",
  CREDIT_CARD: "MASK",
  AADHAAR: "PSEUDONYMIZE",
  PAN: "MASK",
  DOB: "GENERALIZE",
  PERSON: "PSEUDONYMIZE",
  SSN: "MASK",
  IP_V4: "MASK",
}));
form.append("defaultAction", "MASK");

const API_URL = "http://localhost:5000/api/jobs";

console.log("Uploading to:", API_URL);
try {
  const response = await axios.post(API_URL, form, {
    headers: form.getHeaders(),
    timeout: 30000,
    maxContentLength: Infinity,
  });
  console.log("\n✅ Upload successful!");
  console.log("Status:", response.status);
  console.log("Response data:", JSON.stringify(response.data, null, 2));
  const jobId = response.data.job?._id;
  if (jobId) {
    console.log("\nℹ️  Job ID:", jobId);
    console.log(`ℹ️  Check progress: SSE on GET /api/jobs/${jobId}/progress`);
    console.log(`ℹ️  Check job:      GET /api/jobs/${jobId}`);
  }
} catch (err) {
  console.log("\n❌ Upload FAILED");
  console.log("Status:", err.response?.status);
  console.log("Data:", err.response?.data || err.message);
  if (err.stack) console.log("Stack:", err.stack);
}
