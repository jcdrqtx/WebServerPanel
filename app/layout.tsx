import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RUST .NET",
  description: "Modern Rust server control panel"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
