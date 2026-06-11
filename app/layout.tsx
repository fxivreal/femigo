import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Provider } from "@/components/provider";
import { PwaRegister } from "@/components/pwa-register";
import { InstallPrompt } from "@/components/pwa-prompt";

export const metadata: Metadata = {
  title: "Femigo",
  description: "Create once, publish everywhere.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Femigo",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#6366F1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Provider>
          <PwaRegister />
          <InstallPrompt />
          {children}
        </Provider>
      </body>
    </html>
  );
}
