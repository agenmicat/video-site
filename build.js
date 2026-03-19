import { execSync } from "child_process";

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

try {
  console.log("🚀 START BUILD\n");

  // generate thumbnail
  run("node generate-thumb.js");

  // generate data.json
  run("node generate.js");

  console.log("\n✅ BUILD DONE");
} catch (err) {
  console.error("\n❌ BUILD FAILED");
}