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
  AlertTriangle,
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

  // Toast notification auto-dismiss
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
      setSuccessToast(`Product "${input.name || editingProduct.name}" updated successfully`);
    } else {
      await api.products.create(input as CreateProductInput);
      setSuccessToast(`Product "${input.name}" created successfully`);
    }
    await loadProducts(pagination.page);
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    await api.products.updateQuantity(productId, quantity);
    setSuccessToast('Stock quantity updated successfully');
    await loadProducts(pagination.page);
  };

  const handleDeleteProduct = async (productId: string) => {
    await api.products.delete(productId);
    setSuccessToast('Product deleted from organization catalog');
    await loadProducts(1);
  };

  const defaultThreshold = settings?.defaultLowStockThreshold ?? 10;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Inventory & Products
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage product catalog, real-time quantities, and unit pricing
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setEditingProduct(null);
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadProducts(pagination.page)}
              className="text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Controls Bar: Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </form>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={lowStockFilter ? 'primary' : 'outline'}
              size="sm"
              onClick={handleToggleLowStock}
              className="flex items-center gap-1.5 text-xs"
            >
              <Filter className="h-3.5 w-3.5" />
              {lowStockFilter ? 'Showing Low Stock' : 'Filter Low Stock'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadProducts(pagination.page)}
              isLoading={isLoading}
              className="p-2"
              title="Refresh inventory"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Products Table Card */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <CardHeader className="py-3.5 px-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              Product Catalog ({pagination.total})
            </CardTitle>
            <span className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
                <span className="h-7 w-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              /* Empty State */
              <div className="py-16 text-center max-w-sm mx-auto px-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  No products found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  {search || lowStockFilter
                    ? 'No products match your search or filter criteria. Try clearing filters.'
                    : 'Get started by creating your first inventory product record.'}
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
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingProduct(null);
                      setFormModalOpen(true);
                    }}
                    className="text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                  </Button>
                )}
              </div>
            ) : (
              /* Table Data */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4 text-center">Stock Quantity</th>
                      <th className="py-3 px-4 text-right">Cost Price</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-center">Stock Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
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
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                                {product.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {product.sku}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <StockQuantityControl
                                product={product}
                                onUpdateSuccess={(updatedProduct) => {
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === updatedProduct.id ? updatedProduct : p
                                    )
                                  );
                                  setSuccessToast(
                                    `Stock for "${product.name}" updated to ${updatedProduct.quantity}`
                                  );
                                }}
                                onError={(errMsg) => setError(errMsg)}
                              />
                              <button
                                onClick={() => setQuantityModalProduct(product)}
                                className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition-colors"
                                title="Bulk stock adjustment modal"
                                aria-label="Open bulk adjustment modal"
                              >
                                <Layers className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                            {product.costPrice !== null && product.costPrice !== undefined
                              ? `$${Number(product.costPrice).toFixed(2)}`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                            {product.sellingPrice !== null && product.sellingPrice !== undefined
                              ? `$${Number(product.sellingPrice).toFixed(2)}`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isOutOfStock ? (
                              <Badge variant="danger">Out of Stock</Badge>
                            ) : isLowStock ? (
                              <Badge variant="warning">Low Stock</Badge>
                            ) : (
                              <Badge variant="success">In Stock</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setFormModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Edit Product"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingProduct(product)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="h-4 w-4" />
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
          </CardContent>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} products
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadProducts(pagination.page - 1)}
                  className="px-2 py-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadProducts(pagination.page + 1)}
                  className="px-2 py-1 text-xs"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
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

