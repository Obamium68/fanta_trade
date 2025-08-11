import '@fortawesome/fontawesome-free/css/all.min.css'

export default function TradeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        Trading
        {children}
      </main>
    </div>
  );
}
