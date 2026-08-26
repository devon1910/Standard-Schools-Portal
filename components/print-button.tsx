"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return <button className="button button-primary no-print" onClick={() => window.print()}><Printer size={16} />Print or save PDF</button>;
}
