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
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Inventory Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Stock levels, total volume, and replenishment monitoring
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              isLoading={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            <Link href="/products">
              <Button size="sm" className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>Add product</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              Retry
            </Button>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Total Products */}
          <Card>
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Total catalog products</span>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-semibold tabular-nums mt-1 text-slate-900 dark:text-white">
                {isLoading ? '—' : analytics?.totalProducts ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Active SKU entries</span>
                <Link
                  href="/products"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Manage items
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 2. Total Stock Units */}
          <Card>
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Units on hand</span>
                <Boxes className="h-4 w-4 text-slate-400" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-semibold tabular-nums mt-1 text-slate-900 dark:text-white">
                {isLoading ? '—' : (analytics?.totalQuantity ?? 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sum of all stock quantities across warehouse
              </p>
            </CardContent>
          </Card>

          {/* 3. Low-Stock Alert Count */}
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Low-stock alerts</span>
                <AlertTriangle
                  className={
                    (analytics?.lowStockCount ?? 0) > 0
                      ? 'h-4 w-4 text-amber-500'
                      : 'h-4 w-4 text-slate-400'
                  }
                />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-semibold tabular-nums mt-1 text-slate-900 dark:text-white">
                {isLoading ? '—' : analytics?.lowStockCount ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {(analytics?.lowStockCount ?? 0) > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Replenishment needed
                    </span>
                  ) : (
                    <span>All stock levels sufficient</span>
                  )}
                </span>
                <Link
                  href="/settings"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline text-[11px]"
                >
                  Threshold: {defaultThreshold}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Replenishment Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <span>Replenishment alerts</span>
                  {(analytics?.lowStockCount ?? 0) > 0 && (
                    <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium">
                      {analytics?.lowStockCount}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Products at or below their effective low-stock threshold
                </CardDescription>
              </div>
              <Link href="/products">
                <Button variant="outline" size="sm" className="text-xs">
                  View full inventory
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 flex items-center justify-center gap-2 text-slate-400 text-xs font-mono">
                <span className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading metrics...</span>
              </div>
            ) : analytics && analytics.totalProducts === 0 ? (
              <div className="py-12 text-center max-w-sm mx-auto px-4">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  No products in catalog
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                  Add products to track on-hand stock and view automated threshold alerts.
                </p>
                <Link href="/products">
                  <Button size="sm">Add first product</Button>
                </Link>
              </div>
            ) : analytics && analytics.lowStockProducts.length === 0 ? (
              <div className="py-8 text-center max-w-sm mx-auto px-4">
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>All inventory levels healthy</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  No items currently require restocking based on configured thresholds.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-850/40">
                      <th className="py-2.5 px-4 font-medium">Product</th>
                      <th className="py-2.5 px-3 font-medium">SKU</th>
                      <th className="py-2.5 px-3 text-center font-medium">Stock level</th>
                      <th className="py-2.5 px-3 text-right font-medium">Threshold</th>
                      <th className="py-2.5 px-3 text-center font-medium">Status</th>
                      <th className="py-2.5 px-4 text-right font-medium">Action</th>
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
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150"
                        >
                          <td className="py-2.5 px-4">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {product.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {product.sku}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center">
                              <StockQuantityControl
                                product={product}
                                size="sm"
                                onUpdateSuccess={async () => {
                                  await loadData();
                                }}
                                onError={(errMsg) => setError(errMsg)}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                            {effectiveThreshold}
                            {product.lowStockThreshold !== null && (
                              <span className="text-[10px] text-slate-400 block">custom</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isOutOfStock ? (
                              <Badge variant="danger">Out of stock</Badge>
                            ) : (
                              <Badge variant="warning">Low stock</Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Link href="/products">
                              <Button variant="outline" size="sm" className="px-2 py-0.5 text-xs">
                                Edit
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
