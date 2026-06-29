import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getStore } from "@/lib/db";
import { downloadBlob, resolveOutputBlob } from "@/lib/azure-storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  const store = getStore();
  const file = await store.getFileByToken(params.token);
  if (!file) return NextResponse.json({ success: false, message: "File not found." }, { status: 404 });
  if (file.userId !== user.id) {
    return NextResponse.json({ success: false, message: "Not authorized." }, { status: 403 });
  }

  try {
    const { path, exists } = await resolveOutputBlob(
      file.azurePath,
      file.fileName,
      file.fileReference
    );

    if (!exists) {
      return NextResponse.json(
        { success: false, message: "File not found in storage. Processing may not be complete." },
        { status: 404 }
      );
    }

    // Persist the resolved path / readiness for future requests.
    if (file.azurePath !== path || !file.isReady) {
      await store.updateFile(file.id, { azurePath: path, isReady: true });
    }

    const buffer = await downloadBlob(path);
    const isXlsx = file.fileType === "output" || file.fileName.toLowerCase().endsWith(".xlsx");
    const contentType = isXlsx
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv";

    // Wrap in a fresh Uint8Array so the body type matches the DOM BodyInit
    // (Node's Buffer generic isn't accepted directly by NextResponse types).
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Content-Length": String(body.length),
      },
    });
  } catch (err) {
    console.error("download error:", err);
    return NextResponse.json({ success: false, message: "Error downloading file from storage." }, { status: 500 });
  }
}
