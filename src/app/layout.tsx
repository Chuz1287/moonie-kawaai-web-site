import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import packageJson from "../../package.json";
import VersionLogger from "@/components/VersionLogger";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monie Kawaai POS",
  description: "Offline-first point of sale and sales dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full w-full antialiased`}
    >
      <body className="h-full w-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {/* <ThemeToggle /> */}
        <VersionLogger version={packageJson.version} />
        {children}
      </body>
    </html>
  );
}
