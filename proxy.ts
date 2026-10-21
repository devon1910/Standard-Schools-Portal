import { NextResponse, type NextRequest } from "next/server";
import { familyHostPath } from "@/lib/family-portal";

export function proxy(request: NextRequest) {
  const path = familyHostPath(request.headers.get("host") ?? "", request.nextUrl.pathname);
  if (!path) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/", "/login", "/change-password"] };
