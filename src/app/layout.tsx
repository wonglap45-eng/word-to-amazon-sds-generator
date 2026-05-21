import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist_sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geist_mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang="en"
      className={`${geist_sans.variable} ${geist_mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
