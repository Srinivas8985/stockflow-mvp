import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'http';
import { app } from '../src/app';
import { prisma } from '../src/config/database';

describe('Phase 3: Inventory Management - Product CRUD & Tenant Isolation', () => {
  let server: Server;
  let baseUrl: string;

  const timestamp = Date.now();
  const userA = {
    name: 'Alice Inventory',
    email: `alice.inv.${timestamp}@stockflow-test.io`,
    password: 'Password123!',
    organizationName: 'Alpha Storehouse',
  };

  const userB = {
    name: 'Bob Inventory',
    email: `bob.inv.${timestamp}@stockflow-test.io`,
    password: 'Password123!',
    organizationName: 'Beta Depository',
  };

  let tokenA: string;
  let tokenB: string;
  let orgIdA: string;
  let orgIdB: string;

  let createdProductA1Id: string;
  const sharedSku = `SKU-SHARED-${timestamp}`;

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

    // Create User & Org B
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
  // 1. Product Creation & Validation
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/products', () => {
    it('1. should create a product scoped to authenticated organization', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Wireless Barcode Scanner',
          sku: sharedSku,
          description: 'High-speed 2D handheld scanner',
          quantity: 25,
          costPrice: 45.0,
          sellingPrice: 89.99,
          lowStockThreshold: 5,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.name, 'Wireless Barcode Scanner');
      assert.equal(body.data.sku, sharedSku);
      assert.equal(body.data.organizationId, orgIdA);
      assert.equal(body.data.quantity, 25);

      createdProductA1Id = body.data.id;
    });

    it('2. should reject product creation with missing required fields', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          // missing name and sku
          description: 'No name or sku',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.equal(body.error?.code, 'VALIDATION_ERROR');
    });

    it('3. should reject duplicate SKU within the same organization', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Duplicate Scanner Item',
          sku: sharedSku, // same SKU in Org A
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 409);
      assert.equal(body.success, false);
      assert.match(body.message, /already exists in your organization/i);
    });

    it('4. should allow the same SKU in a different organization', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`, // Org B
        },
        body: JSON.stringify({
          name: 'Beta Barcode Scanner Item',
          sku: sharedSku, // Same SKU in Org B
          quantity: 10,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.organizationId, orgIdB);
      assert.equal(body.data.sku, sharedSku);
    });

    it('10. should reject unauthenticated access', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauth Item', sku: 'UNAUTH-1' }),
      });

      assert.equal(res.status, 401);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Product Listing & Search
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/products', () => {
    it('5. should list products with pagination metadata', async () => {
      // Add second product for Org A
      await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Thermal Label Printer',
          sku: `SKU-PRINTER-${timestamp}`,
          quantity: 3,
          lowStockThreshold: 10,
        }),
      });

      const res = await fetch(`${baseUrl}/products?page=1&limit=1`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.length, 1);
      assert.ok(body.meta?.pagination);
      assert.equal(body.meta.pagination.page, 1);
      assert.equal(body.meta.pagination.limit, 1);
      assert.equal(body.meta.pagination.total >= 2, true);
    });

    it('6. should search products by name or SKU', async () => {
      const res = await fetch(`${baseUrl}/products?search=Printer`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].name, 'Thermal Label Printer');
    });

    it('should filter products for low stock', async () => {
      const res = await fetch(`${baseUrl}/products?lowStock=true`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      // Thermal printer has qty: 3, threshold: 10
      assert.ok(body.data.some((item: any) => item.name === 'Thermal Label Printer'));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Product Retrieval & Cross-Organization Rejection
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/products/:id', () => {
    it('should retrieve a product by ID for the owning organization', async () => {
      const res = await fetch(`${baseUrl}/products/${createdProductA1Id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.id, createdProductA1Id);
      assert.equal(body.data.organizationId, orgIdA);
    });

    it('11. should reject cross-organization access (User B accessing Product A)', async () => {
      const res = await fetch(`${baseUrl}/products/${createdProductA1Id}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      const body = await res.json();
      assert.equal(res.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /not found in your organization/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Product Update & Cross-Organization Rejection
  // ---------------------------------------------------------------------------
  describe('PATCH /api/v1/products/:id', () => {
    it('7. should update product details', async () => {
      const res = await fetch(`${baseUrl}/products/${createdProductA1Id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Updated Scanner Pro',
          sellingPrice: 99.5,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.name, 'Updated Scanner Pro');
      assert.equal(Number(body.data.sellingPrice), 99.5);
    });

    it('12. should reject cross-organization update (User B updating Product A)', async () => {
      const res = await fetch(`${baseUrl}/products/${createdProductA1Id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          name: 'Malicious Change',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 404);
      assert.equal(body.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Stock Quantity Update
  // ---------------------------------------------------------------------------
  describe('PATCH /api/v1/products/:id/quantity', () => {
    it('8. should update stock quantity', async () => {
      const res = await fetch(`${baseUrl}/products/${createdProductA1Id}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          quantity: 42,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.quantity, 42);
    });

    it('should reject negative stock quantity', async () => {
      const res = await fetch(`${baseUrl}/products/${createdProductA1Id}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          quantity: -5,
        }),
      });

      assert.equal(res.status, 400);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Product Deletion & Cross-Organization Rejection
  // ---------------------------------------------------------------------------
  describe('DELETE /api/v1/products/:id', () => {
    it('12. should reject cross-organization delete (User B deleting Product A)', async () => {
      const res = await fetch(`${baseUrl}/products/${createdProductA1Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      const body = await res.json();
      assert.equal(res.status, 404);
      assert.equal(body.success, false);
    });

    it('9. should delete the product for the owning organization', async () => {
      const res = await fetch(`${baseUrl}/products/${createdProductA1Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.deleted, true);

      // Verify product is gone
      const verifyRes = await fetch(`${baseUrl}/products/${createdProductA1Id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(verifyRes.status, 404);
    });
  });
});

