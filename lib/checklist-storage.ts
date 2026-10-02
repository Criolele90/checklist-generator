import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import fallbackRows from "@/data/checklist.json";
import type { ChecklistRow } from "@/lib/checklist";

const CHECKLIST_KEY = "checklist:current:v1";
const FALLBACK_FILENAME = "FORM 01-06 EVIDENZE DI AUDIT.xlsm";

export type StoredChecklist = {
  filename: string;
  contentType: string;
  base64: string;
  rows: ChecklistRow[];
  uploadedAt: string;
  size: number;
};

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

export async function getUploadedChecklist(): Promise<StoredChecklist | null> {
  const redis = getRedis();
  return redis ? redis.get<StoredChecklist>(CHECKLIST_KEY) : null;
}

export async function saveChecklist(checklist: StoredChecklist): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Storage Redis non configurato.");
  await redis.set(CHECKLIST_KEY, checklist);
}

export async function getFallbackChecklist(): Promise<StoredChecklist> {
  const filePath = path.join(process.cwd(), FALLBACK_FILENAME);
  const [file, fileInfo] = await Promise.all([readFile(filePath), stat(filePath)]);

  return {
    filename: FALLBACK_FILENAME,
    contentType: "application/vnd.ms-excel.sheet.macroEnabled.12",
    base64: file.toString("base64"),
    rows: fallbackRows as ChecklistRow[],
    uploadedAt: fileInfo.mtime.toISOString(),
    size: fileInfo.size,
  };
}

export async function getCurrentChecklist(): Promise<StoredChecklist> {
  try {
    const uploaded = await getUploadedChecklist();
    if (uploaded) return uploaded;
  } catch (error) {
    console.error("Impossibile leggere la checklist da Redis:", error);
  }

  return getFallbackChecklist();
}
