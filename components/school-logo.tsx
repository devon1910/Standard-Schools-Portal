"use client";

import Image from "next/image";
import { useState } from "react";

export default function SchoolLogo({ logoUrl, schoolName }: { logoUrl?: string | null; schoolName: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const showSchoolLogo = Boolean(logoUrl && logoUrl !== failedUrl);

  return <Image
    className="school-logo"
    src={showSchoolLogo ? logoUrl! : "/brand/mark-mono-black.svg"}
    alt={showSchoolLogo ? `${schoolName} logo` : "Standard Schools"}
    width={48}
    height={48}
    unoptimized
    onError={() => setFailedUrl(logoUrl ?? "")}
  />;
}
