import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getStore } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, country, phone, email, password, confirmPassword } = body ?? {};

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: "First name, last name, email and password are required." },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, message: "Passwords do not match." }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const store = getStore();
    const existing = await store.getUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ success: false, message: "Email already registered." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await store.createUser({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      country: country ? String(country) : null,
      phone: phone ? String(phone) : null,
      email: normalizedEmail,
      password: hashed,
      provider: "credentials",
    });

    return NextResponse.json({ success: true, message: "Account created successfully." }, { status: 201 });
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json({ success: false, message: "Server error occurred." }, { status: 500 });
  }
}
