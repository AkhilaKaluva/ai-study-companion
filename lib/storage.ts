import { put, del, get } from "@vercel/blob";
import fs from "fs";
import path from "path";

/**
 * Determines whether Vercel Blob storage should be used for PDF files.
 * Returns true if BLOB_READ_WRITE_TOKEN is configured or running in Vercel production environment.
 */
export function isBlobStorageEnabled(): boolean {
  return Boolean(
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL ||
    process.env.BLOB_STORE_ID ||
    process.env.BLOB_READ_WRITE_TOKEN
  );
}

/**
 * Saves a PDF file buffer to Vercel Blob (in production / when token present)
 * or to local filesystem public/uploads (in local development).
 *
 * @param fileName Original file name
 * @param buffer File content buffer
 * @returns Stored file location (HTTPS Blob URL or relative path e.g. /uploads/...)
 */
export async function saveMaterialFile(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  if (isBlobStorageEnabled()) {
    try {
      const blob = await put(`materials/${safeName}`, buffer, {
        access: "private",
      });
      return blob.url;
    } catch (err: any) {
      console.error("[Storage] Vercel Blob put error:", err);
      if (err?.message?.includes("No blob credentials found")) {
        throw new Error(
          "Vercel Blob authentication failed: BLOB_READ_WRITE_TOKEN is missing or invalid. Please add BLOB_READ_WRITE_TOKEN in Vercel Project Settings -> Environment Variables."
        );
      }
      throw err;
    }
  }

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("Production PDF storage must use Vercel Blob storage.");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, safeName);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${safeName}`;
}

/**
 * Reads a PDF file buffer from Vercel Blob (if HTTPS URL) or local filesystem.
 *
 * @param storedPath Stored file path or Vercel Blob URL
 * @returns File Buffer
 */
export async function readMaterialFile(storedPath: string): Promise<Buffer> {
  if (!storedPath) {
    throw new Error("File path is missing.");
  }

  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    try {
      const res = await get(storedPath, { access: "private" });
      if (!res || res.statusCode !== 200 || !res.stream) {
        throw new Error("Failed to fetch file from private Blob storage");
      }
      const chunks: Uint8Array[] = [];
      for await (const chunk of res.stream as unknown as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (err: any) {
      console.error("[Storage] Vercel Blob read error:", err);
      throw new Error(`Failed to read file from Vercel Blob: ${err?.message || err}`);
    }
  }

  const relativePath = storedPath.startsWith("/") ? storedPath.slice(1) : storedPath;
  const resolvedDiskPath = path.resolve(process.cwd(), "public", relativePath);
  const publicDir = path.resolve(process.cwd(), "public");

  if (!resolvedDiskPath.startsWith(publicDir)) {
    throw new Error("Invalid file path: path traversal detected");
  }

  if (!fs.existsSync(resolvedDiskPath)) {
    throw new Error("Physical PDF file not found on disk.");
  }

  return fs.readFileSync(resolvedDiskPath);
}

/**
 * Deletes a PDF file from Vercel Blob or local filesystem.
 *
 * @param storedPath Stored file path or Vercel Blob URL
 */
export async function deleteMaterialFile(storedPath: string): Promise<void> {
  if (!storedPath) return;

  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    try {
      await del(storedPath);
    } catch (err) {
      console.warn("Failed to delete blob file:", err);
    }
    return;
  }

  try {
    const relativePath = storedPath.startsWith("/") ? storedPath.slice(1) : storedPath;
    const resolvedDiskPath = path.resolve(process.cwd(), "public", relativePath);
    const publicDir = path.resolve(process.cwd(), "public");

    if (resolvedDiskPath.startsWith(publicDir) && fs.existsSync(resolvedDiskPath)) {
      fs.unlinkSync(resolvedDiskPath);
    }
  } catch (err) {
    console.warn("Could not delete physical file:", err);
  }
}

