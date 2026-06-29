import snowflake from "snowflake-sdk";
import type { Connection, ConnectionOptions } from "snowflake-sdk";

/**
 * App-triggered Snowflake processing.
 *
 * On upload the app calls a stored procedure that reads the CSV from the Azure
 * INPUT/ external stage, computes the KPIs, and unloads ONE calculated file to
 * the Azure OUTPUT/ stage. The file name must contain the reference (the app
 * passes the desired name, e.g. `calculated_<reference>.xlsx`) so the existing
 * /api/files/refresh polling can detect it and flip the record to ready.
 *
 * Configure via environment variables (set in Azure App Service → Configuration):
 *   SNOWFLAKE_ACCOUNT          e.g. ab12345.west-europe.azure
 *   SNOWFLAKE_USERNAME
 *   SNOWFLAKE_PASSWORD         (or SNOWFLAKE_PRIVATE_KEY for key-pair auth)
 *   SNOWFLAKE_PRIVATE_KEY      (optional) PEM contents for key-pair auth
 *   SNOWFLAKE_PRIVATE_KEY_PASS (optional) passphrase for the private key
 *   SNOWFLAKE_WAREHOUSE
 *   SNOWFLAKE_DATABASE
 *   SNOWFLAKE_SCHEMA
 *   SNOWFLAKE_ROLE             (optional)
 *   SNOWFLAKE_PROC             fully-qualified proc, e.g. TOGO.PUBLIC.RUN_KPIS
 *   SNOWFLAKE_SQL              (optional) raw statement, overrides PROC
 *
 * The statement receives positional binds in this order:
 *   1) reference   2) inputPath   3) originalName   4) outputName
 * so a matching proc signature is e.g.
 *   RUN_KPIS(reference STRING, input_path STRING, original_name STRING, output_name STRING)
 */

export function isSnowflakeConfigured(): boolean {
  const hasAuth = Boolean(process.env.SNOWFLAKE_PASSWORD || process.env.SNOWFLAKE_PRIVATE_KEY);
  const hasStatement = Boolean(process.env.SNOWFLAKE_PROC || process.env.SNOWFLAKE_SQL);
  return Boolean(
    process.env.SNOWFLAKE_ACCOUNT && process.env.SNOWFLAKE_USERNAME && hasAuth && hasStatement
  );
}

export interface ProcessingParams {
  reference: string;
  originalName: string;
  inputPath: string;
  outputName: string;
}

function buildConnectionOptions(): ConnectionOptions {
  const opts: Record<string, unknown> = {
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
  };

  if (process.env.SNOWFLAKE_PRIVATE_KEY) {
    opts.authenticator = "SNOWFLAKE_JWT";
    opts.privateKey = process.env.SNOWFLAKE_PRIVATE_KEY;
    if (process.env.SNOWFLAKE_PRIVATE_KEY_PASS) {
      opts.privateKeyPass = process.env.SNOWFLAKE_PRIVATE_KEY_PASS;
    }
  } else {
    opts.password = process.env.SNOWFLAKE_PASSWORD;
  }

  const optional: Array<[string, string]> = [
    ["warehouse", "SNOWFLAKE_WAREHOUSE"],
    ["database", "SNOWFLAKE_DATABASE"],
    ["schema", "SNOWFLAKE_SCHEMA"],
    ["role", "SNOWFLAKE_ROLE"],
  ];
  for (const [key, envName] of optional) {
    const value = process.env[envName];
    if (value) opts[key] = value;
  }

  return opts as unknown as ConnectionOptions;
}

function connect(conn: Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.connect((err) => (err ? reject(err) : resolve()));
  });
}

function destroy(conn: Connection): Promise<void> {
  return new Promise((resolve) => {
    conn.destroy(() => resolve());
  });
}

function execute(conn: Connection, sqlText: string, binds: string[]): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (err, _stmt, rows) => (err ? reject(err) : resolve(rows ?? [])),
    });
  });
}

/**
 * Trigger the Snowflake calculation. Resolves when the statement completes (or
 * rejects on error). Callers may fire-and-forget and let OUTPUT/ polling detect
 * the result; the promise's rejection should still be `.catch`-logged.
 */
export async function triggerProcessing(params: ProcessingParams): Promise<void> {
  if (!isSnowflakeConfigured()) return;

  const { reference, originalName, inputPath, outputName } = params;
  const proc = process.env.SNOWFLAKE_PROC;
  const sqlText = process.env.SNOWFLAKE_SQL || `CALL ${proc}(?, ?, ?, ?)`;
  const binds: string[] = [reference, inputPath, originalName, outputName];

  const conn = snowflake.createConnection(buildConnectionOptions());
  try {
    await connect(conn);
    await execute(conn, sqlText, binds);
  } finally {
    await destroy(conn);
  }
}
