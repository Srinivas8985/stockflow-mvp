'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import {
  LayoutDashboard,
  Package,
  Settings,
  LogOut,
  Building,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';
import clsx from 'clsx';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Products',
    href: '/products',
    icon: Package,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, organization, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 text-sm">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 h-13 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-xs select-none">
            SF
          </div>
          <span className="font-semibold text-sm tracking-tight">StockFlow</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs">
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    SF
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">StockFlow</h2>
                    <p className="text-[11px] text-slate-500 truncate max-w-[130px]">
                      {organization?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors',
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                    >
                      <Icon className={clsx('h-4 w-4', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="h-7 w-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <div className="text-xs truncate">
                  <p className="font-medium text-slate-900 dark:text-slate-200 truncate">{user?.name}</p>
                  <p className="text-slate-500 truncate text-[11px]">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-60 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 min-h-screen p-4 shrink-0">
        <div>
          {/* Logo & Tenant Brand */}
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-sm tracking-tight select-none">
                SF
              </div>
              <div className="truncate">
                <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">
                  StockFlow
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  <Building className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate max-w-[140px]" title={organization?.name}>
                    {organization?.name || 'Workspace'}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Items (36px tall, 3px gaps) */}
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 h-9 rounded text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                >
                  <Icon
                    className={clsx(
                      'h-4 w-4 shrink-0',
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Sign Out */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-slate-50/80 dark:bg-slate-800/50 mb-2">
            <div className="h-7 w-7 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-semibold text-xs text-slate-700 dark:text-slate-300 shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="truncate text-xs">
              <p className="font-medium text-slate-900 dark:text-slate-200 truncate leading-tight">
                {user?.name}
              </p>
              <p className="text-slate-500 dark:text-slate-400 truncate text-[11px]">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors duration-150"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-7">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
