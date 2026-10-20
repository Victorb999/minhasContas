import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { createDb } from "../src/db/client";
import { categories } from "../src/db/schema";
import { DEFAULT_CATEGORIES } from "../src/db/default-categories";

async function main() {
  const db = await createDb();
  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })))
    .onConflictDoNothing();
  const all = await db.select().from(categories);
  console.log(`Categorias no banco: ${all.length}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
