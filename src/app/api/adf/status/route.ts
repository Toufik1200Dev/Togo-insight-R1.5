import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getUploadRunStatus, isAdfConfigured } from "@/lib/adf";

export const runtime = "nodejs";

/**
 * GET /api/adf/status?since=<iso>&file=<originalName>
 * Reports the Azure Data Factory pipeline-run status for an upload, so the UI
 * can switch from the "en train de calculer…" animation to the live dashboard.
 * Returns { configured: false } when ADF env vars aren't set (the UI then falls
 * back to a manual reveal).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  if (!isAdfConfigured()) {
    return NextResponse.json({ success: true, configured: false });
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") || new Date(Date.now() - 10 * 60_000).toISOString();
  const fileName = searchParams.get("file") || undefined;

  try {
    const result = await getUploadRunStatus({ sinceIso: since, fileName });
    return NextResponse.json({ success: true, configured: true, ...result });
  } catch (err) {
    console.error("adf status error:", err);
    const message = err instanceof Error ? err.message : "ADF error.";
    return NextResponse.json({ success: false, configured: true, message }, { status: 500 });
  }
}
