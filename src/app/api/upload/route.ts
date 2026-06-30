import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { isStorageConfigured, uploadInput } from "@/lib/azure-storage";
import { getStore } from "@/lib/db";
import { validateCsvContent } from "@/lib/csvValidation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "No file uploaded." }, { status: 400 });
    }

    const originalName = file.name;
    if (!originalName.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ success: false, message: "Only CSV files are accepted." }, { status: 400 });
    }

    // Reference = first run of digits in the filename, else a random number.
    const refMatch = originalName.match(/\d+/);
    const fileReference = refMatch ? refMatch[0] : Math.floor(Math.random() * 1_000_000).toString();

    const buffer = Buffer.from(await file.arrayBuffer());

    // Server-side sanity check (mirrors the client validation so a direct API
    // call can't bypass it).
    const validation = validateCsvContent(buffer.toString("utf8"));
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: "CSV failed validation. Please fix the file and try again.", validation },
        { status: 400 }
      );
    }

    // Upload the CSV to INPUT/. An Azure Data Factory blob-created trigger picks
    // it up, loads it into Snowflake and runs the KPI calculations; Power BI
    // reads the results directly from Snowflake. The app produces no file.
    let inputPath: string;
    try {
      inputPath = await uploadInput(originalName, buffer, file.type || "text/csv");
    } catch (azureErr) {
      console.error("storage upload failed:", azureErr);
      return NextResponse.json(
        { success: false, message: "Failed to upload file to storage. Check your storage configuration." },
        { status: 503 }
      );
    }

    // Record the uploaded input (per-user history). No output records — there's
    // no intermediate file; results live in Snowflake and surface via Power BI.
    const store = getStore();
    const original = await store.createFile({
      userId: user.id,
      fileName: originalName,
      originalName,
      fileReference,
      fileType: "original",
      azurePath: inputPath,
      isReady: true,
    });

    return NextResponse.json({
      success: true,
      message: "✅ Fichier importé. Calcul en cours via Azure Data Factory + Snowflake…",
      originalFileName: originalName,
      fileReference,
      uploadedAt: original.uploadedAt,
      storageConfigured: isStorageConfigured(),
    });
  } catch (err) {
    console.error("upload error:", err);
    return NextResponse.json({ success: false, message: "Error uploading file." }, { status: 500 });
  }
}
