import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageAdapter, StoredFile } from "./types";

interface S3AdapterConfig {
  endpoint?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: S3AdapterConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint || undefined,
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: Boolean(config.endpoint), // required for most S3-compatible providers (e.g. MinIO, R2)
    });
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<StoredFile> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType, ACL: "public-read" }),
    );
    return { key, publicUrl: this.getPublicUrl(key) };
  }

  getPublicUrl(key: string): string {
    if (this.config.endpoint) {
      return `${this.config.endpoint.replace(/\/$/, "")}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
