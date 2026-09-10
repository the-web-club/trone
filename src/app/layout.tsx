import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { MotionReadyProvider } from "@/components/motion";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TRÔNE Seating",
    template: "%s · TRÔNE Seating",
  },
  description: "Interne workspace voor TRÔNE Seating",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={`${interTight.variable} h-full antialiased`}>
      <body className="flex h-full flex-col overflow-hidden bg-bg font-sans text-fg">
        <MotionReadyProvider>{children}</MotionReadyProvider>
      </body>
    </html>
  );
}
