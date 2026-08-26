import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "student-photo" ? "student-photos" : "questions";
  const folder = `standard-schools/${user.schoolId}/${kind}`;
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, process.env.CLOUDINARY_API_SECRET ?? "");
  return NextResponse.json({ signature, timestamp, folder, cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY });
}
