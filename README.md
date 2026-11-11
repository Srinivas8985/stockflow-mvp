# StockFlow — Multi-Tenant SaaS Inventory Management System

StockFlow is a production-ready, multi-tenant Software-as-a-Service (SaaS) Inventory Management platform engineered for scalability, strict type-safety, maintainability, and clean architecture.

---

## 1. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (Strict Mode), Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express.js, TypeScript (Strict Mode), Zod (Validation), Morgan & Custom Logger, Helmet, CORS.
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
│   │   │   ├── auth/           # Authentication, RBAC, tenant context (Phase 2)
│   │   │   ├── organization/   # Multi-tenancy & subscription management (Phase 2)
│   │   │   ├── inventory/      # Products, stock levels, warehouse batches (Phase 3)
│   │   │   ├── analytics/      # Reports, stock valuation, forecasting (Phase 4)
│   │   │   ├── settings/       # Tenant & platform configuration (Phase 5)
│   │   │   ├── health/         # System health verification & DB ping
│   │   │   └── welcome/        # API v1 entrypoint
│   │   ├── middleware/         # Centralized error handler, 404, request logger, Zod validator
│   │   ├── utils/              # Structured logger, AppError class, API response helpers
│   │   ├── app.ts              # Express application factory & middleware pipeline
│   │   └── server.ts           # HTTP server startup & graceful shutdown lifecycle
│   ├── prisma/
│   │   └── schema.prisma       # Prisma datasource & future domain schema definitions
│   ├── tests/                  # Unit and integration test suites
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
3. **Application vs. Server Separation**: `app.ts` exports the configured Express application without listening on a network socket, allowing testing via Supertest without binding ports, while `server.ts` handles network binding, signal management, and graceful shutdown.
4. **Environment Isolation**: All configuration values and database credentials are validated via Zod on startup (`server/src/config/env.ts`).

---

## 3. Prerequisites

Ensure the following tools are installed on your host system:
- **Node.js**: `v18.0.0` or higher (`v20+` or `v22+` recommended).
- **npm**: `v9.0.0` or higher.
- **Docker & Docker Compose**: Docker Desktop (or Docker Engine with Compose plugin) for running the local PostgreSQL container.
- Alternatively, any accessible PostgreSQL instance (local or cloud-hosted) can be configured via `DATABASE_URL`.

---

## 4. Installation & Setup

### Step 1: Clone and Install Dependencies

```bash
git clone <repository-url> stockflow
cd stockflow
npm install
```

### Step 2: Configure Environment Variables

Copy the provided `.env.example` template to the appropriate locations:

```bash
# Root environment (used by Docker Compose and root tooling)
cp .env.example .env

# Server environment
cp .env.example server/.env

# Client environment
cp .env.example client/.env.local
```

Adjust any values in `server/.env` or `client/.env.local` as needed. The defaults work out of the box with the provided Docker Compose configuration.

---

## 5. Local Database Configuration (Docker Compose)

StockFlow uses Docker Compose to run a containerized PostgreSQL 16 database with persistent storage and health checks, keeping your host system clean.

### Start the Database Container

```bash
npm run docker:up
# Or directly:
docker compose up -d
```

### Verify Container Status

```bash
docker compose ps
```

The `stockflow-postgres` container will start, run `pg_isready` health checks, and expose port `5432` to `localhost`.

### View Database Logs

```bash
npm run docker:logs
# Or directly:
docker compose logs -f postgres
```

### Stop the Database Container

```bash
npm run docker:down
# Or directly:
docker compose down
```

> **Data Persistence**: Database data is stored in the Docker named volume `stockflow_pgdata` and persists across container restarts and teardowns.

### External / Production Databases

StockFlow is not locked to Docker. In staging or production, simply supply an externally managed PostgreSQL connection string in `server/.env`:

```env
DATABASE_URL="postgresql://user:password@db-host.internal:5432/stockflow_prod?sslmode=require"
```

---

## 6. Prisma ORM & Database Commands

Run these commands from the repository root:

| Command | Description |
|---|---|
| `npm run db:generate` | Generates the Prisma Client types from `schema.prisma`. |
| `npm run db:migrate` | Runs Prisma schema migrations against the configured database. |
| `npm run db:studio` | Opens Prisma Studio (web-based visual database browser). |

---

## 7. Development Commands

The root `package.json` coordinates all workspace tasks:

| Command | Action |
|---|---|
| `npm run dev` | Runs both the Express API (`:5000`) and Next.js frontend (`:3000`) concurrently. |
| `npm run build` | Builds both the backend (`tsc`) and frontend (`next build`). |
| `npm run lint` | Runs ESLint across both server and client workspaces. |
| `npm run typecheck` | Executes TypeScript type checking (`tsc --noEmit`) across both workspaces. |
| `npm run docker:up` | Starts the PostgreSQL Docker container in the background. |
| `npm run docker:down` | Stops the PostgreSQL Docker container. |

---

## 8. API Endpoints

All API endpoints are mounted under `/api/v1`.

### 1. Service Welcome

- **Method**: `GET`
- **Path**: `/api/v1/`
- **Description**: Returns basic API service information.
- **Sample Response**:
  ```json
  {
    "success": true,
    "message": "Welcome to StockFlow API v1",
    "data": {
      "name": "StockFlow API",
      "description": "Multi-Tenant SaaS Inventory Management System API",
      "documentation": "/api/v1/health"
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```

### 2. Deep Health Check

- **Method**: `GET`
- **Path**: `/api/v1/health`
- **Description**: Verifies real-time application uptime, version, and **active PostgreSQL database connectivity** via Prisma.
- **HTTP Status Codes**:
  - `200 OK`: When the database is connected and responsive.
  - `503 Service Unavailable`: When the database is unreachable or disconnected.
- **Sample Response (Healthy)**:
  ```json
  {
    "success": true,
    "message": "Service health check passed",
    "data": {
      "status": "healthy",
      "timestamp": "2026-11-11T12:00:00.000Z",
      "uptime": 42.15,
      "version": "1.0.0",
      "services": {
        "database": {
          "status": "connected",
          "latencyMs": 4
        }
      }
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```
- **Sample Response (Degraded / DB Offline)**:
  ```json
  {
    "success": false,
    "message": "Service health check degraded",
    "data": {
      "status": "degraded",
      "timestamp": "2026-11-11T12:00:00.000Z",
      "uptime": 45.2,
      "version": "1.0.0",
      "services": {
        "database": {
          "status": "disconnected",
          "error": "Can't reach database server at `localhost:5432`"
        }
      }
    },
    "meta": {
      "timestamp": "2026-11-11T12:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```

---

## 9. Security & Production Practices

- **Zero Hardcoded Secrets**: All credentials reside in `.env` files that are ignored by Git.
- **Production-Ready Security Headers**: Integrated Helmet middleware for HTTP header hardening.
- **Graceful Shutdown**: The Express server intercepts `SIGINT` and `SIGTERM` signals to close active HTTP connections and safely disconnect the Prisma client pool.
- **Stateless Architecture**: Ready for horizontal scaling across cloud containers without sticky sessions.

