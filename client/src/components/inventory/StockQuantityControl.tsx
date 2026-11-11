'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { api, ApiClientError } from '@/lib/api';
import { Plus, Minus, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface StockQuantityControlProps {
  product: Product;
  onUpdateSuccess?: (updatedProduct: Product) => void;
  onError?: (errorMessage: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function StockQuantityControl({
  product,
  onUpdateSuccess,
  onError,
  className,
  size = 'md',
}: StockQuantityControlProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentQty, setCurrentQty] = useState(product.quantity);

  // Sync state if product prop updates externally
  React.useEffect(() => {
    setCurrentQty(product.quantity);
  }, [product.quantity]);

  const handleStep = async (delta: number) => {
    if (isUpdating) return; // Prevent duplicate requests
    const nextQty = currentQty + delta;
    if (nextQty < 0) return; // Prevent decreasing below zero

    setIsUpdating(true);
    try {
      const res = await api.products.updateQuantity(product.id, nextQty);
      if (res.data) {
        const confirmedProduct = res.data;
        setCurrentQty(confirmedProduct.quantity);
        onUpdateSuccess?.(confirmedProduct);
      }
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to update stock quantity';
      onError?.(msg);
      setCurrentQty(product.quantity);
    } finally {
      setIsUpdating(false);
    }
  };

  const isMinusDisabled = currentQty <= 0 || isUpdating;
  const isPlusDisabled = isUpdating;

  const btnSize = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div className={clsx('inline-flex items-center gap-1', className)}>
      {/* Minus Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleStep(-1);
        }}
        disabled={isMinusDisabled}
        aria-label={`Decrease ${product.name} stock by 1`}
        title={currentQty <= 0 ? 'Stock cannot be negative' : 'Decrease by 1'}
        className={clsx(
          btnSize,
          'rounded flex items-center justify-center border transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-emerald-500',
          isMinusDisabled
            ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900'
            : 'border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
        )}
      >
        <Minus className={iconSize} />
      </button>

      {/* Monospace Tabular Quantity Display */}
      <span
        className={clsx(
          'font-mono tabular-nums font-semibold text-center select-none min-w-[2.25rem] inline-flex items-center justify-center',
          size === 'sm' ? 'text-xs' : 'text-sm',
          isUpdating && 'opacity-50 text-slate-400'
        )}
      >
        {isUpdating ? (
          <Loader2 className={clsx(iconSize, 'animate-spin text-emerald-600 dark:text-emerald-400')} />
        ) : (
          currentQty
        )}
      </span>

      {/* Plus Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleStep(1);
        }}
        disabled={isPlusDisabled}
        aria-label={`Increase ${product.name} stock by 1`}
        title="Increase by 1"
        className={clsx(
          btnSize,
          'rounded flex items-center justify-center border transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-emerald-500',
          isPlusDisabled
            ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900'
            : 'border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
        )}
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
}
