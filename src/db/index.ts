import "server-only";
import { createDb, type Db } from "./client";

const globalForDb = globalThis as unknown as { dbPromise?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.dbPromise ??= createDb();
  return globalForDb.dbPromise;
}

export * from "./schema";
