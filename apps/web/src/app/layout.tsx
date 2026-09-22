import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay — AI Collaboration Platform",
  description:
    "Production-ready realtime AI agent collaboration platform for engineering teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0d14] text-slate-100 min-h-screen antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
