import { execSync } from "child_process";

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function getCommitMessage() {
  const args = process.argv.slice(2).join(" ").trim();
  return args || "update media library";
}

try {
  const message = getCommitMessage();

  console.log("🚀 START RELEASE");

  run("node generate-thumb.js");
  run("node upload-r2.js");
  run("node generate.js");
  run("git add .");

  try {
    run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
  } catch {
    console.log("\nℹ Tidak ada perubahan untuk di-commit.");
  }

  run("git push origin main");

  console.log("\n✅ RELEASE DONE");
} catch (err) {
  console.error("\n❌ RELEASE FAILED");
  process.exit(1);
}