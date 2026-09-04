import "server-only";

import { put } from "@vercel/blob";
import { AppError } from "@/lib/errors";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function extensionForType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadImage(
  file: File,
  folder: string,
): Promise<string> {
  if (!file || file.size === 0) {
    throw new AppError("Kies een afbeelding.", "VALIDATION");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new AppError("Alleen png, jpg of webp is toegestaan.", "VALIDATION");
  }
  if (file.size > MAX_BYTES) {
    throw new AppError("Afbeelding is groter dan 5 MB.", "VALIDATION");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new AppError(
      "BLOB_READ_WRITE_TOKEN ontbreekt. Zet de token in .env.local.",
      "VALIDATION",
    );
  }

  const pathname = `${folder}/${crypto.randomUUID()}.${extensionForType(file.type)}`;
  const blob = await put(pathname, file, {
    access: "private",
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

export function isImageFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
