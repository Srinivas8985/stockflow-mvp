'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, ApiClientError } from '@/lib/api';
import { OrganizationSettings } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import {
  Settings,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, organization } = useAuth();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [defaultThreshold, setDefaultThreshold] = useState<string>('10');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.settings.get();
      if (res.data) {
        setSettings(res.data);
        setDefaultThreshold(String(res.data.defaultLowStockThreshold));
      }
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load organization settings';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Clear success notification after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const parsedThreshold = parseInt(defaultThreshold, 10);
    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      setError('Threshold must be a valid non-negative integer (0 or greater)');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.settings.update({
        defaultLowStockThreshold: parsedThreshold,
      });
      if (res.data) {
        setSettings(res.data);
        setDefaultThreshold(String(res.data.defaultLowStockThreshold));
      }
      setSuccessMessage('Organization inventory settings saved successfully');
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update settings';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <Settings className="h-7 w-7 text-emerald-600" />
              Organization Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure tenant parameters and default inventory alert thresholds
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadSettings}
            isLoading={isLoading}
            className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </Button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-xs text-emerald-700 dark:text-emerald-300 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadSettings} className="text-xs">
              Retry
            </Button>
          </div>
        )}

        {/* 1. Inventory Thresholds Form */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Inventory Threshold Defaults</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Configure default thresholds applied across your organization&apos;s product inventory
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="max-w-md">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Low-Stock Threshold
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={defaultThreshold}
                    onChange={(e) => setDefaultThreshold(e.target.value)}
                    disabled={isLoading || isSaving}
                    className="w-36 px-3 py-2 text-base font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-500">units remaining</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  When a product does not specify its own threshold, StockFlow will flag it for
                  restocking when on-hand quantity drops to or below this number.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Changes take effect immediately across all dashboard metrics and inventory listings.
                </div>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSaving}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 font-semibold text-xs"
                >
                  <Save className="h-4 w-4" /> Save Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 2. Organization Information (Read-Only) */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Tenant Organization Details</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Metadata and multi-tenant isolation context
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-1 text-[11px] font-sans font-semibold uppercase tracking-wider">
                  Organization Name
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {settings?.name || organization?.name || '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-1 text-[11px] font-sans font-semibold uppercase tracking-wider">
                  Tenant Organization ID
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 break-all select-all">
                  {settings?.id || organization?.id || '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-1 text-[11px] font-sans font-semibold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Administrator Account
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 font-sans">
                  {user?.name} ({user?.email})
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-1 text-[11px] font-sans font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Account Created
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {settings?.createdAt
                    ? new Date(settings.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

