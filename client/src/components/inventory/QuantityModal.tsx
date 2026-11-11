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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
      <div className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden p-5 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Adjust stock</h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{product.sku}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              On-hand quantity
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full text-center text-xl font-mono tabular-nums font-semibold py-2 rounded border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Adjustment Increment Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleAdjust(-10)}
              className="py-1 px-1.5 text-xs font-mono rounded border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              -10
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(-1)}
              className="py-1 px-1.5 text-xs font-mono rounded border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(1)}
              className="py-1 px-1.5 text-xs font-mono rounded border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(10)}
              className="py-1 px-1.5 text-xs font-mono rounded border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              +10
            </button>
          </div>

          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Update
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
