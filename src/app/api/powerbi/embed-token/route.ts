import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getEmbedInfo, isPowerBIConfigured } from "@/lib/powerbi";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  if (!isPowerBIConfigured()) {
    // Return 200 so the viewer can render a friendly "configure Power BI" placeholder.
    return NextResponse.json({ success: true, configured: false });
  }

  try {
    const info = await getEmbedInfo();
    return NextResponse.json({ success: true, configured: true, ...info });
  } catch (err) {
    console.error("powerbi embed-token error:", err);
    const message = err instanceof Error ? err.message : "Power BI error.";
    return NextResponse.json({ success: false, configured: true, message }, { status: 500 });
  }
}
