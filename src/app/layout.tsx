import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ReferralCapture } from "@/components/referral-capture";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3004"),
  title: {
    default: "Chante-Moi — Transformez vos émotions en cadeaux inoubliables",
    template: "%s — Chante-Moi",
  },
  description:
    "Racontez votre histoire, l'IA la transforme en chanson personnalisée. Anniversaires, mariages, déclarations d'amour, Gospel — offrez un cadeau musical unique.",
  openGraph: {
    title: "Chante-Moi — Tu racontes. Nous chantons.",
    description: "Créez une chanson personnalisée à partir de votre histoire, en quelques minutes.",
    siteName: "Chante-Moi",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ReferralCapture />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
