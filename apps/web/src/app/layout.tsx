import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Structure-Locked HDR",
  description: "Internal Phase 1 admin surface for structure-locked HDR shoots."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
