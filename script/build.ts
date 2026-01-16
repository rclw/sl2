import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building static client...");
  await viteBuild();
  
  console.log("✓ Static site built successfully!");
  console.log("To serve locally, run: npm start");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
