import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getStore } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/files            -> flat list of the user's files (newest first)
 * GET /api/files?group=1    -> grouped by fileReference (for History view)
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const grouped = searchParams.get("group") === "1";

  const files = await getStore().listFilesByUser(user.id);

  if (!grouped) {
    return NextResponse.json({ success: true, files });
  }

  const groups: Record<
    string,
    { reference: string; originalName: string; uploadedAt: Date; files: typeof files }
  > = {};
  for (const f of files) {
    if (!groups[f.fileReference]) {
      groups[f.fileReference] = {
        reference: f.fileReference,
        originalName: f.originalName,
        uploadedAt: f.uploadedAt,
        files: [],
      };
    }
    groups[f.fileReference].files.push(f);
  }

  return NextResponse.json({ success: true, groups: Object.values(groups) });
}
