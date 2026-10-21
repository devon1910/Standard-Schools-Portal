import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { z } from "zod";

export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = z.object({ kind: z.enum(["question", "student-photo", "school-logo"]).default("question") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid upload type." }, { status: 400 });
  if (parsed.data.kind === "school-logo" && user.role !== "OWNER") {
    return NextResponse.json({ error: "Only a school owner can change the school logo." }, { status: 403 });
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "Uploads are unavailable. Please try again later." }, { status: 503 });
  }
  const kind = parsed.data.kind === "school-logo" ? "logos" : parsed.data.kind === "student-photo" ? "student-photos" : "questions";
  const folder = `standard-schools/${user.schoolId}/${kind}`;
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder, timestamp, ...(kind === "logos" ? { allowed_formats: "jpg,jpeg,png,webp" } : {}) };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
  return NextResponse.json({ ...params, signature, cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY });
}
