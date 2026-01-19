import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy Rek - Screen Recorder",
  description: "Professional screen recorder with camera overlay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
