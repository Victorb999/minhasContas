import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const url = process.env.DATABASE_URL;

export default url
  ? defineConfig({ dialect: "postgresql", schema: "./src/db/schema.ts", dbCredentials: { url } })
  : defineConfig({
      dialect: "postgresql",
      driver: "pglite",
      schema: "./src/db/schema.ts",
      dbCredentials: { url: process.env.PGLITE_DIR ?? "./.pglite" },
    });
