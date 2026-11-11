import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Frontend: Inventory Management & Quantity Control Logic', () => {
  // ---------------------------------------------------------------------------
  // 1. Quantity Stepper Controls (+ / -)
  // ---------------------------------------------------------------------------
  describe('StockQuantityControl Logic', () => {
    function computeNextQuantity(
      currentQty: number,
      delta: number
    ): { allowed: boolean; nextQty: number } {
      const next = currentQty + delta;
      if (next < 0) {
        return { allowed: false, nextQty: currentQty };
      }
      return { allowed: true, nextQty: next };
    }

    function getButtonStates(
      currentQty: number,
      isUpdating: boolean
    ): { minusDisabled: boolean; plusDisabled: boolean } {
      return {
        minusDisabled: currentQty <= 0 || isUpdating,
        plusDisabled: isUpdating,
      };
    }

    it('should increase quantity from 0 to 1', () => {
      const step = computeNextQuantity(0, 1);
      assert.equal(step.allowed, true);
      assert.equal(step.nextQty, 1);
    });

    it('should increase quantity multiple times by 1', () => {
      let qty = 0;
      for (let i = 0; i < 5; i++) {
        const step = computeNextQuantity(qty, 1);
        assert.equal(step.allowed, true);
        qty = step.nextQty;
      }
      assert.equal(qty, 5);
    });

    it('should decrease quantity from 1 to 0', () => {
      const step = computeNextQuantity(1, -1);
      assert.equal(step.allowed, true);
      assert.equal(step.nextQty, 0);
    });

    it('should prevent decreasing quantity below zero', () => {
      const step = computeNextQuantity(0, -1);
      assert.equal(step.allowed, false);
      assert.equal(step.nextQty, 0);
    });

    it('should disable minus button when quantity is 0', () => {
      const states = getButtonStates(0, false);
      assert.equal(states.minusDisabled, true);
      assert.equal(states.plusDisabled, false);
    });

    it('should enable both buttons when quantity > 0 and idle', () => {
      const states = getButtonStates(10, false);
      assert.equal(states.minusDisabled, false);
      assert.equal(states.plusDisabled, false);
    });

    it('should disable both buttons while an update is in progress (prevent duplicate requests)', () => {
      const states = getButtonStates(10, true);
      assert.equal(states.minusDisabled, true);
      assert.equal(states.plusDisabled, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Product Form Validation (Create / Edit)
  // ---------------------------------------------------------------------------
  describe('ProductFormModal Validation Logic', () => {
    function validateProductForm(data: {
      name?: string;
      sku?: string;
      quantity?: number;
      costPrice?: number | null;
      sellingPrice?: number | null;
      lowStockThreshold?: number | null;
    }): { valid: boolean; errors: Record<string, string> } {
      const errors: Record<string, string> = {};

      if (!data.name || !data.name.trim()) {
        errors.name = 'Product name is required';
      }
      if (!data.sku || !data.sku.trim()) {
        errors.sku = 'SKU is required';
      }
      if (data.quantity !== undefined && data.quantity < 0) {
        errors.quantity = 'Quantity cannot be negative';
      }
      if (data.costPrice !== undefined && data.costPrice !== null && data.costPrice < 0) {
        errors.costPrice = 'Cost price cannot be negative';
      }
      if (data.sellingPrice !== undefined && data.sellingPrice !== null && data.sellingPrice < 0) {
        errors.sellingPrice = 'Selling price cannot be negative';
      }
      if (
        data.lowStockThreshold !== undefined &&
        data.lowStockThreshold !== null &&
        data.lowStockThreshold < 0
      ) {
        errors.lowStockThreshold = 'Low stock threshold cannot be negative';
      }

      return { valid: Object.keys(errors).length === 0, errors };
    }

    it('should validate a valid product form submission', () => {
      const result = validateProductForm({
        name: 'Barcode Scanner Pro',
        sku: 'SCAN-001',
        quantity: 50,
        costPrice: 45.0,
        sellingPrice: 89.99,
        lowStockThreshold: 10,
      });
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, {});
    });

    it('should reject missing product name and SKU', () => {
      const result = validateProductForm({});
      assert.equal(result.valid, false);
      assert.ok(result.errors.name);
      assert.ok(result.errors.sku);
    });

    it('should reject negative quantities and negative prices', () => {
      const result = validateProductForm({
        name: 'Faulty Product',
        sku: 'FAULT-01',
        quantity: -5,
        costPrice: -10,
        sellingPrice: -20,
      });
      assert.equal(result.valid, false);
      assert.equal(result.errors.quantity, 'Quantity cannot be negative');
      assert.equal(result.errors.costPrice, 'Cost price cannot be negative');
      assert.equal(result.errors.sellingPrice, 'Selling price cannot be negative');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Search and Pagination URL Building
  // ---------------------------------------------------------------------------
  describe('Product Search & Pagination Query Builder', () => {
    function buildProductsQuery(params: {
      page?: number;
      limit?: number;
      search?: string;
      lowStock?: boolean;
    }): string {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', String(params.page));
      if (params.limit) searchParams.append('limit', String(params.limit));
      if (params.search && params.search.trim()) searchParams.append('search', params.search.trim());
      if (params.lowStock !== undefined) searchParams.append('lowStock', String(params.lowStock));

      const qs = searchParams.toString();
      return `/products${qs ? `?${qs}` : ''}`;
    }

    it('should construct basic paginated query', () => {
      const url = buildProductsQuery({ page: 2, limit: 25 });
      assert.equal(url, '/products?page=2&limit=25');
    });

    it('should trim and append search term', () => {
      const url = buildProductsQuery({ page: 1, limit: 20, search: '  Thermal Printer  ' });
      assert.equal(url, '/products?page=1&limit=20&search=Thermal+Printer');
    });

    it('should append lowStock filter flag', () => {
      const url = buildProductsQuery({ page: 1, limit: 20, lowStock: true });
      assert.equal(url, '/products?page=1&limit=20&lowStock=true');
    });

    it('should correctly calculate total pages', () => {
      const calcTotalPages = (total: number, limit: number) => Math.ceil(total / limit) || 1;
      assert.equal(calcTotalPages(0, 20), 1);
      assert.equal(calcTotalPages(15, 20), 1);
      assert.equal(calcTotalPages(21, 20), 2);
      assert.equal(calcTotalPages(100, 20), 5);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Delete Confirmation Safety
  // ---------------------------------------------------------------------------
  describe('DeleteConfirmModal Safety Verification', () => {
    function canExecuteDelete(
      activeProduct: { id: string; name: string } | null,
      isDeleting: boolean
    ): boolean {
      return Boolean(activeProduct && activeProduct.id && !isDeleting);
    }

    it('should allow deletion only when a product is explicitly selected and not deleting', () => {
      assert.equal(canExecuteDelete({ id: 'prod-123', name: 'Scanner' }, false), true);
    });

    it('should block deletion when no product is selected', () => {
      assert.equal(canExecuteDelete(null, false), false);
    });

    it('should block deletion while in-flight to prevent duplicate deletion requests', () => {
      assert.equal(canExecuteDelete({ id: 'prod-123', name: 'Scanner' }, true), false);
    });
  });
});

