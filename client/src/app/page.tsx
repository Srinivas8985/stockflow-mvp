'use client';

import React from 'react';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Activity,
  Database,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
} from 'lucide-react';

export default function HomePage() {
  const { data: health, isLoading, error, refresh } = useHealthCheck();

  const isDbConnected = health?.services.database.status === 'connected';
  const isBackendHealthy = health?.status === 'healthy';

  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-16 max-w-5xl mx-auto flex flex-col justify-center">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              SF
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              StockFlow
            </h1>
            <Badge variant="success">Phase 1 Live</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multi-Tenant SaaS Inventory Management System Foundation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            isLoading={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Frontend Card */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <Layers className="h-5 w-5" />
              </span>
              <Badge variant="success">Running</Badge>
            </div>
            <CardTitle className="mt-3">Frontend Client</CardTitle>
            <CardDescription>Next.js 14 App Router + Tailwind CSS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Port:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">3000</span>
              </div>
              <div className="flex justify-between">
                <span>TypeScript:</span>
                <span className="font-mono text-emerald-600">Strict Mode</span>
              </div>
              <div className="flex justify-between">
                <span>Rendering:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">React Client/Server</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backend API Card */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                <Server className="h-5 w-5" />
              </span>
              {isLoading ? (
                <Badge variant="warning">Checking...</Badge>
              ) : isBackendHealthy ? (
                <Badge variant="success">Healthy</Badge>
              ) : (
                <Badge variant="danger">Degraded</Badge>
              )}
            </div>
            <CardTitle className="mt-3">Backend API</CardTitle>
            <CardDescription>Node.js + Express.js + Zod</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Port:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">5000</span>
              </div>
              <div className="flex justify-between">
                <span>API Version:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  {health?.version || '1.0.0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  {health ? `${Math.floor(health.uptime)}s` : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Card */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                <Database className="h-5 w-5" />
              </span>
              {isLoading ? (
                <Badge variant="warning">Checking...</Badge>
              ) : isDbConnected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="danger">Disconnected</Badge>
              )}
            </div>
            <CardTitle className="mt-3">PostgreSQL</CardTitle>
            <CardDescription>Docker Compose + Prisma ORM</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Host / Port:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">localhost:5432</span>
              </div>
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  {health?.services.database.latencyMs !== undefined
                    ? `${health.services.database.latencyMs}ms`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Container:</span>
                <span className="font-mono text-purple-600">stockflow-postgres</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Check Details */}
      <Card className="mb-8 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <CardTitle>API & Database Health Verification</CardTitle>
          </div>
          <CardDescription>
            Live verification of GET <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/api/v1/health</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5" />
                Response Payload
              </span>
              <span>{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Awaiting data'}</span>
            </div>
            <pre>
              {health
                ? JSON.stringify(health, null, 2)
                : isLoading
                ? '// Querying http://localhost:5000/api/v1/health...'
                : '// No data received from backend API'}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Modular Architecture Plan Checklist */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-slate-100/50 dark:bg-slate-900/50">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Architecture & Module Readiness (Phase 1 Baseline)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Monorepo npm Workspaces</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>PostgreSQL Docker Compose</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Centralized Error Handling</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Zod Request Validation</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Prisma ORM Singleton</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Modular Feature Boundaries</span>
          </div>
        </div>
      </div>
    </main>
  );
}

