import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { promises as fs } from "fs";
import path from "path";

/**
 * File storage. Inputs are uploaded as CSV to `INPUT/`, an external pipeline
 * writes processed XLSX outputs to `OUTPUT/`, and Power BI reads from there.
 *
 * Two backends, chosen automatically:
 *  - Azure Blob Storage when AZURE_STORAGE_CONNECTION_STRING is set
 *  - Local filesystem (.data/storage/) otherwise — keyless local dev
 */

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "prodtogodata";
const LOCAL_ROOT = path.join(process.cwd(), ".data", "storage");

let cachedContainer: ContainerClient | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING);
}

export function getContainerClient(): ContainerClient {
  if (cachedContainer) return cachedContainer;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set.");
  cachedContainer = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER_NAME);
  return cachedContainer;
}

export interface AzureMatch {
  name: string;
  path: string;
  contentLength?: number;
  lastModified?: Date;
}

// --- local helpers ---------------------------------------------------------
function localAbs(blobPath: string): string {
  return path.join(LOCAL_ROOT, blobPath);
}
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// --- public API (works in both modes) -------------------------------------

/** Upload a buffer to INPUT/<name>. Returns the blob path. */
export async function uploadInput(name: string, buffer: Buffer, contentType: string): Promise<string> {
  const blobPath = `INPUT/${name}`;
  if (isStorageConfigured()) {
    const blob = getContainerClient().getBlockBlobClient(blobPath);
    await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
  } else {
    const abs = localAbs(blobPath);
    await ensureDir(path.dirname(abs));
    await fs.writeFile(abs, buffer);
  }
  return blobPath;
}

/** Write a buffer to OUTPUT/<name> (used by the local pipeline simulation). */
export async function writeOutput(name: string, buffer: Buffer): Promise<string> {
  const blobPath = `OUTPUT/${name}`;
  if (isStorageConfigured()) {
    const blob = getContainerClient().getBlockBlobClient(blobPath);
    await blob.uploadData(buffer);
  } else {
    const abs = localAbs(blobPath);
    await ensureDir(path.dirname(abs));
    await fs.writeFile(abs, buffer);
  }
  return blobPath;
}

/** All OUTPUT/ entries whose name contains the reference. */
export async function findFilesByReference(reference: string): Promise<AzureMatch[]> {
  const matches: AzureMatch[] = [];
  if (isStorageConfigured()) {
    const container = getContainerClient();
    for await (const blob of container.listBlobsFlat({ prefix: "OUTPUT/" })) {
      if (blob.name.includes(reference)) {
        matches.push({
          name: blob.name,
          path: blob.name,
          contentLength: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
        });
      }
    }
  } else {
    const dir = localAbs("OUTPUT");
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      entries = [];
    }
    for (const name of entries) {
      if (name.includes(reference)) matches.push({ name: `OUTPUT/${name}`, path: `OUTPUT/${name}` });
    }
  }
  return matches;
}

/** Prefer a true .xlsx over a misnamed .csv.xlsx for the given output type. */
export function pickBestAzureMatch(
  files: AzureMatch[],
  fileType: "lillybelle" | "arcep" | string
): AzureMatch | null {
  if (!files.length) return null;
  const key = fileType === "lillybelle" ? "lillybelle" : "arcep";
  const candidates = files.filter((f) => f.name.toLowerCase().includes(key));
  if (!candidates.length) return null;
  const xlsx = candidates.find((f) => {
    const n = f.name.toLowerCase();
    return n.endsWith(".xlsx") && !n.includes(".csv.xlsx");
  });
  return xlsx || candidates[0];
}

/** Resolve an output blob path (handles OUTPUT/ prefix + fallback). */
export async function resolveOutputBlob(
  preferredPath: string | null | undefined,
  fileName: string,
  reference: string,
  fileType: string
): Promise<{ path: string; exists: boolean }> {
  let blobPath = preferredPath || `OUTPUT/${fileName}`;
  const needsResolve = !preferredPath || preferredPath.toLowerCase().includes(".csv.xlsx");
  if (needsResolve) {
    const files = await findFilesByReference(reference);
    const best = pickBestAzureMatch(files, fileType);
    if (best) blobPath = best.path;
  }

  if (isStorageConfigured()) {
    const container = getContainerClient();
    let exists = await container.getBlockBlobClient(blobPath).exists();
    if (!exists && !blobPath.startsWith("OUTPUT/")) {
      blobPath = `OUTPUT/${blobPath}`;
      exists = await container.getBlockBlobClient(blobPath).exists();
    }
    if (!exists) {
      for await (const blob of container.listBlobsFlat({ prefix: "OUTPUT/" })) {
        const n = blob.name.toLowerCase();
        if (n === blobPath.toLowerCase() || n.includes(fileName.toLowerCase())) {
          blobPath = blob.name;
          exists = true;
          break;
        }
      }
    }
    return { path: blobPath, exists };
  }

  // Local mode
  if (!blobPath.startsWith("OUTPUT/") && !blobPath.startsWith("INPUT/")) blobPath = `OUTPUT/${blobPath}`;
  let exists = await fileExistsLocal(blobPath);
  if (!exists) {
    const files = await findFilesByReference(reference);
    const best = pickBestAzureMatch(files, fileType);
    if (best) {
      blobPath = best.path;
      exists = true;
    }
  }
  return { path: blobPath, exists };
}

async function fileExistsLocal(blobPath: string): Promise<boolean> {
  try {
    await fs.access(localAbs(blobPath));
    return true;
  } catch {
    return false;
  }
}

/** Download an output blob as a Buffer. */
export async function downloadBlob(blobPath: string): Promise<Buffer> {
  if (isStorageConfigured()) {
    return getContainerClient().getBlockBlobClient(blobPath).downloadToBuffer();
  }
  return fs.readFile(localAbs(blobPath));
}

/**
 * Local-only: simulate the external (Snowflake/Power BI) pipeline by immediately
 * writing the two expected OUTPUT files so the upload → process → download flow
 * is fully demoable without any Azure keys.
 */
export async function simulateLocalProcessing(reference: string, originalName: string): Promise<void> {
  if (isStorageConfigured()) return;
  const stamp = new Date().toISOString();
  const note = (kind: string) =>
    Buffer.from(
      `Togo Insight — ${kind} output (LOCAL DEMO)\r\n` +
        `reference,${reference}\r\n` +
        `source,${originalName}\r\n` +
        `generated,${stamp}\r\n` +
        `note,This placeholder is created by local keyless mode. In production an external pipeline writes the real XLSX.\r\n`,
      "utf8"
    );
  await writeOutput(`lillybelle_output_${reference}.xlsx`, note("Lillybelle"));
  await writeOutput(`ARCEP_output_${reference}.xlsx`, note("ARCEP"));
}

export { CONTAINER_NAME };
