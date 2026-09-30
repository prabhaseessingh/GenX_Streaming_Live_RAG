import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GenX Streaming Live RAG — Control Room & Observability Console",
  description: "Real-time, event-driven Retrieval-Augmented Generation control room and telemetry console for GenX Streaming Live RAG.",
  keywords: ["GenX", "Streaming Live RAG", "Retrieval-Augmented Generation", "Live RAG", "Telemetry", "Real-Time RAG", "FastAPI", "Groq", "Zustand"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen antialiased`}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
