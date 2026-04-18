import "./globals.css";

export const metadata = { title: "Sentinel" };

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl p-6">
          <header className="mb-6 flex items-baseline justify-between">
            <h1 className="text-2xl font-bold">Sentinel</h1>
            <span className="text-sm text-slate-400">
              Post-op deterioration monitor
            </span>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
