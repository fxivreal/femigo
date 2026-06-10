import type { Metadata } from "next";
import "./globals.css";
import { Provider } from "@/components/provider";

export const metadata: Metadata = {
  title: "Femigo",
  description: "Create once, publish everywhere.",
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
