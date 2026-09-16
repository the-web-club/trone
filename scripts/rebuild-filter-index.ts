import { rebuildFilterFacets } from "@/lib/filters/rebuild";

async function main() {
  const result = await rebuildFilterFacets();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
