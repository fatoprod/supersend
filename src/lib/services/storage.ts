import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadLogo(
  userId: string,
  file: File
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Formato não suportado. Use: PNG, JPG, GIF, WebP ou SVG`);
  }
  
  // Validate file size
  if (file.size > MAX_SIZE) {
    throw new Error(`Arquivo muito grande. Máximo: 2MB`);
  }
  
  // Generate unique filename
  const ext = file.name.split(".").pop() || "png";
  const fileName = `logo_${Date.now()}.${ext}`;
  const path = `supersend/${userId}/logos/${fileName}`;
  
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  return { url, path };
}

export async function deleteLogo(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

export const LOGO_GUIDELINES = {
  formats: ["PNG", "JPG", "GIF", "WebP", "SVG"],
  maxSize: "2MB",
  recommendedWidth: 160,
  recommendedHeight: 50,
  aspectRatio: "3:1",
  notes: "Use fundo transparente (PNG/WebP/SVG) para melhor resultado",
};

// ============ Campaign Attachments ============

const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024; // 10MB per file
const ATTACHMENT_TOTAL_MAX = 25 * 1024 * 1024; // 25MB total (Mailgun limit)

export interface AttachmentUploadResult {
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
}

export async function uploadAttachment(
  userId: string,
  campaignId: string,
  file: File
): Promise<AttachmentUploadResult> {
  if (file.size > ATTACHMENT_MAX_SIZE) {
    throw new Error(`Arquivo muito grande. Máximo por arquivo: 10MB`);
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `supersend/${userId}/attachments/${campaignId}/${Date.now()}_${sanitizedName}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return {
    name: file.name,
    url,
    path,
    size: file.size,
    type: file.type,
  };
}

export async function deleteAttachment(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

export function validateAttachmentTotal(
  existingFiles: { size: number }[],
  newFile: File
): boolean {
  const currentTotal = existingFiles.reduce((sum, f) => sum + f.size, 0);
  return currentTotal + newFile.size <= ATTACHMENT_TOTAL_MAX;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
