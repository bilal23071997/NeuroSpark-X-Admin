import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "NeuroSpark X Admin", template: "%s | NeuroSpark X Admin" },
  description: "Admin portal for the NeuroSpark X website content.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      {/* Browser extensions (e.g. ColorZilla) add attributes to <body> before React loads. */}
      <body suppressHydrationWarning className="min-h-full bg-void-black text-soft-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
