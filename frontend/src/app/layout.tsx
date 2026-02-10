import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { GlobalStateProvider } from "@/context/GlobalStateContext";
import { RuntimeConfigProvider } from "@/components/RuntimeConfigProvider";
import CookieConsent from "@/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Immivo AI",
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
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfairDisplay.variable} ${cormorantGaramond.variable} antialiased`}
      >
        <RuntimeConfigProvider>
          <AuthProvider>
            <GlobalStateProvider>
              {children}
              <CookieConsent />
            </GlobalStateProvider>
          </AuthProvider>
        </RuntimeConfigProvider>
      </body>
    </html>
  );
}
