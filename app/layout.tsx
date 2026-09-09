import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3002";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "Fyxinn Quick | Hotel Maintenance",
    description:
      "Report, track, and resolve hotel maintenance issues in one clear workflow.",
    icons: {
      icon: "/fyxinn-mark.png",
      shortcut: "/fyxinn-mark.png",
    },
    openGraph: {
      title: "Fyxinn Quick",
      description: "Report. Repair. Ready.",
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "Fyxinn Quick hotel repair dashboard" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Fyxinn Quick",
      description: "Report. Repair. Ready.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
