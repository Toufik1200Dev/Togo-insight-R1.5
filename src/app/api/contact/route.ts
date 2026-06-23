import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: "All fields are required." }, { status: 400 });
    }
    await getStore().createContact({ name: String(name), email: String(email), message: String(message) });
    return NextResponse.json({ success: true, message: "Your message has been sent successfully!" });
  } catch (err) {
    console.error("contact error:", err);
    return NextResponse.json(
      { success: false, message: "An error occurred while sending your message." },
      { status: 500 }
    );
  }
}
