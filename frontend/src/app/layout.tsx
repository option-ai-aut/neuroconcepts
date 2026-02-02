import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { GlobalStateProvider } from "@/context/GlobalStateContext";
import { RuntimeConfigProvider } from "@/components/RuntimeConfigProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeuroConcepts AI",
  description: "Real Estate AI Platform",
  icons: {
    icon: '/icon.svg',
  },
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RuntimeConfigProvider>
          <AuthProvider>
            <GlobalStateProvider>
              {children}
            </GlobalStateProvider>
          </AuthProvider>
        </RuntimeConfigProvider>
      </body>
    </html>
  );
}
