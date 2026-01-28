import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EnvProvider } from "@/components/EnvProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { GlobalStateProvider } from "@/context/GlobalStateContext";

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
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read env vars at runtime (Server Component)
  const config = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
    userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
    awsRegion: process.env.NEXT_PUBLIC_AWS_REGION || '',
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EnvProvider config={config}>
          <AuthProvider>
            <GlobalStateProvider>
              {children}
            </GlobalStateProvider>
          </AuthProvider>
        </EnvProvider>
      </body>
    </html>
  );
}
