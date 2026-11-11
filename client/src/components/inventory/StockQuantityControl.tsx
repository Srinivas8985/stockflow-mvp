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
    if (isUpdating) return; // Prevent duplicate requests while an update is in flight
    const nextQty = currentQty + delta;
    if (nextQty < 0) return; // Enforce non-negative constraint

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
      // Re-sync with authoritative product state
      setCurrentQty(product.quantity);
    } finally {
      setIsUpdating(false);
    }
  };

  const isMinusDisabled = currentQty <= 0 || isUpdating;
  const isPlusDisabled = isUpdating;

  const buttonSizeClass = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const iconSizeClass = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div className={clsx('inline-flex items-center gap-1.5', className)}>
      {/* Minus Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleStep(-1);
        }}
        disabled={isMinusDisabled}
        aria-label={`Decrease ${product.name} stock by 1`}
        title={currentQty <= 0 ? 'Quantity cannot be below 0' : 'Decrease by 1'}
        className={clsx(
          buttonSizeClass,
          'rounded-md flex items-center justify-center border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs',
          isMinusDisabled
            ? 'opacity-35 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95'
        )}
      >
        <Minus className={iconSizeClass} />
      </button>

      {/* Quantity Display */}
      <span
        className={clsx(
          'font-mono font-bold text-center select-none min-w-[2.25rem] inline-flex items-center justify-center',
          size === 'sm' ? 'text-xs' : 'text-sm',
          isUpdating && 'opacity-60 text-slate-400'
        )}
      >
        {isUpdating ? (
          <Loader2 className={clsx(iconSizeClass, 'animate-spin text-emerald-600 dark:text-emerald-400')} />
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
          buttonSizeClass,
          'rounded-md flex items-center justify-center border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs',
          isPlusDisabled
            ? 'opacity-35 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95'
        )}
      >
        <Plus className={iconSizeClass} />
      </button>
    </div>
  );
}

