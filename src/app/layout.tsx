import "./globals.css";
import type { ReactNode } from "react";
import { manrope, inter, jetbrains } from "@/lib/fonts";
import { ThemeProvider } from "@/lib/theme/provider";

export const metadata = {
  title: "FORM",
  description: "Website-to-product studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.className} ${inter.className} ${jetbrains.className} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}