import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

const sfProRounded = localFont({
  src: [
    { path: "../../public/fonts/SF-Pro-Rounded-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/SF-Pro-Rounded-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/SF-Pro-Rounded-Semibold.otf", weight: "600", style: "normal" },
    { path: "../../public/fonts/SF-Pro-Rounded-Bold.otf", weight: "700", style: "normal" },
    { path: "../../public/fonts/SF-Pro-Rounded-Heavy.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-sf-pro-rounded",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "ANSEM - Proposal",
  description: "ANSEM Proposal.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${sfProRounded.variable} antialiased`} suppressHydrationWarning>
        <div className="relative z-10">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
