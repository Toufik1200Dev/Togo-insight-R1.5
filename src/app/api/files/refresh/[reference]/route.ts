import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getStore } from "@/lib/db";
import { findFilesByReference, pickBestAzureMatch } from "@/lib/azure-storage";

export const runtime = "nodejs";

/**
 * GET /api/files/refresh/:reference
 * Checks OUTPUT/ for processed files matching this reference and flips the
 * matching records to ready (with their path). Polled by the UI after upload.
 * Works in both Azure and local keyless mode.
 */
export async function GET(_req: Request, { params }: { params: { reference: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  const reference = params.reference;
  const store = getStore();
  const dbFiles = await store.listFilesByUserAndReference(user.id, reference);

  const azureFiles = await findFilesByReference(reference);

  for (const dbFile of dbFiles) {
    if (dbFile.fileType !== "output") continue;
    const best = pickBestAzureMatch(azureFiles);
    if (best && (!dbFile.isReady || dbFile.azurePath !== best.path)) {
      await store.updateFile(dbFile.id, { azurePath: best.path, isReady: true });
    }
  }

  const updated = await store.listFilesByUserAndReference(user.id, reference);

  return NextResponse.json({
    success: true,
    reference,
    files: updated,
    azureFiles: azureFiles.map((f) => f.name),
  });
}
