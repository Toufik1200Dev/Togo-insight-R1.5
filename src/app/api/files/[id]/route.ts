import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getStore } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  const store = getStore();
  const file = await store.getFileById(params.id);
  if (!file) return NextResponse.json({ success: false, message: "File not found." }, { status: 404 });
  if (file.userId !== user.id) {
    return NextResponse.json({ success: false, message: "Not authorized." }, { status: 403 });
  }

  await store.deleteFile(params.id);
  return NextResponse.json({ success: true, message: "File deleted." });
}
