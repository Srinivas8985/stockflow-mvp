'use client';

import React, { useState, useEffect } from 'react';
import { Product, CreateProductInput, UpdateProductInput } from '@/types';
import { Button } from '@/components/ui/Button';
import { X, AlertCircle } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateProductInput | UpdateProductInput) => Promise<void>;
  product?: Product | null; // If provided, edit mode; otherwise create mode
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  product,
}: ProductFormModalProps) {
  const isEditing = !!product;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setDescription(product.description || '');
      setQuantity(product.quantity || 0);
      setCostPrice(
        product.costPrice !== null && product.costPrice !== undefined
          ? String(product.costPrice)
          : ''
      );
      setSellingPrice(
        product.sellingPrice !== null && product.sellingPrice !== undefined
          ? String(product.sellingPrice)
          : ''
      );
      setLowStockThreshold(
        product.lowStockThreshold !== null && product.lowStockThreshold !== undefined
          ? String(product.lowStockThreshold)
          : ''
      );
    } else {
      setName('');
      setSku('');
      setDescription('');
      setQuantity(0);
      setCostPrice('');
      setSellingPrice('');
      setLowStockThreshold('');
    }
    setValidationError(null);
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Product name is required');
      return;
    }

    if (!sku.trim()) {
      setValidationError('Product SKU is required');
      return;
    }

    const parsedCostPrice = costPrice.trim() !== '' ? parseFloat(costPrice) : null;
    if (parsedCostPrice !== null && (isNaN(parsedCostPrice) || parsedCostPrice < 0)) {
      setValidationError('Cost price must be a non-negative number');
      return;
    }

    const parsedSellingPrice = sellingPrice.trim() !== '' ? parseFloat(sellingPrice) : null;
    if (parsedSellingPrice !== null && (isNaN(parsedSellingPrice) || parsedSellingPrice < 0)) {
      setValidationError('Selling price must be a non-negative number');
      return;
    }

    const parsedThreshold =
      lowStockThreshold.trim() !== '' ? parseInt(lowStockThreshold, 10) : null;
    if (parsedThreshold !== null && (isNaN(parsedThreshold) || parsedThreshold < 0)) {
      setValidationError('Low stock threshold must be a non-negative integer');
      return;
    }

    if (!isEditing && quantity < 0) {
      setValidationError('Initial quantity cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        const payload: UpdateProductInput = {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          description: description.trim() || null,
          costPrice: parsedCostPrice,
          sellingPrice: parsedSellingPrice,
          lowStockThreshold: parsedThreshold,
        };
        await onSubmit(payload);
      } else {
        const payload: CreateProductInput = {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          description: description.trim() || null,
          quantity: Math.max(0, Math.floor(quantity)),
          costPrice: parsedCostPrice,
          sellingPrice: parsedSellingPrice,
          lowStockThreshold: parsedThreshold,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product';
      setValidationError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Edit Product Details' : 'Add New Product'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? 'Update SKU, prices, and stock alert parameters'
                : 'Register a new item in your organization catalog'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {validationError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Industrial Barcode Scanner"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SKU (Stock Keeping Unit) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. SCN-W100"
                className="w-full px-3 py-2 text-sm font-mono uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {!isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cost Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className={isEditing ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Custom Low-Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="Leave blank for org default"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes or specifications..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

