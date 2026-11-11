import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'http';
import { app } from '../src/app';
import { prisma } from '../src/config/database';

describe('Phase 4 & 6: Analytics, Organization Settings & Tenant Isolation', () => {
  let server: Server;
  let baseUrl: string;

  const timestamp = Date.now();
  const userA = {
    name: 'Alice Metrics',
    email: `alice.metrics.${timestamp}@stockflow-test.io`,
    password: 'Password123!',
    organizationName: 'Alpha Analytics Org',
  };

  const userB = {
    name: 'Bob Metrics',
    email: `bob.metrics.${timestamp}@stockflow-test.io`,
    password: 'Password123!',
    organizationName: 'Beta Empty Org',
  };

  let tokenA: string;
  let tokenB: string;
  let orgIdA: string;
  let orgIdB: string;

  before(async () => {
    // Start temporary test server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
        }
        resolve();
      });
    });

    // Create User & Org A
    const resA = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const bodyA = await resA.json();
    tokenA = bodyA.data.token;
    orgIdA = bodyA.data.organization.id;

    // Create User & Org B (remains empty for empty inventory testing)
    const resB = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const bodyB = await resB.json();
    tokenB = bodyB.data.token;
    orgIdB = bodyB.data.organization.id;
  });

  after(async () => {
    try {
      if (orgIdA) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).organization.delete({ where: { id: orgIdA } }).catch(() => {});
      }
      if (orgIdB) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).organization.delete({ where: { id: orgIdB } }).catch(() => {});
      }
      await prisma.$disconnect();
    } catch {
      // Ignore cleanup error
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Empty Inventory Behavior
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/analytics/dashboard - Empty Inventory', () => {
    it('should return zeroes and empty list for an organization with no products', async () => {
      const res = await fetch(`${baseUrl}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.totalProducts, 0);
      assert.equal(body.data.totalQuantity, 0);
      assert.equal(body.data.lowStockCount, 0);
      assert.deepEqual(body.data.lowStockProducts, []);
    });

    it('should reject unauthenticated access to analytics', async () => {
      const res = await fetch(`${baseUrl}/analytics/dashboard`);
      assert.equal(res.status, 401);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Organization Settings Tests
  // ---------------------------------------------------------------------------
  describe('GET & PATCH /api/v1/settings', () => {
    it('should retrieve default organization settings (defaultLowStockThreshold: 10)', async () => {
      const res = await fetch(`${baseUrl}/settings`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.id, orgIdA);
      assert.equal(body.data.defaultLowStockThreshold, 10);
    });

    it('should reject updating settings with negative threshold (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ defaultLowStockThreshold: -5 }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.equal(body.error?.code, 'VALIDATION_ERROR');
    });

    it('should reject updating settings with non-integer threshold (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ defaultLowStockThreshold: 12.5 }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
    });

    it('should update default low stock threshold and persist change', async () => {
      const res = await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ defaultLowStockThreshold: 15 }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.defaultLowStockThreshold, 15);

      // Verify persistence via GET
      const verifyRes = await fetch(`${baseUrl}/settings`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const verifyBody = await verifyRes.json();
      assert.equal(verifyBody.data.defaultLowStockThreshold, 15);
    });

    it('should enforce tenant isolation on settings (User B settings remain default 10)', async () => {
      const resB = await fetch(`${baseUrl}/settings`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      const bodyB = await resB.json();
      assert.equal(resB.status, 200);
      assert.equal(bodyB.data.id, orgIdB);
      assert.equal(bodyB.data.defaultLowStockThreshold, 10);
      assert.notEqual(bodyB.data.defaultLowStockThreshold, 15);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Analytics Calculations (Thresholds, Product Counts, Quantities)
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/analytics/dashboard - Populated Inventory', () => {
    it('should seed products with specific thresholds and quantities', async () => {
      // Product 1: Specific threshold 5, quantity 4 (LOW STOCK: 4 <= 5)
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Widget Specific Low',
          sku: `SKU-WIDGET-${timestamp}-1`,
          quantity: 4,
          lowStockThreshold: 5,
        }),
      });

      // Product 2: Specific threshold 5, quantity 10 (NORMAL STOCK: 10 > 5)
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Widget Specific Normal',
          sku: `SKU-WIDGET-${timestamp}-2`,
          quantity: 10,
          lowStockThreshold: 5,
        }),
      });

      // Product 3: Inherits org threshold 15, quantity 12 (LOW STOCK: 12 <= 15)
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Widget Org Default Low',
          sku: `SKU-WIDGET-${timestamp}-3`,
          quantity: 12,
          // lowStockThreshold omitted -> inherits org default (15)
        }),
      });

      // Product 4: Inherits org threshold 15, quantity 50 (NORMAL STOCK: 50 > 15)
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Widget Org Default Normal',
          sku: `SKU-WIDGET-${timestamp}-4`,
          quantity: 50,
        }),
      });
    });

    it('should compute exact total products, total quantity, and low stock count', async () => {
      const res = await fetch(`${baseUrl}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);

      // Total products: 4
      assert.equal(body.data.totalProducts, 4);

      // Total quantity: 4 + 10 + 12 + 50 = 76
      assert.equal(body.data.totalQuantity, 76);

      // Low stock count: Product 1 (4 <= 5) and Product 3 (12 <= 15) = 2
      assert.equal(body.data.lowStockCount, 2);
      assert.equal(body.data.lowStockProducts.length, 2);

      const lowStockSkus = body.data.lowStockProducts.map((p: any) => p.sku);
      assert.ok(lowStockSkus.includes(`SKU-WIDGET-${timestamp}-1`));
      assert.ok(lowStockSkus.includes(`SKU-WIDGET-${timestamp}-3`));
      assert.ok(!lowStockSkus.includes(`SKU-WIDGET-${timestamp}-2`));
      assert.ok(!lowStockSkus.includes(`SKU-WIDGET-${timestamp}-4`));
    });

    it('should enforce complete tenant isolation between Org A and Org B analytics', async () => {
      const resB = await fetch(`${baseUrl}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      const bodyB = await resB.json();
      assert.equal(resB.status, 200);

      // Org B must still have 0 products and 0 quantity
      assert.equal(bodyB.data.totalProducts, 0);
      assert.equal(bodyB.data.totalQuantity, 0);
      assert.equal(bodyB.data.lowStockCount, 0);
      assert.deepEqual(bodyB.data.lowStockProducts, []);
    });
  });
});

