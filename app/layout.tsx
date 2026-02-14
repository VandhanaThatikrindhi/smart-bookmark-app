import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Bookmark App",
  description: "A simple bookmark manager built with Next.js and Supabase.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="container mx-auto p-4">
          {children}
        </div>
      </body>
    </html>
  );
}