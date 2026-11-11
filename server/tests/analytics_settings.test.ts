import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'http';
import { app } from '../src/app';
import { prisma } from '../src/config/database';

describe('Phase 4: Dashboard Analytics & Organization Settings', () => {
  let server: Server;
  let baseUrl: string;

  const timestamp = Date.now();
  const userA = {
    name: 'Alice Analytics',
    email: `alice.analytics.${timestamp}@stockflow-test.io`,
    password: 'Password123!',
    organizationName: 'Alpha Analytics Corp',
  };

  const userB = {
    name: 'Bob Analytics',
    email: `bob.analytics.${timestamp}@stockflow-test.io`,
    password: 'Password123!',
    organizationName: 'Beta Analytics Corp',
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

    // Create User & Organization A
    const resA = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const bodyA = await resA.json();
    tokenA = bodyA.data.token;
    orgIdA = bodyA.data.organization.id;

    // Create User & Organization B
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
  // 1. Unauthorized Access Protection
  // ---------------------------------------------------------------------------
  describe('Authentication & Access Control', () => {
    it('10. should reject unauthorized settings and analytics access with 401', async () => {
      const resGetSettings = await fetch(`${baseUrl}/settings`);
      assert.strictEqual(resGetSettings.status, 401);

      const resPatchSettings = await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultLowStockThreshold: 15 }),
      });
      assert.strictEqual(resPatchSettings.status, 401);

      const resDashboard = await fetch(`${baseUrl}/analytics/dashboard`);
      assert.strictEqual(resDashboard.status, 401);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Organization Settings Management
  // ---------------------------------------------------------------------------
  describe('Organization Settings (/api/v1/settings)', () => {
    it('5. should retrieve organization default threshold (default: 10)', async () => {
      const res = await fetch(`${baseUrl}/settings`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.defaultLowStockThreshold, 10);
      assert.strictEqual(body.data.id, orgIdA);
    });

    it('8. should update default threshold successfully', async () => {
      const res = await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ defaultLowStockThreshold: 15 }),
      });
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.defaultLowStockThreshold, 15);

      // Verify persistence via GET
      const verifyRes = await fetch(`${baseUrl}/settings`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const verifyBody = await verifyRes.json();
      assert.strictEqual(verifyBody.data.defaultLowStockThreshold, 15);
    });

    it('9. should reject invalid threshold values with 400', async () => {
      // Negative value
      const resNeg = await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ defaultLowStockThreshold: -5 }),
      });
      assert.strictEqual(resNeg.status, 400);

      // Floating point number
      const resFloat = await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ defaultLowStockThreshold: 12.5 }),
      });
      assert.strictEqual(resFloat.status, 400);

      // Non-number string
      const resStr = await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ defaultLowStockThreshold: 'invalid' }),
      });
      assert.strictEqual(resStr.status, 400);

      // Unrecognized extra property (.strict mode)
      const resExtra = await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          defaultLowStockThreshold: 20,
          organizationId: 'malicious-org-id',
        }),
      });
      assert.strictEqual(resExtra.status, 400);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Dashboard Analytics
  // ---------------------------------------------------------------------------
  describe('Dashboard Analytics (/api/v1/analytics/dashboard)', () => {
    it('6. should return zero metrics for empty inventory', async () => {
      const res = await fetch(`${baseUrl}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.totalProducts, 0);
      assert.strictEqual(body.data.totalQuantity, 0);
      assert.strictEqual(body.data.lowStockCount, 0);
      assert.deepStrictEqual(body.data.lowStockProducts, []);
    });

    it('1, 2, 3, 4. should accurately compute total products, total quantity, and effective low stock thresholds', async () => {
      // Org A's defaultLowStockThreshold is currently 15

      // Product 1: Quantity 20, lowStockThreshold null (above default 15 -> normal)
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Item Above Default Threshold',
          sku: `SKU-NORMAL-${timestamp}`,
          quantity: 20,
        }),
      });

      // Product 2: Quantity 12, lowStockThreshold null (at or below default 15 -> LOW STOCK)
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Item Below Default Threshold',
          sku: `SKU-LOW-DEFAULT-${timestamp}`,
          quantity: 12,
        }),
      });

      // Product 3: Quantity 50, custom lowStockThreshold 100 (50 <= 100 -> LOW STOCK despite being > default 15)
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Item With High Custom Threshold',
          sku: `SKU-CUSTOM-HIGH-${timestamp}`,
          quantity: 50,
          lowStockThreshold: 100,
        }),
      });

      // Product 4: Quantity 8, custom lowStockThreshold 5 (8 > 5 -> normal despite 8 <= default 15)
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Item With Low Custom Threshold',
          sku: `SKU-CUSTOM-LOW-${timestamp}`,
          quantity: 8,
          lowStockThreshold: 5,
        }),
      });

      // Fetch dashboard metrics for Org A
      const res = await fetch(`${baseUrl}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.success, true);

      // 1. Total product count
      assert.strictEqual(body.data.totalProducts, 4);

      // 2. Total quantity sum (20 + 12 + 50 + 8 = 90)
      assert.strictEqual(body.data.totalQuantity, 90);

      // 3. Low stock count (Products 2 and 3)
      assert.strictEqual(body.data.lowStockCount, 2);

      // 4. Low stock products verification
      assert.strictEqual(body.data.lowStockProducts.length, 2);
      const lowStockSkus = body.data.lowStockProducts.map(
        (p: { sku: string }) => p.sku
      );
      assert.ok(lowStockSkus.includes(`SKU-LOW-DEFAULT-${timestamp}`));
      assert.ok(lowStockSkus.includes(`SKU-CUSTOM-HIGH-${timestamp}`));
      assert.ok(!lowStockSkus.includes(`SKU-NORMAL-${timestamp}`));
      assert.ok(!lowStockSkus.includes(`SKU-CUSTOM-LOW-${timestamp}`));
    });

    it('7. should enforce organization isolation in dashboard analytics and settings', async () => {
      // Add product for Organization B
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          name: 'Org B Critical Item',
          sku: `SKU-ORG-B-${timestamp}`,
          quantity: 3,
        }),
      });

      // Check Org B dashboard
      const resB = await fetch(`${baseUrl}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const bodyB = await resB.json();

      // Org B has default threshold 10, quantity 3 <= 10 -> low stock
      assert.strictEqual(bodyB.data.totalProducts, 1);
      assert.strictEqual(bodyB.data.totalQuantity, 3);
      assert.strictEqual(bodyB.data.lowStockCount, 1);
      assert.strictEqual(bodyB.data.lowStockProducts[0].sku, `SKU-ORG-B-${timestamp}`);

      // Verify Org A dashboard is completely isolated from Org B data
      const resA = await fetch(`${baseUrl}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const bodyA = await resA.json();
      assert.strictEqual(bodyA.data.totalProducts, 4);
      assert.strictEqual(bodyA.data.totalQuantity, 90);
      assert.strictEqual(bodyA.data.lowStockCount, 2);

      const orgASkus = bodyA.data.lowStockProducts.map(
        (p: { sku: string }) => p.sku
      );
      assert.ok(!orgASkus.includes(`SKU-ORG-B-${timestamp}`));

      // Verify Org B updating settings does not affect Org A
      await fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({ defaultLowStockThreshold: 30 }),
      });

      const resVerifyA = await fetch(`${baseUrl}/settings`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const bodyVerifyA = await resVerifyA.json();
      assert.strictEqual(bodyVerifyA.data.defaultLowStockThreshold, 15);
    });
  });
});

