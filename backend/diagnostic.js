import dotenv from "dotenv";
dotenv.config();

console.log("=== Starting diagnostic ===");

try {
  console.log("[1] Importing express...");
  const express = await import("express");
  console.log("    OK: express imported");
} catch (e) {
  console.error("    FAIL: express import:", e.message);
  process.exit(1);
}

try {
  console.log("[2] Importing routes/health.js...");
  const healthRouter = (await import("./src/routes/health.js")).default;
  console.log("    OK: health router imported, stack length:", healthRouter.stack?.length || 0);
} catch (e) {
  console.error("    FAIL: health import:", e.message, e.stack);
}

try {
  console.log("[3] Importing routes/auth.js...");
  const authRouter = (await import("./src/routes/auth.js")).default;
  console.log("    OK: auth router imported, stack length:", authRouter.stack?.length || 0);
} catch (e) {
  console.error("    FAIL: auth import:", e.message, e.stack);
}

try {
  console.log("[4] Importing routes/jobs.js...");
  const jobsModule = await import("./src/routes/jobs.js");
  const jobsRouter = jobsModule.default;
  console.log("    OK: jobs router imported");
  console.log("    Router stack:", jobsRouter.stack?.length || 0);
  if (jobsRouter.stack) {
    jobsRouter.stack.forEach((layer, i) => {
      const route = layer.route;
      if (route) {
        console.log(`      [${i}] ${Object.keys(route.methods).join(",").toUpperCase()} ${route.path}`);
      } else {
        console.log(`      [${i}] middleware: ${layer.name || "anonymous"}`);
      }
    });
  }
} catch (e) {
  console.error("    FAIL: jobs import:", e.message);
  console.error("    Stack:", e.stack);
}

try {
  console.log("[5] Importing routes/index.js...");
  const mainRouter = (await import("./src/routes/index.js")).default;
  console.log("    OK: main router imported, stack length:", mainRouter.stack?.length || 0);
  if (mainRouter.stack) {
    mainRouter.stack.forEach((layer, i) => {
      console.log(`      [${i}] path="${layer.regexp}" -> ${layer.handle?.name || "Router"}`);
    });
  }
} catch (e) {
  console.error("    FAIL: routes/index import:", e.message);
  console.error("    Stack:", e.stack);
}

console.log("=== Diagnostic complete ===");
