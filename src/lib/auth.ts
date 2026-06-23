import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getStore } from "@/lib/db";

/** True when Entra ID ("Login with Microsoft") env vars are present. */
export function isEntraConfigured(): boolean {
  return Boolean(
    process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID
  );
}

// Dev-only fallback so the app runs locally without setting NEXTAUTH_SECRET.
// In production, always set NEXTAUTH_SECRET (and it's provided via .env.development for local dev).
const SECRET = process.env.NEXTAUTH_SECRET || "dev-local-insecure-secret-change-in-production";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const user = await getStore().getUserByEmail(credentials.email.toLowerCase());
      if (!user || !user.password) return null;
      const valid = await bcrypt.compare(credentials.password, user.password);
      if (!valid) return null;
      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        image: user.image ?? null,
      };
    },
  }),
];

// Only register Microsoft login when it's actually configured.
if (isEntraConfigured()) {
  providers.unshift(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: { params: { scope: "openid profile email User.Read" } },
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: SECRET,
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    // Auto-provision Entra ID users into our store.
    async signIn({ user, account, profile }) {
      if (account?.provider !== "azure-ad") return true;
      const store = getStore();
      const p = profile as Record<string, unknown> | undefined;
      const email = (
        (p?.email as string) ||
        (p?.preferred_username as string) ||
        user.email ||
        ""
      ).toLowerCase();
      if (!email) return false;

      const oid = (p?.oid as string) || undefined;
      const fullName = (p?.name as string) || user.name || email.split("@")[0];
      const [firstName, ...rest] = fullName.split(" ");

      const existing = await store.getUserByEmail(email);
      if (!existing) {
        await store.createUser({
          email,
          firstName: firstName || email.split("@")[0],
          lastName: rest.join(" "),
          provider: "azure-ad",
          entraOid: oid ?? null,
          image: user.image ?? null,
        });
      } else if (oid && !existing.entraOid) {
        await store.updateUser(existing.id, { entraOid: oid });
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await getStore().getUserByEmail(user.email.toLowerCase());
        if (dbUser) {
          token.uid = dbUser.id;
          token.firstName = dbUser.firstName;
          token.name = `${dbUser.firstName} ${dbUser.lastName}`.trim();
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string | undefined;
        session.user.firstName = token.firstName as string | undefined;
      }
      return session;
    },
  },
};
