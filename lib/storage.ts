import { put, del, get } from "@vercel/blob";
import fs from "fs";
import path from "path";

/**
 * Determines whether Vercel Blob storage should be used for PDF files.
 * Returns true if BLOB_READ_WRITE_TOKEN is configured or running in Vercel production environment.
 */
export function isBlobStorageEnabled(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID ||
    process.env.VERCEL
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
    const blob = await put(`materials/${safeName}`, buffer, {
      access: "private",
    });
    return blob.url;
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
    const res = await get(storedPath, { access: "private" });
    if (!res || res.statusCode !== 200 || !res.stream) {
      throw new Error("Failed to fetch file from private Blob storage");
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.stream as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
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

