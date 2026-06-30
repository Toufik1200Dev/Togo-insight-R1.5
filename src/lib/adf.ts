import { ClientSecretCredential, DefaultAzureCredential, type TokenCredential } from "@azure/identity";

/**
 * Azure Data Factory pipeline-run status.
 *
 * The upload only drops the CSV in Blob Storage `INPUT/`. A blob-created event
 * trigger in ADF then runs a pipeline that loads the file into Snowflake and
 * runs the KPI calculations; Power BI reads the results directly from Snowflake.
 * This module lets the app watch that pipeline run so the UI can switch from
 * "en train de calculer…" to the live Power BI report.
 *
 * Auth: a service principal (ADF_CLIENT_ID/_SECRET/_TENANT_ID) when provided,
 * otherwise the App Service's managed identity (DefaultAzureCredential). The
 * identity needs the "Data Factory Reader" role on the factory.
 *
 * Env:
 *   ADF_SUBSCRIPTION_ID, ADF_RESOURCE_GROUP, ADF_FACTORY_NAME   (required)
 *   ADF_PIPELINE_NAME   (optional) only watch runs of this pipeline
 *   ADF_FILENAME_PARAM  (optional) pipeline-run parameter holding the input file
 *                       name — used to match a run to this specific upload
 *   ADF_CLIENT_ID / ADF_CLIENT_SECRET / ADF_TENANT_ID  (optional SP auth)
 */

const MGMT = "https://management.azure.com";
const SCOPE = "https://management.azure.com/.default";
const API_VERSION = "2018-06-01";

export type AdfStatus = "pending" | "running" | "succeeded" | "failed";

export function isAdfConfigured(): boolean {
  return Boolean(
    process.env.ADF_SUBSCRIPTION_ID && process.env.ADF_RESOURCE_GROUP && process.env.ADF_FACTORY_NAME
  );
}

let cachedCredential: TokenCredential | null = null;
function getCredential(): TokenCredential {
  if (cachedCredential) return cachedCredential;
  const tenant = process.env.ADF_TENANT_ID;
  const client = process.env.ADF_CLIENT_ID;
  const secret = process.env.ADF_CLIENT_SECRET;
  cachedCredential =
    tenant && client && secret
      ? new ClientSecretCredential(tenant, client, secret)
      : new DefaultAzureCredential();
  return cachedCredential;
}

interface AdfRun {
  runId: string;
  pipelineName: string;
  parameters?: Record<string, unknown>;
  runStart?: string;
  runEnd?: string;
  status: string; // Queued | InProgress | Succeeded | Failed | Cancelling | Cancelled
}

function mapStatus(adf: string): AdfStatus {
  switch (adf) {
    case "Succeeded":
      return "succeeded";
    case "Failed":
    case "Cancelled":
    case "Cancelling":
      return "failed";
    default:
      return "running"; // Queued | InProgress
  }
}

/**
 * Find the pipeline run for an upload and return its mapped status.
 * `sinceIso` is the upload time; `fileName` (+ ADF_FILENAME_PARAM) matches the
 * exact run when available, else the most recent run since the upload.
 */
export async function getUploadRunStatus(opts: {
  sinceIso: string;
  fileName?: string;
}): Promise<{ status: AdfStatus; runId?: string }> {
  const sub = process.env.ADF_SUBSCRIPTION_ID!;
  const rg = process.env.ADF_RESOURCE_GROUP!;
  const factory = process.env.ADF_FACTORY_NAME!;
  const pipeline = process.env.ADF_PIPELINE_NAME;
  const fileParam = process.env.ADF_FILENAME_PARAM;

  const token = await getCredential().getToken(SCOPE);
  if (!token?.token) throw new Error("Failed to acquire Azure management token.");

  // Window: from a couple of minutes before the upload, to just after now.
  const since = new Date(opts.sinceIso);
  const after = new Date(since.getTime() - 2 * 60_000).toISOString();
  const before = new Date(Date.now() + 60_000).toISOString();

  const body: Record<string, unknown> = { lastUpdatedAfter: after, lastUpdatedBefore: before };
  if (pipeline) {
    body.filters = [{ operand: "PipelineName", operator: "Equals", values: [pipeline] }];
  }

  const url = `${MGMT}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.DataFactory/factories/${factory}/queryPipelineRuns?api-version=${API_VERSION}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!resp.ok) {
    throw new Error(`ADF queryPipelineRuns failed (${resp.status}): ${await resp.text()}`);
  }

  const json = (await resp.json()) as { value?: AdfRun[] };
  const runs = (json.value ?? []).sort(
    (a, b) => +new Date(b.runStart ?? 0) - +new Date(a.runStart ?? 0)
  );
  if (runs.length === 0) return { status: "pending" };

  let run: AdfRun | undefined;
  if (fileParam && opts.fileName) {
    const needle = opts.fileName.toLowerCase();
    run = runs.find((r) => {
      const v = r.parameters?.[fileParam];
      return typeof v === "string" && v.toLowerCase().includes(needle);
    });
  }
  if (!run) run = runs[0];

  return { status: mapStatus(run.status), runId: run.runId };
}
