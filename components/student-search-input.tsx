"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentSearchInput({ query }: { query: string }) {
  const router = useRouter();
  const [value, setValue] = useState(query);

  useEffect(() => setValue(query), [query]);
  useEffect(() => {
    if (value.trim() === query) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      params.delete("page");
      router.replace(`/students?${params.toString()}`, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [value, query, router]);

  return <input className="input" style={{ paddingLeft: 35 }} name="q" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Name or admission number" aria-label="Find a student" />;
}
