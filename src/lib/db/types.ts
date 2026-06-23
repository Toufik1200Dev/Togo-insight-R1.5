// Storage-agnostic record shapes + the DataStore interface.
// Two implementations exist: Prisma (Azure SQL) and a JSON file store (keyless local dev).

export interface UserRecord {
  id: string;
  firstName: string;
  lastName: string;
  country: string | null;
  phone: string | null;
  email: string;
  password: string | null;
  provider: string;
  entraOid: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileRecord {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileToken: string;
  fileReference: string;
  fileType: string;
  azurePath: string | null;
  isReady: boolean;
  uploadedAt: Date;
}

export interface ContactRecord {
  id: string;
  name: string;
  email: string;
  message: string;
  date: Date;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  country?: string | null;
  phone?: string | null;
  email: string;
  password?: string | null;
  provider?: string;
  entraOid?: string | null;
  image?: string | null;
}

export interface CreateFileInput {
  userId: string;
  fileName: string;
  originalName: string;
  fileReference: string;
  fileType: string;
  azurePath?: string | null;
  isReady?: boolean;
  fileToken?: string;
}

export interface DataStore {
  backend: "prisma" | "json";

  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserById(id: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  updateUser(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null>;

  listFilesByUser(userId: string): Promise<FileRecord[]>;
  listFilesByUserAndReference(userId: string, reference: string): Promise<FileRecord[]>;
  getFileById(id: string): Promise<FileRecord | null>;
  getFileByToken(token: string): Promise<FileRecord | null>;
  createFile(input: CreateFileInput): Promise<FileRecord>;
  updateFile(id: string, patch: Partial<FileRecord>): Promise<FileRecord | null>;
  deleteFile(id: string): Promise<void>;

  createContact(input: { name: string; email: string; message: string }): Promise<ContactRecord>;
}
