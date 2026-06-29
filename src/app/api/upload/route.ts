import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { isStorageConfigured, outputFileName, simulateLocalProcessing, uploadInput } from "@/lib/azure-storage";
import { getStore } from "@/lib/db";
import { isSnowflakeConfigured, triggerProcessing } from "@/lib/snowflake";
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
      return NextResponse.json(
        { success: false, message: "Only CSV input files are accepted. Outputs are produced as XLSX." },
        { status: 400 }
      );
    }

    // Reference = first run of digits in the filename, else a random number.
    const refMatch = originalName.match(/\d+/);
    const fileReference = refMatch ? refMatch[0] : Math.floor(Math.random() * 1_000_000).toString();

    const buffer = Buffer.from(await file.arrayBuffer());

    // 0) Server-side sanity check (safety net — mirrors the client validation,
    //    so a direct API call can't bypass it).
    const validation = validateCsvContent(buffer.toString("utf8"));
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV failed validation. Please fix the file and try again.",
          validation,
        },
        { status: 400 }
      );
    }

    // 1) Upload original CSV to INPUT/ (Azure or local)
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

    // 2) Record the original + placeholders for the two expected outputs.
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
    const output = await store.createFile({
      userId: user.id,
      fileName: outputFileName(fileReference),
      originalName,
      fileReference,
      fileType: "output",
    });

    // 3) Kick off the calculation:
    //    - keyless local mode  → simulate so the calculated file appears instantly
    //    - Snowflake configured → trigger the proc; it writes the file to OUTPUT/
    //    - otherwise            → an external pipeline writes to OUTPUT/ (we just wait)
    let localDemo = false;
    if (!isStorageConfigured()) {
      try {
        await simulateLocalProcessing(fileReference, originalName);
        localDemo = true;
      } catch (e) {
        console.error("local processing simulation failed:", e);
      }
    } else if (isSnowflakeConfigured()) {
      // Fire-and-forget: the UI polls /api/files/refresh until the output lands.
      triggerProcessing({
        reference: fileReference,
        originalName,
        inputPath,
        outputName: outputFileName(fileReference),
      }).catch((e) => console.error("snowflake trigger failed:", e));
    }

    return NextResponse.json({
      success: true,
      message: localDemo
        ? "✅ Fichier importé. Calcul de démonstration généré — il apparaîtra dans un instant."
        : "✅ Fichier importé. Calcul en cours…",
      originalFileName: originalName,
      fileReference,
      localDemo,
      tokens: {
        original: original.fileToken,
        output: output.fileToken,
      },
    });
  } catch (err) {
    console.error("upload error:", err);
    return NextResponse.json({ success: false, message: "Error uploading file." }, { status: 500 });
  }
}
