import type { Metadata } from "next";
import "@fontsource-variable/archivo";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: { default: "Standard Schools Portal", template: "%s | Standard Schools Portal" },
  description: "Simple school administration, results, fees and question management.",
  icons: {
    icon: [
      { url: "/brand/app-icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/app-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/app-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/app-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
