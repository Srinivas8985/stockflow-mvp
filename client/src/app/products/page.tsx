'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api, ApiClientError } from '@/lib/api';
import {
  Product,
  CreateProductInput,
  UpdateProductInput,
  PaginationMeta,
  OrganizationSettings,
} from '@/types';
import { ProductFormModal } from '@/components/inventory/ProductFormModal';
import { QuantityModal } from '@/components/inventory/QuantityModal';
import { DeleteConfirmModal } from '@/components/inventory/DeleteConfirmModal';
import { StockQuantityControl } from '@/components/inventory/StockQuantityControl';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);

  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quantityModalProduct, setQuantityModalProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const loadProducts = useCallback(
    async (pageToLoad = 1, currentSearch = search, currentLowStock = lowStockFilter) => {
      setIsLoading(true);
      setError(null);
      try {
        const [productsRes, settingsRes] = await Promise.all([
          api.products.list({
            page: pageToLoad,
            limit: 10,
            search: currentSearch,
            lowStock: currentLowStock ? true : undefined,
          }),
          api.settings.get().catch(() => null),
        ]);

        if (productsRes.data) {
          setProducts(productsRes.data);
        }
        if (productsRes.meta?.pagination) {
          setPagination(productsRes.meta.pagination);
        }
        if (settingsRes?.data) {
          setSettings(settingsRes.data);
        }
      } catch (err) {
        const msg = err instanceof ApiClientError ? err.message : 'Failed to load products';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [search, lowStockFilter]
  );

  useEffect(() => {
    loadProducts(1);
  }, [loadProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts(1, search, lowStockFilter);
  };

  const handleToggleLowStock = () => {
    const nextVal = !lowStockFilter;
    setLowStockFilter(nextVal);
    loadProducts(1, search, nextVal);
  };

  const handleCreateOrUpdate = async (input: CreateProductInput | UpdateProductInput) => {
    if (editingProduct) {
      await api.products.update(editingProduct.id, input as UpdateProductInput);
      setSuccessToast(`Product "${input.name || editingProduct.name}" updated`);
    } else {
      await api.products.create(input as CreateProductInput);
      setSuccessToast(`Product "${input.name}" created`);
    }
    await loadProducts(pagination.page);
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    await api.products.updateQuantity(productId, quantity);
    setSuccessToast('Stock quantity updated');
    await loadProducts(pagination.page);
  };

  const handleDeleteProduct = async (productId: string) => {
    await api.products.delete(productId);
    setSuccessToast('Product removed from catalog');
    await loadProducts(1);
  };

  const defaultThreshold = settings?.defaultLowStockThreshold ?? 10;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Inventory & Products
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage product items, on-hand counts, and unit pricing
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setEditingProduct(null);
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add product</span>
          </Button>
        </div>

        {/* Notifications */}
        {successToast && (
          <div className="p-3 rounded border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadProducts(pagination.page)}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </form>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleLowStock}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${
                lowStockFilter
                  ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium'
                  : 'border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-3 w-3" />
              <span>Low-stock only</span>
            </button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadProducts(pagination.page)}
              isLoading={isLoading}
              className="px-2"
              title="Refresh inventory"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Products Table Card */}
        <Card className="overflow-hidden p-0">
          <div className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Product catalog ({pagination.total})
            </span>
            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              Page {pagination.page} / {pagination.totalPages}
            </span>
          </div>

          <div>
            {isLoading ? (
              <div className="py-14 flex items-center justify-center gap-2 text-slate-400 text-xs font-mono">
                <span className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="py-14 text-center max-w-sm mx-auto px-4">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  No products found
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                  {search || lowStockFilter
                    ? 'No products match the current search or filter.'
                    : 'Start by creating your first product.'}
                </p>
                {search || lowStockFilter ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setLowStockFilter(false);
                      loadProducts(1, '', false);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingProduct(null);
                      setFormModalOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add product
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-850/40">
                      <th className="py-2.5 px-4 font-medium">Product</th>
                      <th className="py-2.5 px-3 font-medium">SKU</th>
                      <th className="py-2.5 px-3 text-center font-medium">Stock level</th>
                      <th className="py-2.5 px-3 text-right font-medium">Cost</th>
                      <th className="py-2.5 px-3 text-right font-medium">Price</th>
                      <th className="py-2.5 px-3 text-center font-medium">Status</th>
                      <th className="py-2.5 px-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {products.map((product) => {
                      const effectiveThreshold =
                        product.lowStockThreshold !== null && product.lowStockThreshold !== undefined
                          ? product.lowStockThreshold
                          : defaultThreshold;
                      const isLowStock = product.quantity <= effectiveThreshold;
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
                            {product.description && (
                              <span className="text-[11px] text-slate-400 truncate max-w-xs block mt-0.5">
                                {product.description}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {product.sku}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <StockQuantityControl
                                product={product}
                                size="sm"
                                onUpdateSuccess={(updatedProduct) => {
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === updatedProduct.id ? updatedProduct : p
                                    )
                                  );
                                  setSuccessToast(
                                    `Stock for "${product.name}" set to ${updatedProduct.quantity}`
                                  );
                                }}
                                onError={(errMsg) => setError(errMsg)}
                              />
                              <button
                                onClick={() => setQuantityModalProduct(product)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                                title="Bulk adjust"
                                aria-label="Open bulk adjustment modal"
                              >
                                <Layers className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                            {product.costPrice !== null && product.costPrice !== undefined
                              ? `$${Number(product.costPrice).toFixed(2)}`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                            {product.sellingPrice !== null && product.sellingPrice !== undefined
                              ? `$${Number(product.sellingPrice).toFixed(2)}`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isOutOfStock ? (
                              <Badge variant="danger">Out of stock</Badge>
                            ) : isLowStock ? (
                              <Badge variant="warning">Low stock</Badge>
                            ) : (
                              <Badge variant="success">In stock</Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setFormModalOpen(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                title="Edit product"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingProduct(product)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete product"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] tabular-nums">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadProducts(pagination.page - 1)}
                  className="px-2 py-0.5 text-xs h-6.5"
                >
                  <ChevronLeft className="h-3 w-3 mr-0.5" /> Prev
                </Button>
                <span className="px-1.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadProducts(pagination.page + 1)}
                  className="px-2 py-0.5 text-xs h-6.5"
                >
                  Next <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Product Form Modal (Create / Edit) */}
      <ProductFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleCreateOrUpdate}
        product={editingProduct}
      />

      {/* Stock Adjustment Modal */}
      <QuantityModal
        isOpen={!!quantityModalProduct}
        onClose={() => setQuantityModalProduct(null)}
        onSubmit={handleUpdateQuantity}
        product={quantityModalProduct}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        product={deletingProduct}
      />
    </AppLayout>
  );
}
