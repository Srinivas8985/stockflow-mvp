import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Frontend: Dashboard Analytics & Settings Logic', () => {
  // ---------------------------------------------------------------------------
  // 1. Effective Low Stock Threshold Resolution & Stock Status Evaluation
  // ---------------------------------------------------------------------------
  describe('Stock Status Evaluation', () => {
    function resolveEffectiveThreshold(
      productThreshold: number | null | undefined,
      orgDefaultThreshold: number = 10
    ): number {
      return productThreshold !== null && productThreshold !== undefined
        ? productThreshold
        : orgDefaultThreshold;
    }

    function determineStockStatus(
      quantity: number,
      productThreshold: number | null | undefined,
      orgDefaultThreshold: number = 10
    ): 'out-of-stock' | 'low-stock' | 'in-stock' {
      if (quantity === 0) return 'out-of-stock';
      const effective = resolveEffectiveThreshold(productThreshold, orgDefaultThreshold);
      if (quantity <= effective) return 'low-stock';
      return 'in-stock';
    }

    it('should prioritize product-specific threshold over organization default', () => {
      const threshold = resolveEffectiveThreshold(5, 10);
      assert.equal(threshold, 5);
    });

    it('should fall back to organization default threshold when product threshold is null or undefined', () => {
      assert.equal(resolveEffectiveThreshold(null, 15), 15);
      assert.equal(resolveEffectiveThreshold(undefined, 20), 20);
    });

    it('should flag quantity of 0 as out-of-stock', () => {
      const status = determineStockStatus(0, 5, 10);
      assert.equal(status, 'out-of-stock');
    });

    it('should flag quantity at or below effective threshold as low-stock', () => {
      // Product threshold is 8: quantity 8 is low stock
      assert.equal(determineStockStatus(8, 8, 10), 'low-stock');
      assert.equal(determineStockStatus(3, 8, 10), 'low-stock');

      // Product has null threshold -> org default 10: quantity 9 is low stock
      assert.equal(determineStockStatus(9, null, 10), 'low-stock');
    });

    it('should flag quantity above effective threshold as in-stock', () => {
      // Product threshold is 8: quantity 9 is in stock
      assert.equal(determineStockStatus(9, 8, 10), 'in-stock');

      // Org default 10: quantity 11 is in stock
      assert.equal(determineStockStatus(11, null, 10), 'in-stock');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Dashboard KPI Metric Aggregation Logic
  // ---------------------------------------------------------------------------
  describe('Dashboard KPI Aggregation Logic', () => {
    interface SampleProduct {
      id: string;
      quantity: number;
      lowStockThreshold?: number | null;
    }

    function computeMetrics(
      products: SampleProduct[],
      defaultThreshold: number = 10
    ) {
      const totalProducts = products.length;
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);

      const lowStockProducts = products.filter((p) => {
        const threshold =
          p.lowStockThreshold !== null && p.lowStockThreshold !== undefined
            ? p.lowStockThreshold
            : defaultThreshold;
        return p.quantity <= threshold;
      });

      return {
        totalProducts,
        totalQuantity,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
      };
    }

    it('should handle completely empty inventory correctly', () => {
      const metrics = computeMetrics([]);
      assert.equal(metrics.totalProducts, 0);
      assert.equal(metrics.totalQuantity, 0);
      assert.equal(metrics.lowStockCount, 0);
      assert.deepEqual(metrics.lowStockProducts, []);
    });

    it('should accurately aggregate counts and detect low-stock items', () => {
      const products: SampleProduct[] = [
        { id: '1', quantity: 20, lowStockThreshold: 10 }, // in-stock
        { id: '2', quantity: 5, lowStockThreshold: 10 },  // low-stock (5 <= 10)
        { id: '3', quantity: 15, lowStockThreshold: null }, // in-stock (org default 10)
        { id: '4', quantity: 0, lowStockThreshold: null },  // low-stock / out-of-stock (0 <= 10)
      ];

      const metrics = computeMetrics(products, 10);
      assert.equal(metrics.totalProducts, 4);
      assert.equal(metrics.totalQuantity, 40);
      assert.equal(metrics.lowStockCount, 2);
      assert.deepEqual(metrics.lowStockProducts.map((p) => p.id), ['2', '4']);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Settings Form Validation Logic
  // ---------------------------------------------------------------------------
  describe('Settings Form Validation', () => {
    function validateSettingsInput(thresholdVal: string): {
      valid: boolean;
      parsedValue?: number;
      error?: string;
    } {
      if (!thresholdVal || thresholdVal.trim() === '') {
        return { valid: false, error: 'Threshold is required' };
      }

      const num = Number(thresholdVal);
      if (isNaN(num)) {
        return { valid: false, error: 'Threshold must be a valid number' };
      }
      if (!Number.isInteger(num)) {
        return { valid: false, error: 'Threshold must be a whole number (integer)' };
      }
      if (num < 0) {
        return { valid: false, error: 'Threshold cannot be negative' };
      }

      return { valid: true, parsedValue: num };
    }

    it('should accept valid positive integer threshold', () => {
      const res = validateSettingsInput('15');
      assert.equal(res.valid, true);
      assert.equal(res.parsedValue, 15);
    });

    it('should accept threshold of 0', () => {
      const res = validateSettingsInput('0');
      assert.equal(res.valid, true);
      assert.equal(res.parsedValue, 0);
    });

    it('should reject empty or whitespace input', () => {
      const res = validateSettingsInput('   ');
      assert.equal(res.valid, false);
      assert.equal(res.error, 'Threshold is required');
    });

    it('should reject negative threshold numbers', () => {
      const res = validateSettingsInput('-5');
      assert.equal(res.valid, false);
      assert.equal(res.error, 'Threshold cannot be negative');
    });

    it('should reject decimal numbers', () => {
      const res = validateSettingsInput('10.5');
      assert.equal(res.valid, false);
      assert.equal(res.error, 'Threshold must be a whole number (integer)');
    });
  });
});

