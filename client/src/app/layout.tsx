import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/AuthContext';

export const metadata: Metadata = {
  title: 'StockFlow - SaaS Inventory Management System',
  description: 'Enterprise Multi-Tenant SaaS Inventory Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
