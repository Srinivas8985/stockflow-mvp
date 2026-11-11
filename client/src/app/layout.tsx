import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StockFlow - SaaS Inventory Management System',
  description: 'Enterprise Multi-Tenant SaaS Inventory Management System Foundation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {children}
      </body>
    </html>
  );
}

