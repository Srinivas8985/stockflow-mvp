# StockFlow — Multi-Tenant SaaS Inventory Management System

StockFlow is a production-ready, multi-tenant Software-as-a-Service (SaaS) Inventory Management platform engineered for scalability, strict type-safety, maintainability, and clean architecture.

---

## 1. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (Strict Mode), Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express.js, TypeScript (Strict Mode), Zod (Validation), Morgan & Custom Logger, Helmet, CORS, bcryptjs, jsonwebtoken.
- **Database & ORM**: PostgreSQL, Prisma ORM.
- **Infrastructure (Local)**: Docker Compose for local PostgreSQL containerization.
- **Workspace Manager**: npm Workspaces (monorepo).

---

## 2. Architecture Overview

StockFlow is structured as an npm monorepo separating the user-facing Next.js application and the stateless Express.js REST API service:

```
stockflow/
├── client/                     # Next.js App Router Web Application
│   ├── src/
│   │   ├── app/                # Layouts, pages, global CSS
│   │   ├── components/         # Reusable UI component library (Card, Badge, Button)
│   │   ├── features/           # Feature-level components and hooks
│   │   ├── hooks/              # Custom React hooks (e.g. useHealthCheck)
│   │   ├── lib/                # API client configuration and shared utilities
│   │   └── types/              # Frontend TypeScript definitions and API contracts
│   ├── public/                 # Static assets
│   ├── next.config.mjs         # Next.js configuration
│   ├── tailwind.config.ts      # Tailwind CSS styling tokens
│   ├── tsconfig.json           # Strict TypeScript configuration
│   └── package.json
│
├── server/                     # Express.js REST API Service
│   ├── src/
│   │   ├── config/             # Zod environment parsing and Prisma client singleton
│   │   ├── modules/            # Domain-driven modular architecture
│   │   │   ├── auth/           # User signup, login, JWT token issuing, /me (Phase 2)
│   │   │   ├── organization/   # Tenant-isolated organization retrieval & updates (Phase 2)
│   │   │   ├── inventory/      # Products, stock levels, warehouse batches (Phase 3)
│   │   │   ├── analytics/      # Reports, stock valuation, forecasting (Phase 4)
│   │   │   ├── settings/       # Tenant & platform configuration (Phase 5)
│   │   │   ├── health/         # System health verification & DB ping (Phase 1)
│   │   │   └── welcome/        # API v1 entrypoint (Phase 1)
│   │   ├── middleware/         # Auth, tenant isolation, error handler, 404, request logger, Zod validator
│   │   ├── utils/              # JWT, bcrypt password hashing, structured logger, AppError class, API responses
│   │   ├── app.ts              # Express application factory & middleware pipeline
│   │   └── server.ts           # HTTP server startup & graceful shutdown lifecycle
│   ├── prisma/
│   │   └── schema.prisma       # Prisma datasource, Organization, User, and SystemHealth models
│   ├── tests/                  # Automated integration tests (auth, multi-tenant isolation)
│   ├── tsconfig.json           # Strict TypeScript configuration
│   └── package.json
│
├── docker-compose.yml          # Local PostgreSQL container definition
├── package.json                # Monorepo workspaces & root execution scripts
├── .gitignore                  # Production Git ignore patterns
├── .env.example                # Canonical environment variable reference
└── README.md
```

### Architectural Principles
1. **Stateless Backend**: The Express API maintains zero server-side session state in memory, allowing horizontal scaling behind load balancers.
2. **Explicit Module Boundaries**: Feature directories (`auth`, `organization`, `inventory`, etc.) are decoupled to enable eventual extraction into independent microservices if needed.
3. **Application vs. Server Separation**: `app.ts` exports the configured Express application without listening on a network socket, allowing testing via Supertest or native runners without binding ports, while `server.ts` handles network binding, signal management, and graceful shutdown.
4. **Environment Isolation**: All configuration values and database credentials are validated via Zod on startup (`server/src/config/env.ts`).
5. **Strict Multi-Tenant Isolation**: Client-supplied `organizationId` headers or body payloads are NEVER trusted for authorization. All tenant contexts are derived strictly from the validated JWT token signed by the server.

---

## 3. Database Models (Phase 2, Phase 3 & Phase 4)

