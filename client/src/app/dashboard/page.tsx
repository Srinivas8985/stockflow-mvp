'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api, ApiClientError } from '@/lib/api';
import { DashboardAnalytics, OrganizationSettings } from '@/types';
import { StockQuantityControl } from '@/components/inventory/StockQuantityControl';
import {
  Package,
  Boxes,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [analyticsRes, settingsRes] = await Promise.all([
        api.analytics.getDashboard(),
        api.settings.get().catch(() => null),
      ]);

      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
      if (settingsRes?.data) {
        setSettings(settingsRes.data);
      }
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : 'Failed to load dashboard metrics';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const defaultThreshold = settings?.defaultLowStockThreshold ?? 10;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Inventory Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time stock valuation, inventory volume, and replenishment monitoring
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              isLoading={isLoading}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Link href="/products">
              <Button size="sm" className="flex items-center gap-1.5 text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
              Retry
            </Button>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Total Products */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Catalog Items
                </span>
                <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Package className="h-5 w-5" />
                </span>
              </div>
              <CardTitle className="text-3xl font-extrabold mt-1">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  analytics?.totalProducts ?? 0
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Unique product records</span>
                <Link
                  href="/products"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* 2. Total Stock Units */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Units On Hand
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Boxes className="h-5 w-5" />
                </span>
              </div>
              <CardTitle className="text-3xl font-extrabold mt-1">
                {isLoading ? (
                  <span className="inline-block w-20 h-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  (analytics?.totalQuantity ?? 0).toLocaleString()
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aggregated inventory count across warehouse
              </p>
            </CardContent>
          </Card>

          {/* 3. Low-Stock Alert Count */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Low Stock Alerts
                </span>
                <span
                  className={`p-2 rounded-lg ${
                    (analytics?.lowStockCount ?? 0) > 0
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </span>
              </div>
              <CardTitle className="text-3xl font-extrabold mt-1">
                {isLoading ? (
                  <span className="inline-block w-14 h-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  analytics?.lowStockCount ?? 0
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {(analytics?.lowStockCount ?? 0) > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Restocking required
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      All thresholds satisfied
                    </span>
                  )}
                </span>
                <Link
                  href="/settings"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline text-[11px]"
                >
                  Threshold: {defaultThreshold}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Replenishment Table */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Critical & Low Stock Items
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Products whose on-hand quantity is at or below their effective threshold
                </CardDescription>
              </div>
              <Link href="/products">
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
                  View Full Inventory <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
                <span className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                Loading inventory metrics...
              </div>
            ) : analytics && analytics.totalProducts === 0 ? (
              /* Zero Products Empty State */
              <div className="py-12 text-center max-w-sm mx-auto">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  No products in catalog yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  Get started by adding products to your organization to track inventory and view metrics.
                </p>
                <Link href="/products">
                  <Button size="sm" className="inline-flex items-center gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add Your First Product
                  </Button>
                </Link>
              </div>
            ) : analytics && analytics.lowStockProducts.length === 0 ? (
              /* Healthy Stock Empty State */
              <div className="py-10 text-center max-w-sm mx-auto">
                <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  All inventory levels healthy
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  No items currently require restocking based on your organization and product thresholds.
                </p>
              </div>
            ) : (
              /* Low Stock Data Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3">SKU</th>
                      <th className="py-3 px-3 text-center">Stock Level</th>
                      <th className="py-3 px-3 text-right">Threshold</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {analytics?.lowStockProducts.map((product) => {
                      const effectiveThreshold =
                        product.lowStockThreshold !== null && product.lowStockThreshold !== undefined
                          ? product.lowStockThreshold
                          : defaultThreshold;
                      const isOutOfStock = product.quantity === 0;

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-xs text-slate-400 truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {product.sku}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center">
                              <StockQuantityControl
                                product={product}
                                size="sm"
                                onUpdateSuccess={async () => {
                                  // Refresh dashboard analytics and low-stock information
                                  await loadData();
                                }}
                                onError={(errMsg) => setError(errMsg)}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-xs text-slate-500">
                            {effectiveThreshold}
                            {product.lowStockThreshold !== null && (
                              <span className="text-[10px] text-slate-400 block">custom</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isOutOfStock ? (
                              <Badge variant="danger">Out of Stock</Badge>
                            ) : (
                              <Badge variant="warning">Low Stock</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link href="/products">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs px-2.5 py-1"
                              >
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

