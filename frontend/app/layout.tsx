import "./globals.css";
import { Inter } from "next/font/google";
import { Aurora } from "@/components/shell/Aurora";
import { AppShell } from "@/components/shell/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Sentinel — Post-op Monitor",
  description:
    "AI voice-nurse monitoring for post-operative patients. Catches deterioration before it becomes a 911 call.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <Aurora />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
