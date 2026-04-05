import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided", 400);

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return apiError("Invalid file type. Only images are allowed.", 400);
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) return apiError("File too large (max 10MB)", 400);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filepath = path.join(uploadDir, filename);

  await writeFile(filepath, buffer);

  return apiResponse({ url: `/uploads/${filename}` }, 201);
}