```prisma
model Organization {
  id                       String    @id @default(uuid())
  name                     String
  defaultLowStockThreshold Int       @default(10)
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt

  // Relationships
  user     User?
  products Product[]

  @@map("organizations")
}

model User {
  id             String       @id @default(uuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name           String
  email          String       @unique
  passwordHash   String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([email])
  @@map("users")
}

model Product {
  id                String       @id @default(uuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name              String
  sku               String
  description       String?
  quantity          Int          @default(0)
  costPrice         Decimal?     @db.Decimal(12, 2)
  sellingPrice      Decimal?     @db.Decimal(12, 2)
  lowStockThreshold Int?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  // Composite uniqueness and query indexing
  @@unique([organizationId, sku])
  @@index([organizationId])
  @@index([organizationId, name])
  @@index([organizationId, createdAt])
  @@map("products")
}
```

---

## 4. Prerequisites

Ensure the following tools are installed on your host system:
- **Node.js**: `v18.0.0` or higher (`v20+` or `v22+` recommended).
- **npm**: `v9.0.0` or higher.
- **Docker & Docker Compose**: For running the local PostgreSQL container.
- Alternatively, any accessible PostgreSQL instance can be configured via `DATABASE_URL`.

---

## 5. Environment Variables Setup

Copy `.env.example` to root `.env`, `server/.env`, and `client/.env.local`:

```bash
cp .env.example .env
cp .env.example server/.env
cp .env.example client/.env.local
```

### Required Variables (`server/.env`)

```env
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
DATABASE_URL="postgresql://stockflow:stockflow_secret@localhost:5432/stockflow_dev?schema=public"
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_in_production_min_16_chars
JWT_EXPIRES_IN=24h
```

---

## 6. Database Migrations

Run database migrations to apply the schema:

```bash
# Phase 2: User & Organization schema
npm run db:migrate -- --name init_auth_multitenancy

# Phase 3: Product inventory schema
npm run db:migrate -- --name add_product_inventory

# Phase 4: Organization default low stock threshold
npm run db:migrate -- --name add_organization_default_low_stock_threshold

# Re-generate Prisma Client
npm run db:generate
```

---

## 7. Development & Testing Commands

Run from the repository root:

| Command | Action |
|---|---|
| `npm run dev` | Runs Express API (`:5000`) and Next.js (`:3000`) concurrently. |
| `npm run test` | Executes automated integration tests covering signup, login, JWT validation, and multi-tenant isolation. |
| `npm run typecheck` | Runs TypeScript strict checks (`tsc --noEmit`) across both workspaces. |
| `npm run lint` | Runs ESLint across both workspaces. |
| `npm run build` | Builds both server and client for production. |
| `npm run docker:up` | Starts local PostgreSQL container in background. |
| `npm run docker:down` | Stops local PostgreSQL container. |

---

## 8. Authentication & Tenant API Documentation

All API endpoints are mounted under `/api/v1`.

### 1. User & Organization Signup

Creates an organization and its initial administrator user in a single atomic transaction.

