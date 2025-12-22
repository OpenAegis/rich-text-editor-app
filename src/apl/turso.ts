import { type Client, createClient } from "@libsql/client";
import type {
  APL,
  AplConfiguredResult,
  AplReadyResult,
  AuthData,
} from "@saleor/app-sdk/APL";

type TursoAPLConfig = {
  url: string;
  authToken?: string;
  tableName?: string;
};

const DEFAULT_TABLE_NAME = "saleor_apl";

const isValidSqliteIdentifier = (value: string) =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);

export class TursoAPL implements APL {
  private readonly client: Client;
  private readonly tableName: string;
  private initPromise: Promise<void> | undefined;

  constructor(config: TursoAPLConfig) {
    const tableName = config.tableName ?? DEFAULT_TABLE_NAME;

    if (!isValidSqliteIdentifier(tableName)) {
      throw new Error(
        `Invalid Turso tableName "${tableName}". Use only letters, numbers and underscore, and don't start with a number.`,
      );
    }

    this.tableName = tableName;
    this.client = createClient({
      url: config.url,
      authToken: config.authToken,
    });
  }

  private async ensureInitialized() {
    if (!this.initPromise) {
      const sql = `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          saleor_api_url TEXT PRIMARY KEY,
          auth_data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `;

      this.initPromise = this.client.execute(sql).then(() => undefined);
    }

    await this.initPromise;
  }

  async isConfigured(): Promise<AplConfiguredResult> {
    try {
      await this.ensureInitialized();
      return { configured: true };
    } catch (error) {
      return { configured: false, error: error as Error };
    }
  }

  async isReady(): Promise<AplReadyResult> {
    try {
      await this.ensureInitialized();
      return { ready: true };
    } catch (error) {
      return { ready: false, error: error as Error };
    }
  }

  async get(saleorApiUrl: string): Promise<AuthData | undefined> {
    await this.ensureInitialized();

    const result = await this.client.execute({
      sql: `SELECT auth_data FROM ${this.tableName} WHERE saleor_api_url = ? LIMIT 1`,
      args: [saleorApiUrl],
    });

    const row = result.rows[0];
    if (!row) return undefined;

    const authDataRaw = row.auth_data;
    if (typeof authDataRaw !== "string") {
      throw new Error(
        `Invalid auth_data type in ${this.tableName} for saleor_api_url=${saleorApiUrl}`,
      );
    }

    return JSON.parse(authDataRaw) as AuthData;
  }

  async set(authData: AuthData): Promise<void> {
    await this.ensureInitialized();

    const now = Date.now();

    await this.client.execute({
      sql: `
        INSERT INTO ${this.tableName} (saleor_api_url, auth_data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(saleor_api_url) DO UPDATE SET
          auth_data = excluded.auth_data,
          updated_at = excluded.updated_at
      `,
      args: [authData.saleorApiUrl, JSON.stringify(authData), now],
    });
  }

  async delete(saleorApiUrl: string): Promise<void> {
    await this.ensureInitialized();

    await this.client.execute({
      sql: `DELETE FROM ${this.tableName} WHERE saleor_api_url = ?`,
      args: [saleorApiUrl],
    });
  }

  async getAll(): Promise<AuthData[]> {
    await this.ensureInitialized();

    const result = await this.client.execute({
      sql: `SELECT auth_data FROM ${this.tableName}`,
    });

    return result.rows.map((row) => {
      const authDataRaw = row.auth_data;
      if (typeof authDataRaw !== "string") {
        throw new Error(`Invalid auth_data type in ${this.tableName}`);
      }
      return JSON.parse(authDataRaw) as AuthData;
    });
  }
}
