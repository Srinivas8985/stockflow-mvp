import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Frontend: Authentication Validation & Protected Route Logic', () => {
  // ---------------------------------------------------------------------------
  // 1. Signup Input Validation Rules
  // ---------------------------------------------------------------------------
  describe('Signup Form Validation Logic', () => {
    function validateSignup(data: {
      name?: string;
      email?: string;
      password?: string;
      organizationName?: string;
    }): { valid: boolean; errors: Record<string, string> } {
      const errors: Record<string, string> = {};

      if (!data.name || !data.name.trim()) {
        errors.name = 'Full name is required';
      }
      if (!data.organizationName || !data.organizationName.trim()) {
        errors.organizationName = 'Organization name is required';
      }
      if (!data.email || !data.email.trim()) {
        errors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
      if (!data.password) {
        errors.password = 'Password is required';
      } else if (data.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }

      return { valid: Object.keys(errors).length === 0, errors };
    }

    it('should validate a complete, valid signup payload', () => {
      const result = validateSignup({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123!',
        organizationName: 'Acme Logistics',
      });
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, {});
    });

    it('should reject signup with missing required fields', () => {
      const result = validateSignup({});
      assert.equal(result.valid, false);
      assert.ok(result.errors.name);
      assert.ok(result.errors.email);
      assert.ok(result.errors.password);
      assert.ok(result.errors.organizationName);
    });

    it('should reject invalid email format', () => {
      const result = validateSignup({
        name: 'Jane Doe',
        email: 'invalid-email-no-at-domain',
        password: 'Password123!',
        organizationName: 'Acme Logistics',
      });
      assert.equal(result.valid, false);
      assert.equal(result.errors.email, 'Please enter a valid email address');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validateSignup({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'short',
        organizationName: 'Acme Logistics',
      });
      assert.equal(result.valid, false);
      assert.equal(result.errors.password, 'Password must be at least 8 characters');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Login Input Validation Rules
  // ---------------------------------------------------------------------------
  describe('Login Form Validation Logic', () => {
    function validateLogin(data: {
      email?: string;
      password?: string;
    }): { valid: boolean; errors: Record<string, string> } {
      const errors: Record<string, string> = {};

      if (!data.email || !data.email.trim()) {
        errors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
      if (!data.password) {
        errors.password = 'Password is required';
      }

      return { valid: Object.keys(errors).length === 0, errors };
    }

    it('should accept valid email and non-empty password', () => {
      const result = validateLogin({
        email: 'user@example.com',
        password: 'Password123!',
      });
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, {});
    });

    it('should reject empty login fields', () => {
      const result = validateLogin({});
      assert.equal(result.valid, false);
      assert.ok(result.errors.email);
      assert.ok(result.errors.password);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Protected Route & Session Guard Logic
  // ---------------------------------------------------------------------------
  describe('Protected Route Navigation Guards', () => {
    function resolveRouteAccess(
      pathname: string,
      isAuthenticated: boolean
    ): { allow: boolean; redirectTo?: string } {
      const publicRoutes = ['/', '/login', '/signup'];
      const isPublic = publicRoutes.includes(pathname);

      if (!isAuthenticated && !isPublic) {
        return { allow: false, redirectTo: '/login' };
      }
      if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
        return { allow: false, redirectTo: '/dashboard' };
      }
      return { allow: true };
    }

    it('should redirect unauthenticated users from /dashboard to /login', () => {
      const access = resolveRouteAccess('/dashboard', false);
      assert.equal(access.allow, false);
      assert.equal(access.redirectTo, '/login');
    });

    it('should redirect unauthenticated users from /products to /login', () => {
      const access = resolveRouteAccess('/products', false);
      assert.equal(access.allow, false);
      assert.equal(access.redirectTo, '/login');
    });

    it('should redirect unauthenticated users from /settings to /login', () => {
      const access = resolveRouteAccess('/settings', false);
      assert.equal(access.allow, false);
      assert.equal(access.redirectTo, '/login');
    });

    it('should allow authenticated users on /dashboard', () => {
      const access = resolveRouteAccess('/dashboard', true);
      assert.equal(access.allow, true);
    });

    it('should redirect already-authenticated users away from /login to /dashboard', () => {
      const access = resolveRouteAccess('/login', true);
      assert.equal(access.allow, false);
      assert.equal(access.redirectTo, '/dashboard');
    });

    it('should allow unauthenticated visitors on landing page /', () => {
      const access = resolveRouteAccess('/', false);
      assert.equal(access.allow, true);
    });
  });
});

