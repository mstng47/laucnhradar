// Runs the full pipeline: collect -> summarize.
// This is the script your daily GitHub Action will eventually call.

import { main as collect } from "./collect.mjs";
import { main as summarize } from "./summarize.mjs";

async function run() {
  console.log("Step 1/2: collecting...");
  await collect();

  console.log("Step 2/2: summarizing...");
  await summarize();

  console.log("Done. See output/latest.json");
}

run().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
