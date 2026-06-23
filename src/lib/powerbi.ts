import { ClientSecretCredential } from "@azure/identity";

/**
 * Power BI Embedded — "embed for your customers" using a service principal.
 *
 * Flow:
 *  1. Acquire an Entra (AAD) token for the Power BI API via the service principal.
 *  2. Read the report metadata (embedUrl, datasetId) from the REST API.
 *  3. Generate a short-lived embed token scoped to that report.
 *
 * The service principal (POWERBI_CLIENT_ID) must be added to the Power BI workspace
 * as a Member/Admin, and "Allow service principals to use Power BI APIs" must be
 * enabled in the Power BI admin portal.
 */

const SCOPE = "https://analysis.windows.net/powerbi/api/.default";
const API = "https://api.powerbi.com/v1.0/myorg";

export function isPowerBIConfigured(): boolean {
  return Boolean(
    process.env.POWERBI_TENANT_ID &&
      process.env.POWERBI_CLIENT_ID &&
      process.env.POWERBI_CLIENT_SECRET &&
      process.env.POWERBI_WORKSPACE_ID &&
      process.env.POWERBI_REPORT_ID
  );
}

async function getAadToken(): Promise<string> {
  const credential = new ClientSecretCredential(
    process.env.POWERBI_TENANT_ID!,
    process.env.POWERBI_CLIENT_ID!,
    process.env.POWERBI_CLIENT_SECRET!
  );
  const token = await credential.getToken(SCOPE);
  if (!token?.token) throw new Error("Failed to acquire Entra token for Power BI.");
  return token.token;
}

export interface EmbedInfo {
  reportId: string;
  reportName: string;
  embedUrl: string;
  embedToken: string;
  expiry: string;
}

export async function getEmbedInfo(): Promise<EmbedInfo> {
  const workspaceId = process.env.POWERBI_WORKSPACE_ID!;
  const reportId = process.env.POWERBI_REPORT_ID!;
  const aad = await getAadToken();
  const authHeader = { Authorization: `Bearer ${aad}` };

  // 1) Report metadata
  const reportResp = await fetch(`${API}/groups/${workspaceId}/reports/${reportId}`, {
    headers: authHeader,
    cache: "no-store",
  });
  if (!reportResp.ok) {
    throw new Error(`Power BI report fetch failed (${reportResp.status}): ${await reportResp.text()}`);
  }
  const report = await reportResp.json();
  const datasetId: string | undefined = process.env.POWERBI_DATASET_ID || report.datasetId;

  // 2) Embed token
  const body: Record<string, unknown> = { accessLevel: "View" };
  if (datasetId) body.datasets = [{ id: datasetId }];

  const tokenResp = await fetch(`${API}/groups/${workspaceId}/reports/${reportId}/GenerateToken`, {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!tokenResp.ok) {
    throw new Error(`Power BI token generation failed (${tokenResp.status}): ${await tokenResp.text()}`);
  }
  const tokenJson = await tokenResp.json();

  return {
    reportId,
    reportName: report.name ?? "Report",
    embedUrl: report.embedUrl,
    embedToken: tokenJson.token,
    expiry: tokenJson.expiration,
  };
}
