import { getPrisma } from "@/lib/prisma";
import type { CreateFileInput, CreateUserInput, DataStore } from "./types";

/** Prisma-backed store (Azure SQL). Used when DATABASE_URL is configured. */
export function createPrismaStore(): DataStore {
  return {
    backend: "prisma",

    getUserByEmail: (email) => getPrisma().user.findUnique({ where: { email: email.toLowerCase() } }),
    getUserById: (id) => getPrisma().user.findUnique({ where: { id } }),

    createUser: (input: CreateUserInput) =>
      getPrisma().user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          country: input.country ?? null,
          phone: input.phone ?? null,
          email: input.email.toLowerCase(),
          password: input.password ?? null,
          provider: input.provider ?? "credentials",
          entraOid: input.entraOid ?? null,
          image: input.image ?? null,
        },
      }),

    updateUser: (id, patch) => getPrisma().user.update({ where: { id }, data: patch }),

    listFilesByUser: (userId) =>
      getPrisma().file.findMany({ where: { userId }, orderBy: { uploadedAt: "desc" } }),

    listFilesByUserAndReference: (userId, reference) =>
      getPrisma().file.findMany({
        where: { userId, fileReference: reference },
        orderBy: { uploadedAt: "desc" },
      }),

    getFileById: (id) => getPrisma().file.findUnique({ where: { id } }),
    getFileByToken: (token) => getPrisma().file.findUnique({ where: { fileToken: token } }),

    createFile: (input: CreateFileInput) =>
      getPrisma().file.create({
        data: {
          userId: input.userId,
          fileName: input.fileName,
          originalName: input.originalName,
          fileReference: input.fileReference,
          fileType: input.fileType,
          azurePath: input.azurePath ?? null,
          isReady: input.isReady ?? false,
          ...(input.fileToken ? { fileToken: input.fileToken } : {}),
        },
      }),

    updateFile: (id, patch) => getPrisma().file.update({ where: { id }, data: patch }),
    deleteFile: async (id) => {
      await getPrisma().file.delete({ where: { id } });
    },

    createContact: (input) => getPrisma().contact.create({ data: input }),
  };
}
