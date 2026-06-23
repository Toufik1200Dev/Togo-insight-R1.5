import type { DataStore } from "./types";
import { createJsonStore } from "./json";
import { createPrismaStore } from "./prisma";

let store: DataStore | null = null;

/**
 * Returns the active data store:
 *  - Prisma / Azure SQL when DATABASE_URL is set
 *  - JSON file store (.data/db.json) otherwise — keyless local dev
 *
 * The Prisma client is only instantiated when actually used, so JSON mode
 * never needs a database.
 */
export function getStore(): DataStore {
  if (store) return store;
  const hasDb = !!process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "";
  store = hasDb ? createPrismaStore() : createJsonStore();
  return store;
}

export function isUsingDatabase(): boolean {
  return !!process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "";
}

export * from "./types";
