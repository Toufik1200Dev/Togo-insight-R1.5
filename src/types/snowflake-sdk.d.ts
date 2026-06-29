// Minimal ambient types for `snowflake-sdk` (the package ships no TypeScript
// definitions). Only the small surface used by src/lib/snowflake.ts is declared.
declare module "snowflake-sdk" {
  export interface ConnectionOptions {
    account: string;
    username: string;
    password?: string;
    authenticator?: string;
    privateKey?: string;
    privateKeyPass?: string;
    warehouse?: string;
    database?: string;
    schema?: string;
    role?: string;
  }

  export interface SnowflakeError extends Error {
    code?: string | number;
  }

  export interface Statement {
    getSqlText(): string;
  }

  export interface ExecuteOptions {
    sqlText: string;
    binds?: (string | number)[];
    complete: (err: SnowflakeError | undefined, stmt: Statement, rows: unknown[] | undefined) => void;
  }

  export interface Connection {
    connect(cb: (err: SnowflakeError | undefined, conn: Connection) => void): void;
    execute(options: ExecuteOptions): Statement;
    destroy(cb: (err: SnowflakeError | undefined, conn: Connection) => void): void;
  }

  export function createConnection(options: ConnectionOptions): Connection;

  const _default: {
    createConnection(options: ConnectionOptions): Connection;
  };
  export default _default;
}