- **Method**: `POST`
- **Path**: `/api/v1/auth/signup`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "StrongPassword123",
    "organizationName": "Acme Logistics"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User and organization registered successfully",
    "data": {
      "user": {
        "id": "e9c1d2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
        "organizationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "John Doe",
        "email": "john@example.com",
        "createdAt": "2026-11-11T12:00:00.000Z"
      },
      "organization": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Acme Logistics",
        "createdAt": "2026-11-11T12:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```

---

### 2. User Login

Authenticates credentials and issues a JWT token containing trusted user and organization claims.

- **Method**: `POST`
- **Path**: `/api/v1/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "StrongPassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "User authenticated successfully",
    "data": {
      "user": {
        "id": "e9c1d2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
        "organizationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "John Doe",
        "email": "john@example.com",
        "createdAt": "2026-11-11T12:00:00.000Z"
      },
      "organization": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Acme Logistics",
        "createdAt": "2026-11-11T12:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```

---

### 3. Authenticated User Profile (`/auth/me`)

Retrieves the authenticated user's profile and organization context.

- **Method**: `GET`
- **Path**: `/api/v1/auth/me`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Authenticated profile retrieved successfully",
    "data": {
      "id": "e9c1d2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
      "organizationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2026-11-11T12:00:00.000Z",
      "organization": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Acme Logistics",
        "createdAt": "2026-11-11T12:00:00.000Z"
      }
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```

---

## 9. Multi-Tenant Isolation Design

Every authenticated request passes through the `authenticate` middleware, which verifies the signed JWT and extracts `{ userId, organizationId }` into `req.user`.

### Security Guarantees:
1. **Never trust client-supplied IDs**: Any `organizationId` sent in request headers or body by the client is completely ignored and blocked by `.strict()` Zod schemas.
2. **Organization-scoped queries**: All database operations (create, read, update, delete) unconditionally scope queries with `organizationId: req.user.organizationId`.
3. **Database-level constraint**: The `Product` model carries a mandatory `organizationId` foreign key and composite uniqueness constraint `@@unique([organizationId, sku])`, allowing independent organizations to use identical SKUs without conflict.
4. **Cross-Tenant Access Prevention**: Attempting to query, update, or delete products belonging to another organization yields a `404 Not Found` response, completely preventing information leakage.

---

## 10. Inventory Management API Documentation (Phase 3)

All inventory endpoints are mounted under `/api/v1/products` and require a valid Bearer JWT header:
`Authorization: Bearer <token>`

### 1. Create Product
Creates a new product scoped to the authenticated organization.

- **Method**: `POST`
- **Path**: `/api/v1/products`
- **Request Body**:
  ```json
  {
    "name": "Industrial Widget X1",
    "sku": "WGT-X1-001",
    "description": "High durability industrial widget",
    "quantity": 100,
    "costPrice": 45.50,
    "sellingPrice": 89.99,
    "lowStockThreshold": 15
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Product created successfully",
    "data": {
      "id": "7b1c3e4a-9e12-4f1a-b321-8f9c0e2d4a5b",
      "organizationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Industrial Widget X1",
      "sku": "WGT-X1-001",
      "description": "High durability industrial widget",
      "quantity": 100,
      "costPrice": "45.50",
      "sellingPrice": "89.99",
      "lowStockThreshold": 15,
      "createdAt": "2026-11-11T12:00:00.000Z",
      "updatedAt": "2026-11-11T12:00:00.000Z"
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Validation failure (negative price/quantity, missing name/SKU).
  - `401 Unauthorized`: Missing or invalid JWT.
  - `409 Conflict`: SKU already exists in this organization.

---

### 2. List Products (Paginated & Filterable)
Returns products belonging exclusively to the authenticated tenant.

- **Method**: `GET`
- **Path**: `/api/v1/products`
- **Query Parameters**:
  - `page` (optional, default: `1`): Page number (min: 1).
  - `limit` (optional, default: `20`): Items per page (min: 1, max: 100).
  - `search` (optional): Case-insensitive search across `name` and `sku`.
  - `lowStock` (optional, `true` or `false`): Filter products where `quantity <= lowStockThreshold`.
- **Example**: `/api/v1/products?page=1&limit=10&search=widget&lowStock=true`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Products retrieved successfully",
    "data": [
      {
        "id": "7b1c3e4a-9e12-4f1a-b321-8f9c0e2d4a5b",
        "organizationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Industrial Widget X1",
        "sku": "WGT-X1-001",
        "description": "High durability industrial widget",
        "quantity": 5,
        "costPrice": "45.50",
        "sellingPrice": "89.99",
        "lowStockThreshold": 15,
        "createdAt": "2026-11-11T12:00:00.000Z",
        "updatedAt": "2026-11-11T12:00:00.000Z"
      }
    ],
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0",
      "pagination": {
        "page": 1,
        "limit": 10,
        "totalItems": 1,
        "totalPages": 1,
        "hasNext": false,
        "hasPrev": false
      }
    }
  }
  ```

---

### 3. Get Product By ID
Retrieves details for a single product within the caller's organization.

- **Method**: `GET`
- **Path**: `/api/v1/products/:id`
- **Response (200 OK)**: Product object.
- **Error Codes**:
  - `404 Not Found`: If product does not exist or belongs to another organization.

---

### 4. Update Product
Updates product metadata (name, description, sku, costPrice, sellingPrice, lowStockThreshold). Note: `organizationId` cannot be updated.

- **Method**: `PATCH`
- **Path**: `/api/v1/products/:id`
- **Request Body**:
  ```json
  {
    "name": "Industrial Widget X1 Pro",
    "sellingPrice": 99.99,
    "lowStockThreshold": 20
  }
  ```
- **Response (200 OK)**: Updated product object.
- **Error Codes**:
  - `400 Bad Request`: Invalid validation data.
  - `404 Not Found`: Product not found or belongs to another tenant.
  - `409 Conflict`: New SKU already exists in this organization.

---

### 5. Update Stock Quantity
Dedicated endpoint for adjusting or setting stock levels.

- **Method**: `PATCH`
- **Path**: `/api/v1/products/:id/quantity`
- **Request Body**:
  ```json
  {
    "quantity": 150
  }
  ```
- **Response (200 OK)**: Updated product object with new `quantity`.
- **Error Codes**:
  - `400 Bad Request`: If `quantity` is negative or not an integer.
  - `404 Not Found`: Product not found in tenant.

---

### 6. Delete Product
Removes a product from the organization's catalog.

- **Method**: `DELETE`
- **Path**: `/api/v1/products/:id`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Product deleted successfully",
    "data": {
      "id": "7b1c3e4a-9e12-4f1a-b321-8f9c0e2d4a5b"
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```
- **Error Codes**:
  - `404 Not Found`: If product does not exist or belongs to another organization.

---

## 11. Dashboard Analytics & Organization Settings API (Phase 4)

All endpoints require a valid Bearer JWT: `Authorization: Bearer <token>`.

### 1. Dashboard Analytics
Computes aggregated inventory metrics and low-stock replenishment alerts for the tenant.

- **Method**: `GET`
- **Path**: `/api/v1/analytics/dashboard`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Dashboard analytics retrieved successfully",
    "data": {
      "totalProducts": 4,
      "totalQuantity": 90,
      "lowStockCount": 2,
      "lowStockProducts": [
        {
          "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
          "organizationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "name": "Widget Low Stock",
          "sku": "WGT-LOW-001",
          "description": "Essential component",
          "quantity": 12,
          "costPrice": "20.00",
          "sellingPrice": "40.00",
          "lowStockThreshold": null,
          "createdAt": "2026-11-11T12:00:00.000Z",
          "updatedAt": "2026-11-11T12:00:00.000Z"
        }
      ]
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```
- **Effective Threshold Logic**:
  - If a product has a custom `lowStockThreshold`, it strictly overrides the organization default.
  - If a product has no custom threshold (`null`), the organization's `defaultLowStockThreshold` (default: 10) is applied.
  - A product is classified as low stock if `quantity <= effectiveThreshold`.
  - Empty inventory safely returns `totalProducts: 0`, `totalQuantity: 0`, `lowStockCount: 0`, and `lowStockProducts: []`.

---

### 2. Get Organization Settings
Retrieves tenant configuration, including the default low-stock threshold.

- **Method**: `GET`
- **Path**: `/api/v1/settings`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Settings retrieved successfully",
    "data": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Acme Logistics",
      "defaultLowStockThreshold": 10,
      "createdAt": "2026-11-11T12:00:00.000Z",
      "updatedAt": "2026-11-11T12:00:00.000Z"
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```

---

### 3. Update Organization Settings
Updates tenant configuration settings.

- **Method**: `PATCH`
- **Path**: `/api/v1/settings`
- **Request Body**:
  ```json
  {
    "defaultLowStockThreshold": 15
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Settings updated successfully",
    "data": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Acme Logistics",
      "defaultLowStockThreshold": 15,
      "createdAt": "2026-11-11T12:00:00.000Z",
      "updatedAt": "2026-11-11T12:00:00.000Z"
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Negative numbers, non-integers, strings, or unrecognized properties.
  - `401 Unauthorized`: Missing or invalid Bearer token.

---

## 12. Automated Test Coverage

The test suite covers full end-to-end multi-tenant isolation, inventory CRUD, and dashboard analytics:

1. **Authentication & Multi-Tenancy (`tests/auth.test.ts`)**:
   - Atomic organization & user registration.
   - Credentials verification and JWT signing.
   - Protected `/auth/me` and `/organization/current` endpoints.
   - Prevention of duplicate email registrations.

2. **Inventory Management (`tests/inventory.test.ts`)**:
   - Product creation, duplicate SKU enforcement per organization, and cross-organization SKU coexistence.
   - Paginated listings, substring name/SKU search, and low-stock filtering.
   - Granular updates and stock quantity adjustments.
   - Product deletion and cross-tenant modification prevention.

3. **Dashboard Analytics & Settings (`tests/analytics_settings.test.ts`)**:
   - Empty inventory baseline verification (zero counts and empty array).
   - Total product count and total quantity sum using database aggregations.
   - Low-stock count and list generation using effective thresholds.
   - Custom product threshold precedence over organization default threshold.
   - Updating and reading default low-stock threshold with Zod validation.
   - Strict rejection of invalid thresholds (negative, floats, unexpected properties).
   - Complete cross-tenant isolation of metrics, products, and configurations.

4. **Frontend Integration & Validation (`client/tests/frontend.test.ts`)**:
   - Signup and login client-side validation rules (password complexity, email regex, required organization).
   - JWT storage persistence and session cleanup on logout.
   - Protected route access control evaluation and automatic redirection.
   - Effective threshold calculation (product-specific vs. organization default).
   - Product query parameter builder for search and filtering.
   - Product creation and update payload sanitization.
   - Deletion confirmation dialog ID binding.
   - Organization settings threshold boundaries (non-negative integer enforcement).

---

## 13. Frontend Architecture & User Interface (Phase 5)

StockFlow provides a modern B2B SaaS web interface built with Next.js 14 App Router, React 18, and Tailwind CSS.

### Key Pages & Navigation:

1. **Authentication (`/login`, `/signup`)**:
   - Organization registration with initial admin user.
   - Credential validation with feedback.
   - Automatic redirection for authenticated sessions.
2. **Dashboard (`/dashboard`)**:
   - Live aggregated metrics: Total Products, Total Quantity On Hand, and Low Stock Alerts.
   - Low-stock replenishment table with effective threshold comparison and restock shortcuts.
   - Empty-state illustrations for both clean inventories and zero-product accounts.
3. **Inventory Management (`/products`)**:
   - Responsive product data table with SKU, prices, quantity, and stock status badges.
   - Dedicated inline stock stepper controls (+ and - buttons) next to every product for single-unit adjustments.
   - Strict boundary enforcement: prevents decreasing quantity below zero.
   - Concurrency lock: disables buttons and shows loading spinner during update to prevent duplicate requests.
   - Real-time search by product name and SKU.
   - Low-stock filter toggle.
   - Server-side pagination controls.
   - Product creation and editing modals with validation and duplicate SKU error handling.
   - Quick stock quantity adjustment modal (+1, +10, -1, -10 and direct input).
   - Destructive deletion confirmation dialog.
4. **Organization Settings (`/settings`)**:
   - Tenant metadata display (organization name, organization ID, admin email, creation date).
   - Configurable default low-stock threshold with instant persistence.
5. **Reusable Application Layout (`AppLayout`)**:
   - Collapsible mobile navigation drawer and persistent desktop sidebar.
   - Route highlight indication (`/dashboard`, `/products`, `/settings`).
   - Session guard that routes unauthenticated users directly to `/login`.
   - User profile badge and sign-out button.

---

## 14. Phase 6: Comprehensive Testing & Security Hardening

### 1. Testing Framework & Tooling

- **Test Runner**: Node.js built-in native test runner (`node:test`) paired with strict assertion module (`node:assert/strict`), executed directly through `tsx`.
- **Network Testing**: Native standard `fetch` API against ephemeral test server bindings on random open ports (`server.listen(0)`), ensuring isolated test instances without port contention.
- **Database Isolation**: Ephemeral test tenant organizations created per suite and cleaned up on teardown (`after` hook).

### 2. Test Suites

- **Backend Suites (`server/tests/`)**:
  - `auth.test.ts`: Signup, duplicate email rejection, bcrypt verification, generic credential failure, missing/malformed/expired JWT handling, protected profile access, and multi-tenant user isolation.
  - `inventory.test.ts`: CRUD lifecycle, duplicate SKU rejection within organization, SKU sharing across distinct organizations, pagination, name/SKU substring search, low-stock filtering, negative price/quantity rejection, cross-tenant modification prevention, and concurrent quantity updates with database persistence.
  - `analytics-settings.test.ts`: Empty-inventory metric baselines, total products and total quantity sums, effective threshold resolution (product-specific vs. organization default), organization threshold modification via PATCH, Zod schema validation (integer, non-negative), and tenant metric isolation.
  - `health.test.ts`: Health check contract and database connectivity verification.

- **Frontend Suites (`client/tests/`)**:
  - `auth-validation.test.ts`: Signup and login form validation rules (email regex, password length), route protection logic, and unauthenticated redirect behaviors.
  - `inventory-logic.test.ts`: Single-unit stepper calculations (+1/-1), lower-bound clamp at zero, duplicate request locking, product form validation, URL query string building, and deletion confirmation safeguards.
  - `dashboard-settings.test.ts`: Stock status classification (out-of-stock, low-stock, in-stock), threshold resolution precedence, KPI aggregation calculations, and organization setting form validation.

### 3. Security Hardening Measures

1. **Password Hashing**: `bcryptjs` with 10 salt rounds; plaintext passwords are never logged or stored.
2. **Tenant Scoping**: All database queries strictly bind `organizationId` from authenticated JWT claims (`req.user.organizationId`). Client-supplied tenant IDs in headers or request bodies are ignored.
3. **Input Sanitization**: Strict Zod schemas with `.strict()` parsing on updates, disallowing unauthorized fields.
4. **SQL Injection Defense**: 100% parameterized Prisma queries with no raw SQL execution.
5. **Git Hygiene & Secret Protection**: Normalized `.gitignore` (resolved legacy conflict markers) ensuring `.env`, credentials, and local keys are never committed.
6. **Production Error Masking**: Unhandled exceptions are logged internally with stack traces but masked as generic `Internal server error` in production environments.
7. **Enumeration Protection**: Generic `Invalid email or password` responses on failed logins prevent user account enumeration.

### 4. Running the Test Suite

```powershell
# Run full test suite across both workspaces
npm run test

# Run backend integration tests only
npm run test --workspace=server

# Run frontend logic tests only
npm run test --workspace=client

# Verify TypeScript strict type-checking
npm run typecheck

# Run ESLint linting
npm run lint

# Production build check
npm run build
```

---

## 15. Phase 7: Production Docker Deployment on AWS EC2

StockFlow is packaged into containerized multi-stage micro-services orchestrated via Docker Compose and secured behind a Caddy reverse proxy with automated Let's Encrypt SSL/TLS certificates directly on your EC2 Public IPv4 address (no custom domain required).

```
 Internet (HTTPS 443 / HTTP 80)
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ Caddy Reverse Proxy (Let's Encrypt Public IP TLS)     │
│   ├── /api/*   ──► Backend Container (Port 5000)      │
│   └── /*       ──► Frontend Container (Port 3000)     │
└────────────────────────────────────────────────────────┘
            │               │
            ▼               ▼
┌───────────────────────┐ ┌──────────────────────────────┐
│ Express API Backend   │ │ Next.js Frontend (Standalone)│
│ (Port 5000 - Internal)│ │ (Port 3000 - Internal)       │
└───────────────────────┘ └──────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ PostgreSQL 16 Database                                 │
│ (Port 5432 - Internal, Named Volume: stockflow_pgdata) │
└────────────────────────────────────────────────────────┘
```

### 1. Resource Constraints & Docker Hub Workflow

The production EC2 instance has limited resources (~2 GB RAM, 2 vCPUs). Compiling TypeScript and bundling Next.js on an instance with 2 GB RAM can trigger Out-Of-Memory (OOM) process termination.

**Recommended Production Workflow**:
1. Build and tag frontend and backend Docker images locally on your development machine.
2. Push images to your Docker Hub repository.
3. On EC2, simply pull the prebuilt images and launch via Docker Compose.

### 2. Local Machine: Build & Push Images to Docker Hub

Run from the project root on your local machine:

```powershell
# Set your Docker Hub username and release version
$DOCKER_USER = "yourdockerhubusername"
$VERSION = "1.0.0"

# 1. Log in to Docker Hub
docker login

# 2. Build the backend image (multi-stage production build with Prisma)
docker build -f server/Dockerfile -t ${DOCKER_USER}/stockflow-backend:${VERSION} -t ${DOCKER_USER}/stockflow-backend:latest .

# 3. Build the frontend image (Next.js standalone build with relative API routing)
docker build -f client/Dockerfile -t ${DOCKER_USER}/stockflow-frontend:${VERSION} -t ${DOCKER_USER}/stockflow-frontend:latest .

# 4. Push images to Docker Hub
docker push ${DOCKER_USER}/stockflow-backend:${VERSION}
docker push ${DOCKER_USER}/stockflow-backend:latest
docker push ${DOCKER_USER}/stockflow-frontend:${VERSION}
docker push ${DOCKER_USER}/stockflow-frontend:latest
```

### 3. AWS EC2 Setup & Security Group Configuration

- **Instance Sizing**: AWS EC2 `t3.small` (2 vCPU, 2 GB RAM, 29 GB gp3 SSD).
- **Public IPv4**: Assign or associate an Elastic IP (e.g. `203.0.113.195`).

#### Inbound Security Group Firewall Rules:

| Type | Protocol | Port Range | Source | Purpose |
|---|---|---|---|---|
| **SSH** | TCP | 22 | `Your-Admin-IP/32` | Secure administrative shell access |
| **HTTP** | TCP | 80 | `0.0.0.0/0`, `::/0` | Let's Encrypt ACME HTTP-01 challenge & HTTP to HTTPS redirect |
| **HTTPS** | TCP | 443 | `0.0.0.0/0`, `::/0` | Production encrypted application traffic |
| **Custom UDP** | UDP | 443 | `0.0.0.0/0`, `::/0` | HTTP/3 (QUIC) fast path |

> [!CAUTION]
> Never open ports `5432` (PostgreSQL), `5000` (Backend API), or `3000` (Frontend) in your AWS Security Group. All internal application communication takes place across the private Docker bridge network (`stockflow_net`).

### 4. Public IP HTTPS via Let's Encrypt (`profile shortlived`)

Let's Encrypt officially supports issuing publicly trusted TLS certificates directly for public IPv4 addresses using the `shortlived` profile (~6-day lifetime). Caddy automatically provisions and continuously renews these certificates in the background through the configuration in `Caddyfile`:

```caddy
{$SERVER_IP} {
    tls {
        issuer acme {
            dir https://acme-v02.api.letsencrypt.org/directory
            profile shortlived
        }
    }
    ...
```

### 5. EC2 Server Deployment Instructions

SSH into your EC2 instance and execute:

#### Step A: Install Docker & Docker Compose Plugin on EC2

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

#### Step B: Clone Repository & Configure Environment

```bash
git clone <YOUR_REPOSITORY_URL> StockFlow
cd StockFlow

# Create and configure the production environment file
cp .env.production.example .env.production
nano .env.production
```

Configure your `.env.production`:

```ini
SERVER_IP=YOUR_EC2_PUBLIC_IPV4_ADDRESS
ACME_EMAIL=admin@example.com
FRONTEND_IMAGE=yourdockerhubusername/stockflow-frontend:1.0.0
BACKEND_IMAGE=yourdockerhubusername/stockflow-backend:1.0.0
POSTGRES_USER=stockflow
POSTGRES_PASSWORD=your_strong_random_db_password_here
POSTGRES_DB=stockflow_prod
JWT_SECRET=your_32_char_cryptographic_jwt_secret_here
JWT_EXPIRES_IN=24h
NODE_ENV=production
LOG_LEVEL=info
NEXT_PUBLIC_API_URL=/api/v1
```

#### Step C: Pull Prebuilt Images & Launch the Container Stack

```bash
# Pull the prebuilt images from Docker Hub (avoids 2GB RAM build limits)
docker compose -f docker-compose.prod.yml --env-file .env.production pull

# Start all containers in detached mode
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Verify container statuses and health checks
docker compose -f docker-compose.prod.yml ps
```

The backend container automatically executes `npx prisma migrate deploy` on startup before accepting traffic.

#### Step D: Verify Deployment & Live Health

```bash
# Test health endpoint over HTTPS on your public IP
curl -ik https://YOUR_EC2_PUBLIC_IPV4_ADDRESS/api/v1/health

# View live container logs
docker compose -f docker-compose.prod.yml logs -f
```

### 6. Backup & Recovery Operations

#### Creating a Database Backup

```bash
# Create an instantaneous SQL dump without stopping containers
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U stockflow stockflow_prod > stockflow_backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Restoring a Database Backup

```bash
# Restore an SQL dump into the production database
cat backup_file.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U stockflow -d stockflow_prod
```
