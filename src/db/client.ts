import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

/**
 * Com DATABASE_URL (Neon) usa o driver HTTP serverless.
 * Sem ela, em desenvolvimento, usa um Postgres embutido (PGlite) salvo em ./.pglite.
 */
export async function createDb(url = process.env.DATABASE_URL): Promise<Db> {
  if (url) return drizzleNeon(url, { schema });

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PGLITE) {
    throw new Error("DATABASE_URL não configurada");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(process.env.PGLITE_DIR ?? "./.pglite");
  return drizzle(client, { schema }) as unknown as Db;
}
