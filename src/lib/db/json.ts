import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type {
  ContactRecord,
  CreateFileInput,
  CreateUserInput,
  DataStore,
  FileRecord,
  UserRecord,
} from "./types";

/**
 * Zero-dependency JSON file store for keyless local development.
 * Data persists to .data/db.json across restarts. Not for production.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DbShape {
  users: UserRecord[];
  files: FileRecord[];
  contacts: ContactRecord[];
}

let cache: DbShape | null = null;
let loading: Promise<DbShape> | null = null;
let writeChain: Promise<void> = Promise.resolve();

function reviveDates(db: Partial<DbShape>): DbShape {
  const users = (db.users ?? []).map((u) => ({
    ...u,
    createdAt: new Date(u.createdAt),
    updatedAt: new Date(u.updatedAt),
  }));
  const files = (db.files ?? []).map((f) => ({ ...f, uploadedAt: new Date(f.uploadedAt) }));
  const contacts = (db.contacts ?? []).map((c) => ({ ...c, date: new Date(c.date) }));
  return { users, files, contacts };
}

/** Seed a demo account on first run so local mode is usable immediately. */
async function seedDemo(db: DbShape): Promise<void> {
  const bcrypt = (await import("bcryptjs")).default;
  const now = new Date();
  db.users.push({
    id: crypto.randomUUID(),
    firstName: "Demo",
    lastName: "User",
    country: "Togo",
    phone: null,
    email: "demo@togoinsight.local",
    password: await bcrypt.hash("demo1234", 10),
    provider: "credentials",
    entraOid: null,
    image: null,
    createdAt: now,
    updatedAt: now,
  });
}

async function load(): Promise<DbShape> {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      let parsed: Partial<DbShape> | null = null;
      try {
        parsed = JSON.parse(await fs.readFile(DB_FILE, "utf8"));
      } catch {
        parsed = null;
      }
      if (parsed) {
        cache = reviveDates(parsed);
      } else {
        // Fresh local database — seed a demo user and write the file.
        cache = { users: [], files: [], contacts: [] };
        await seedDemo(cache);
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), "utf8");
      }
      return cache;
    })();
  }
  return loading;
}

async function persist(): Promise<void> {
  writeChain = writeChain.then(async () => {
    if (!cache) return;
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), "utf8");
  });
  return writeChain;
}

export function createJsonStore(): DataStore {
  return {
    backend: "json",

    async getUserByEmail(email) {
      const db = await load();
      const e = email.toLowerCase();
      return db.users.find((u) => u.email.toLowerCase() === e) ?? null;
    },

    async getUserById(id) {
      const db = await load();
      return db.users.find((u) => u.id === id) ?? null;
    },

    async createUser(input: CreateUserInput) {
      const db = await load();
      const now = new Date();
      const user: UserRecord = {
        id: crypto.randomUUID(),
        firstName: input.firstName,
        lastName: input.lastName,
        country: input.country ?? null,
        phone: input.phone ?? null,
        email: input.email.toLowerCase(),
        password: input.password ?? null,
        provider: input.provider ?? "credentials",
        entraOid: input.entraOid ?? null,
        image: input.image ?? null,
        createdAt: now,
        updatedAt: now,
      };
      db.users.push(user);
      await persist();
      return user;
    },

    async updateUser(id, patch) {
      const db = await load();
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      Object.assign(u, patch, { updatedAt: new Date() });
      await persist();
      return u;
    },

    async listFilesByUser(userId) {
      const db = await load();
      return db.files
        .filter((f) => f.userId === userId)
        .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
    },

    async listFilesByUserAndReference(userId, reference) {
      const db = await load();
      return db.files
        .filter((f) => f.userId === userId && f.fileReference === reference)
        .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
    },

    async getFileById(id) {
      const db = await load();
      return db.files.find((f) => f.id === id) ?? null;
    },

    async getFileByToken(token) {
      const db = await load();
      return db.files.find((f) => f.fileToken === token) ?? null;
    },

    async createFile(input: CreateFileInput) {
      const db = await load();
      const file: FileRecord = {
        id: crypto.randomUUID(),
        userId: input.userId,
        fileName: input.fileName,
        originalName: input.originalName,
        fileToken: input.fileToken ?? crypto.randomUUID(),
        fileReference: input.fileReference,
        fileType: input.fileType,
        azurePath: input.azurePath ?? null,
        isReady: input.isReady ?? false,
        uploadedAt: new Date(),
      };
      db.files.push(file);
      await persist();
      return file;
    },

    async updateFile(id, patch) {
      const db = await load();
      const f = db.files.find((x) => x.id === id);
      if (!f) return null;
      Object.assign(f, patch);
      await persist();
      return f;
    },

    async deleteFile(id) {
      const db = await load();
      const i = db.files.findIndex((f) => f.id === id);
      if (i >= 0) {
        db.files.splice(i, 1);
        await persist();
      }
    },

    async createContact(input) {
      const db = await load();
      const contact: ContactRecord = {
        id: crypto.randomUUID(),
        name: input.name,
        email: input.email,
        message: input.message,
        date: new Date(),
      };
      db.contacts.push(contact);
      await persist();
      return contact;
    },
  };
}
