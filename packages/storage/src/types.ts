export interface StoredFile {
  key: string;
  publicUrl: string;
}

/**
 * Instagram's publish API requires media to sit at a publicly-reachable URL at the moment
 * it fetches it, so the adapter always returns a URL Instagram can hit — the local adapter
 * serves files from apps/web's own /media route for dev, the s3 adapter returns the bucket's
 * public/CDN URL.
 */
export interface StorageAdapter {
  upload(key: string, data: Buffer, contentType: string): Promise<StoredFile>;
  getPublicUrl(key: string): string;
  delete(key: string): Promise<void>;
}
