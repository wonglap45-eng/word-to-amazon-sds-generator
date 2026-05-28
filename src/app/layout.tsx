import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word to Amazon SDS Generator",
  description:
    "Upload a Word document and generate Amazon-compliant Safety Data Sheets (SDS) in PDF format.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
