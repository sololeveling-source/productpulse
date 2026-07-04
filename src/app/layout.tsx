import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProductPulse - Competitive Intelligence",
  description: "AI-powered competitive change detection and analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full bg-zinc-950 antialiased`}
      >
        <TooltipProvider>
          <AppSidebar />
          <main className="ml-[240px] max-w-[1120px] p-6">{children}</main>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
