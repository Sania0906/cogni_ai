import { createRequire } from "module";
import path from "path";
import multer from "multer";
import { supabaseAdmin } from "../config/supabase.js";

const require = createRequire(import.meta.url);
const pdfModule = require("pdf-parse");
const pdfParser = typeof pdfModule === "function" ? pdfModule : pdfModule?.default || pdfModule;

export const RESUME_BUCKET = process.env.STORAGE_RESUME_BUCKET?.trim() || "resumes";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".txt", ".doc", ".docx"]);
const ALLOWED_MIMETYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIMETYPES.has(file.mimetype)) {
      return cb(new Error("Invalid file type. Only PDF, TXT, DOC, and DOCX files are permitted."));
    }
    cb(null, true);
  },
});

const uploadFlexible = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "resume", maxCount: 1 },
]);

/**
 * Shared multipart upload middleware supporting both WebApp ("file") and MobileApp ("resume") fields.
 */
export function resumeUploadMiddleware(req: any, res: any, next: any) {
  uploadFlexible(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File size exceeds the 5MB maximum limit." });
        }
        return res.status(400).json({ message: `Upload validation error: ${err.message}` });
      }
      return res.status(400).json({ message: err.message || "Invalid file upload." });
    }
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files["file"]?.[0]) {
        req.file = files["file"][0];
      } else if (files["resume"]?.[0]) {
        req.file = files["resume"][0];
      }
    }
    next();
  });
}

/**
 * Extracts plain text from an uploaded PDF or text-based resume buffer.
 */
export async function extractTextFromUploadedResume(
  file?: Express.Multer.File,
  fallbackText: string = ""
): Promise<{ text: string; fileName: string }> {
  if (!file) {
    return { text: fallbackText, fileName: "pasted_resume.txt" };
  }

  const fileName = path.basename(file.originalname || "resume.pdf");
  const ext = path.extname(fileName).toLowerCase();
  let text = fallbackText;

  if (ext === ".pdf" || file.mimetype === "application/pdf") {
    try {
      if (typeof pdfParser === "function") {
        const parsed = await pdfParser(file.buffer);
        text = parsed?.text || fallbackText;
      } else {
        text = file.buffer.toString("utf-8");
      }
    } catch (pdfErr: any) {
      console.warn("[PDF Parser Warning]:", pdfErr?.message);
      const rawStr = file.buffer.toString("utf-8");
      if (rawStr && !rawStr.startsWith("%PDF")) {
        text = rawStr;
      }
    }
  } else {
    text = file.buffer.toString("utf-8");
  }

  return { text, fileName };
}

export interface StorageUploadResult {
  fileUrl: string;
  storagePath: string | null;
  persisted: boolean;
}

/**
 * Uploads the raw resume file into the private Supabase Storage resumes bucket under {userId}/.
 */
export async function uploadResumeToStorage(
  userId: string,
  file?: Express.Multer.File
): Promise<StorageUploadResult> {
  if (!file) {
    return { fileUrl: "inline://pasted_resume.txt", storagePath: null, persisted: false };
  }

  const safeName = path.basename(file.originalname || "resume.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${userId}/${Date.now()}_${safeName}`;
  const bucket = process.env.STORAGE_RESUME_BUCKET?.trim() || RESUME_BUCKET;

  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      console.warn("[Supabase Storage] Resume upload warning:", error.message);
      return {
        fileUrl: `inline://upload-unpersisted/${safeName}`,
        storagePath: null,
        persisted: false,
      };
    }

    return {
      fileUrl: `storage://${bucket}/${objectPath}`,
      storagePath: objectPath,
      persisted: true,
    };
  } catch (err: any) {
    console.warn("[Supabase Storage] Resume upload exception:", err?.message);
    return {
      fileUrl: `inline://upload-unpersisted/${safeName}`,
      storagePath: null,
      persisted: false,
    };
  }
}

/**
 * Generates a short-lived signed URL after verifying ownership prefix ({userId}/...).
 */
export async function createSignedResumeUrl(
  userId: string,
  rawFileUrl: string,
  expiresInSeconds: number = 300
): Promise<string | null> {
  const bucket = process.env.STORAGE_RESUME_BUCKET?.trim() || RESUME_BUCKET;
  const prefix = `storage://${bucket}/`;
  const objectPath = rawFileUrl.startsWith(prefix) ? rawFileUrl.slice(prefix.length) : rawFileUrl;

  if (!objectPath.startsWith(`${userId}/`)) {
    return null;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

