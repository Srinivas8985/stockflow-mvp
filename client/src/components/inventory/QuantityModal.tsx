'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { X, AlertCircle } from 'lucide-react';

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (productId: string, quantity: number) => Promise<void>;
  product: Product | null;
}

export function QuantityModal({
  isOpen,
  onClose,
  onSubmit,
  product,
}: QuantityModalProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setQuantity(product.quantity || 0);
    }
    setError(null);
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(quantity) || quantity < 0) {
      setError('Quantity must be a non-negative integer');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(product.id, Math.floor(quantity));
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update stock';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjust = (delta: number) => {
    setQuantity((prev) => Math.max(0, prev + delta));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Adjust Stock Level</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{product.name} ({product.sku})</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              On-Hand Quantity
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full text-center text-2xl font-bold font-mono py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Adjustment Increment Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleAdjust(-10)}
              className="py-1.5 px-2 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              -10
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(-1)}
              className="py-1.5 px-2 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(1)}
              className="py-1.5 px-2 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(10)}
              className="py-1.5 px-2 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              +10
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Update Stock
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

