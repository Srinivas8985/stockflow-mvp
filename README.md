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
