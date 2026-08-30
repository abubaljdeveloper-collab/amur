import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { StorageAdapter, StoredFile } from "./types";

const DEFAULT_BASE_URL = "http://localhost:3000";

/**
 * Dev-only adapter: writes to disk under <cwd>/.data/media and serves files back out
 * via apps/web's /api/media/[...key] route (see apps/web/src/app/api/media/[...key]/route.ts),
 * so publishMedia() still gets a real, fetchable URL without needing S3 credentials.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(baseDir = resolve(process.cwd(), ".data/media"), baseUrl = process.env["AUTH_URL"] ?? DEFAULT_BASE_URL) {
    this.baseDir = baseDir;
    this.baseUrl = baseUrl;
  }

  async upload(key: string, data: Buffer, _contentType: string): Promise<StoredFile> {
    const filePath = join(this.baseDir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return { key, publicUrl: this.getPublicUrl(key) };
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/api/media/${key}`;
  }

  async delete(key: string): Promise<void> {
    await rm(join(this.baseDir, key), { force: true });
  }

  /** Used by apps/web's serving route — not part of the StorageAdapter interface. */
  async readLocal(key: string): Promise<Buffer> {
    return readFile(join(this.baseDir, key));
  }
}
