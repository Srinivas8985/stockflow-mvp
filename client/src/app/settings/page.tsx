'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, ApiClientError } from '@/lib/api';
import { OrganizationSettings } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
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

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3500);
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
      setSuccessMessage('Organization default threshold updated');
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update settings';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-3xl">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Organization Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Workspace configuration and default replenishment parameters
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadSettings}
            isLoading={isLoading}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reload</span>
          </Button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-3 rounded border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-xs text-emerald-700 dark:text-emerald-300 font-medium hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadSettings}>
              Retry
            </Button>
          </div>
        )}

        {/* Inventory Defaults Card */}
        <Card>
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <CardTitle className="text-sm font-semibold">Inventory thresholds</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Default stock parameters applied across products without custom settings
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default low-stock threshold
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={defaultThreshold}
                    onChange={(e) => setDefaultThreshold(e.target.value)}
                    disabled={isLoading || isSaving}
                    className="w-24 px-2.5 py-1.5 text-sm font-mono tabular-nums font-semibold rounded border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-500">units remaining</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                  Products whose quantity reaches or drops below this number will be flagged for restocking.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Applies immediately to dashboard metrics.
                </span>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSaving}
                  disabled={isLoading}
                  className="flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save changes</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Organization Information Card */}
        <Card>
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <CardTitle className="text-sm font-semibold">Tenant workspace</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Multi-tenant organization metadata
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                <span className="text-slate-500 block text-[11px] font-medium mb-0.5">
                  Organization name
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {settings?.name || organization?.name || '—'}
                </span>
              </div>

              <div className="p-3 rounded border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                <span className="text-slate-500 block text-[11px] font-medium mb-0.5">
                  Tenant identifier
                </span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all select-all">
                  {settings?.id || organization?.id || '—'}
                </span>
              </div>

              <div className="p-3 rounded border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                <span className="text-slate-500 block text-[11px] font-medium mb-0.5">
                  Administrator
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {user?.name} ({user?.email})
                </span>
              </div>

              <div className="p-3 rounded border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                <span className="text-slate-500 block text-[11px] font-medium mb-0.5">
                  Registered date
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                  {settings?.createdAt
                    ? new Date(settings.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
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
