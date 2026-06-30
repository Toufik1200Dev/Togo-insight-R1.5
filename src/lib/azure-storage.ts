import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { promises as fs } from "fs";
import path from "path";

/**
 * Input file storage. The web app uploads the user's CSV to `INPUT/<name>`.
 * From there an Azure Data Factory blob-created trigger loads it into Snowflake
 * and runs the KPI calculations; Power BI reads the results directly from
 * Snowflake. The app never produces or reads an intermediate output file.
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

// --- local helpers ---------------------------------------------------------
function localAbs(blobPath: string): string {
  return path.join(LOCAL_ROOT, blobPath);
}
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** Upload a buffer to INPUT/<name>. Returns the blob path (what ADF watches). */
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

export { CONTAINER_NAME };
