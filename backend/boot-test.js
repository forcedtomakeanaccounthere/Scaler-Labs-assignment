import dotenv from "dotenv";
dotenv.config();

console.log("=== Boot sequence test (same order as index.js) ===");

try {
  console.log("[1] Importing app.js (same as index.js)...");
  const app = (await import("./src/app.js")).default;
  console.log("    OK: app imported");

  // Check what routes are registered on app
  console.log("\n[App stack layers]:");
  const stack = app._router?.stack || app.stack || [];
  stack.forEach((layer, i) => {
    if (layer.route) {
      console.log(`  [${i}] ${Object.keys(layer.route.methods).join(",").toUpperCase()} ${layer.route.path}`);
    } else if (layer.name === "router" || layer.handle?.name === "router") {
      const regexpStr = layer.regexp?.toString() || "";
      const matchPath = regexpStr.includes("api") ? "/api" : "";
      console.log(`  [${i}] ROUTER${matchPath} (${layer.handle?.name || "router"})`);
      // Check inner layers
      const innerStack = layer.handle?.stack;
      if (innerStack) {
        innerStack.forEach((inner, j) => {
          if (inner.route) {
            console.log(`    [${i}.${j}] ${Object.keys(inner.route.methods).join(",").toUpperCase()} ${inner.route.path}`);
          } else if (inner.name === "router" || inner.handle?.name === "router") {
            const innerRegexp = inner.regexp?.toString() || "";
            let prefix = "";
            if (innerRegexp.includes("auth")) prefix = "/auth";
            else if (innerRegexp.includes("jobs")) prefix = "/jobs";
            console.log(`    [${i}.${j}] NESTED ROUTER${prefix}`);
            const inner2Stack = inner.handle?.stack;
            if (inner2Stack) {
              inner2Stack.forEach((inner2, k) => {
                if (inner2.route) {
                  console.log(`      [${i}.${j}.${k}] ${Object.keys(inner2.route.methods).join(",").toUpperCase()} ${inner2.route.path}`);
                }
              });
            }
          }
        });
      }
    } else {
      console.log(`  [${i}] middleware: ${layer.name || layer.handle?.name || "anonymous"} (regexp: ${layer.regexp?.toString()?.slice(0, 80) || "?"})`);
    }
  });

} catch (e) {
  console.error("FAIL:", e.message);
  console.error("Stack:", e.stack);
}

console.log("\n=== Test done ===");
process.exit(0);
