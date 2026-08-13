import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = "http://localhost:5000/api";

const email = `testuser_${Date.now()}@example.com`;
const password = "TestPass123!";
const name = "Test User";

console.log("=== Step 1: Register new user ===");
try {
  const reg = await axios.post(`${API}/auth/register`, {
    name, email, password,
  }, { timeout: 10000 });
  console.log("✅ Register OK:", reg.status);
  console.log("  Token received:", !!reg.data.token);
} catch (err) {
  if (err.response?.status === 409 || err.response?.data?.error?.includes("already")) {
    console.log("ℹ️  User already exists - proceeding to login");
  } else {
    console.log("❌ Register fail:", err.response?.status, err.response?.data || err.message);
  }
}

console.log("\n=== Step 2: Login ===");
const login = await axios.post(`${API}/auth/login`, { email, password }, { timeout: 10000 });
const TOKEN = login.data.token;
console.log("✅ Login OK, token len:", TOKEN.length, "user:", login.data.user.email);

console.log("\n=== Step 3: Batch upload 2 DOCX files ===");
const form = new FormData();
const docxPath = path.join(__dirname, "test-pii-sample.docx");
form.append("files", fs.createReadStream(docxPath), {
  filename: "batch-file-1.docx",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});
form.append("files", fs.createReadStream(docxPath), {
  filename: "batch-file-2.docx",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});
form.append("policy", JSON.stringify({ EMAIL: "MASK", CREDIT_CARD: "MASK" }));
form.append("defaultAction", "MASK");

const batch = await axios.post(`${API}/jobs/batch`, form, {
  headers: { ...form.getHeaders(), Authorization: `Bearer ${TOKEN}` },
  timeout: 60000,
  maxContentLength: Infinity,
});
console.log("✅ Batch upload OK:", batch.status, batch.data.message);
console.log("  Jobs created:", batch.data.jobs.length);
for (const j of batch.data.jobs) {
  console.log("  -", j.originalFilename, "| ID:", j._id, "| status:", j.status);
}

// Wait and poll job status
console.log("\n=== Step 4: Wait for both jobs to complete (up to 20s) ===");
const jobIds = batch.data.jobs.map(j => j._id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (let attempt = 0; attempt < 20; attempt++) {
  await sleep(1000);
  const statuses = await Promise.all(jobIds.map(id =>
    axios.get(`${API}/jobs/${id}`, { timeout: 5000 }).then(r => r.data.job.status, () => "err")
  ));
  const doneCount = statuses.filter(s => s === "completed" || s === "failed").length;
  process.stdout.write(`  [${attempt + 1}s] Statuses: ${statuses.join(", ")} (${doneCount}/${jobIds.length} done)\r`);
  if (doneCount === jobIds.length) {
    console.log("\n✅ All jobs completed!");
    break;
  }
}

// Final check results
console.log("\n=== Step 5: Final results ===");
for (const id of jobIds) {
  const r = await axios.get(`${API}/jobs/${id}`, { timeout: 5000 });
  const j = r.data.job;
  console.log(`  Job ${j.originalFilename}: status=${j.status}, entities=${j.entities?.length || 0}, hasOutput=${j.hasOutput}`);
}
console.log("\n🎉 Batch flow completed successfully!");
