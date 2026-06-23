import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStore } from "@/lib/db";

/** Returns the signed-in user (or null). Use in server components / route handlers. */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return getStore().getUserByEmail(session.user.email.toLowerCase());
}

/** Returns the signed-in user's id, or null. */
export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
