import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Provider } from "@/components/provider";

export const metadata: Metadata = {
  title: "Femigo",
  description: "Create once, publish everywhere.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1877F2",
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
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
