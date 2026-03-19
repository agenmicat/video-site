import { execSync } from "child_process";

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

try {
  console.log("🚀 START PUBLISH");

  run("node upload-r2.js");
  run("node generate.js");

  console.log("\n✅ PUBLISH DONE");
} catch (err) {
  console.error("\n❌ PUBLISH FAILED");
  process.exit(1);
}