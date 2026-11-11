import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';

describe('Phase 2: Authentication & Multi-Tenant Isolation', () => {
  let server: Server;
  let baseUrl: string;

  const testUserA = {
    name: 'Alice Founder',
    email: `alice.${Date.now()}@stockflow-test.io`,
    password: 'Password123!',
    organizationName: 'Alpha Warehouse Corp',
  };

  const testUserB = {
    name: 'Bob Operator',
    email: `bob.${Date.now()}@stockflow-test.io`,
    password: 'Password123!',
    organizationName: 'Beta Logistics Inc',
  };

  let tokenA: string;
  let tokenB: string;
  let orgIdA: string;
  let orgIdB: string;

  before(async () => {
    // Start temporary test server on random free port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up created test accounts
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
      // Ignore disconnect errors during teardown
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Signup Tests
  // ---------------------------------------------------------------------------
  describe('POST /auth/signup', () => {
    it('should successfully register a new user and organization', async () => {
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUserA),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.ok(body.data.token, 'Should return JWT token');
      assert.equal(body.data.user.email, testUserA.email.toLowerCase());
      assert.equal(body.data.organization.name, testUserA.organizationName);
      assert.equal(body.data.user.passwordHash, undefined, 'Must never return passwordHash');

      tokenA = body.data.token;
      orgIdA = body.data.organization.id;
    });

    it('should reject signup with duplicate email (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUserA),
      });

      const body = await res.json();
      assert.equal(res.status, 409);
      assert.equal(body.success, false);
      assert.match(body.message, /already exists/i);
    });

    it('should reject signup with missing required fields (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'incomplete@example.com',
          // missing name, password, organizationName
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.equal(body.error?.code, 'VALIDATION_ERROR');
    });

    it('should reject signup with a weak password (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Weak Pass User',
          email: `weak.${Date.now()}@example.com`,
          password: 'pass', // Too short, no numbers, no uppercase
          organizationName: 'Weak Org',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Login Tests
  // ---------------------------------------------------------------------------
  describe('POST /auth/login', () => {
    it('should successfully login and return a valid JWT', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserA.email,
          password: testUserA.password,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(body.data.token);
      assert.equal(body.data.user.email, testUserA.email.toLowerCase());
      assert.equal(body.data.user.passwordHash, undefined);
    });

    it('should reject incorrect password with generic 401 error', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserA.email,
          password: 'WrongPassword999!',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid email or password');
    });

    it('should reject non-existent user with generic 401 without revealing email presence', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent.user.random@stockflow-test.io',
          password: 'SomePassword123!',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.message, 'Invalid email or password');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Protected Profile & JWT Verification Tests
  // ---------------------------------------------------------------------------
  describe('GET /auth/me', () => {
    it('should reject requests without a token (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`);
      assert.equal(res.status, 401);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /token required/i);
    });

    it('should reject requests with malformed or invalid token (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: 'Bearer invalid.token.payload' },
      });
      assert.equal(res.status, 401);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /invalid|malformed/i);
    });

    it('should reject requests with expired token (401 Unauthorized)', async () => {
      const expiredToken = jwt.sign(
        {
          userId: orgIdA,
          organizationId: orgIdA,
          email: testUserA.email,
        },
        env.JWT_SECRET,
        { expiresIn: -10 } // Expired 10 seconds ago
      );

      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      assert.equal(res.status, 401);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /expired/i);
    });

    it('should return safe user profile and organization with a valid token', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.email, testUserA.email.toLowerCase());
      assert.equal(body.data.organization.id, orgIdA);
      assert.equal(body.data.passwordHash, undefined, 'passwordHash must never be exposed');
    });

    it('should successfully logout and clear authentication cookie', async () => {
      const res = await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.loggedOut, true);

      // Verify Set-Cookie header clears the token
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie, 'Should send Set-Cookie header');
      assert.match(setCookie, /token=;/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Multi-Tenant Isolation Tests
  // ---------------------------------------------------------------------------
  describe('Multi-Tenant Isolation Verification', () => {
    it('should create second organization (Org B) for isolation testing', async () => {
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUserB),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      tokenB = body.data.token;
      orgIdB = body.data.organization.id;

      assert.notEqual(orgIdA, orgIdB, 'Organizations must have distinct IDs');
    });

    it('User A must only access Organization A details, never Organization B', async () => {
      const resA = await fetch(`${baseUrl}/organization/current`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const bodyA = await resA.json();

      assert.equal(resA.status, 200);
      assert.equal(bodyA.data.id, orgIdA);
      assert.equal(bodyA.data.name, testUserA.organizationName);

      const resB = await fetch(`${baseUrl}/organization/current`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const bodyB = await resB.json();

      assert.equal(resB.status, 200);
      assert.equal(bodyB.data.id, orgIdB);
      assert.equal(bodyB.data.name, testUserB.organizationName);

      // Verify strict separation
      assert.notEqual(bodyA.data.id, bodyB.data.id);
    });

    it('Updating Organization A using User A credentials never alters Organization B', async () => {
      const updatedName = 'Alpha Super Warehouses 2026';

      const updateRes = await fetch(`${baseUrl}/organization/current`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ name: updatedName }),
      });

      assert.equal(updateRes.status, 200);

      // Fetch Org B and verify it remains completely unchanged
      const checkOrgB = await fetch(`${baseUrl}/organization/current`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const bodyB = await checkOrgB.json();

      assert.equal(bodyB.data.id, orgIdB);
      assert.equal(bodyB.data.name, testUserB.organizationName);
      assert.notEqual(bodyB.data.name, updatedName);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Existing Health and Welcome Endpoint Compatibility
  // ---------------------------------------------------------------------------
  describe('Phase 1 Compatibility Verification', () => {
    it('GET /api/v1/ returns API welcome message', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });

    it('GET /api/v1/health returns application and database status', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.ok(res.status === 200 || res.status === 503);
      const body = await res.json();
      assert.ok(body.data.services.database);
    });
  });
});

