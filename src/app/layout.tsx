import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { MotionReadyProvider } from "@/components/motion";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { getSession } from "@/lib/auth-session";
import { readThemeFromRequest } from "@/lib/theme-cookies";
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
  colorScheme: "light dark",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const { preference, resolved } = await readThemeFromRequest(
    session?.user ?? null,
  );

  return (
    <html
      lang="nl"
      className={`${interTight.variable} h-full antialiased`}
      data-theme={resolved ?? undefined}
      data-theme-preference={preference}
      style={resolved ? { colorScheme: resolved } : undefined}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
      </head>
      <body className="flex h-full flex-col overflow-hidden bg-bg font-sans text-fg">
        <ThemeProvider preference={preference} resolved={resolved}>
          <MotionReadyProvider>{children}</MotionReadyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
