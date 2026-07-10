# Phase 0.2 — System Architecture & Folder Structure

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  Next.js 15 App Router · React 19 · PWA · Pake (Desktop)      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Server      │  │ Client      │  │ Offline (POS)           │  │
│  │ Components  │  │ Components  │  │ IndexedDB + Sync Queue  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ TanStack     │  │ Zustand      │  │ React Hook Form +    │   │
│  │ Query        │  │ (POS cart,   │  │ Zod validation       │   │
│  │ (server      │  │  UI state)   │  │                      │   │
│  │  state)      │  │              │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  src/features/<module>/api/*.ts                                  │
│  src/lib/supabase/{client,server,admin}.ts                       │
│  src/lib/services/{inventory,pricing,loyalty,notifications}.ts   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      SUPABASE BACKEND                              │
│  PostgreSQL · Auth · Storage · Realtime · RLS · Edge Functions   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ Triggers   │  │ pg_cron    │  │ Materialized│  │ Edge Fn   │   │
│  │ (stock,    │  │ (alerts)   │  │ Views       │  │ (exports, │   │
│  │  loyalty,  │  │            │  │ (dashboard) │  │  webhooks)│   │
│  │  audit)    │  │            │  │             │  │           │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer Rules (Strict)

1. **UI Components** → never import `@supabase/supabase-js` directly
2. **Hooks** → call `features/*/api` only
3. **API layer** → Supabase client + Zod validation
4. **Server Actions** → thin wrappers for mutations needing server context
5. **Edge Functions** → heavy exports, scheduled jobs, webhooks

---

## Folder Structure (Final)

```
valentinoPOS/
├── .cursor/memory/              # Persistent session memory
├── .interface-design/           # Design system (system.md)
├── docs/phase-0/                # Architecture docs
├── public/
│   ├── icons/                   # PWA icons
│   └── manifest.json
├── supabase/
│   ├── migrations/              # Numbered SQL migrations
│   ├── seed.sql                 # Demo data (Arabic products)
│   └── functions/               # Edge Functions
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       # App shell: sidebar + header
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── pos/
│   │   │   ├── orders/
│   │   │   ├── events/
│   │   │   ├── calendar/
│   │   │   ├── customers/
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── suppliers/
│   │   │   ├── purchases/
│   │   │   ├── expenses/
│   │   │   ├── invoices/
│   │   │   ├── returns/
│   │   │   ├── discounts/
│   │   │   ├── reports/
│   │   │   ├── statistics/
│   │   │   ├── notifications/
│   │   │   ├── staff/
│   │   │   ├── audit/
│   │   │   └── settings/
│   │   ├── api/                 # Route handlers (webhooks, exports)
│   │   ├── globals.css          # Design tokens
│   │   └── layout.tsx           # Root: RTL, themes, providers
│   ├── components/
│   │   ├── ui/                  # shadcn primitives
│   │   ├── layout/              # Sidebar, Header, CommandPalette
│   │   ├── data-table/          # TanStack Table + Virtual wrapper
│   │   ├── charts/              # Recharts wrappers (dynamic import)
│   │   └── signature/           # ChocolateBarProgress, etc.
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── pos/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   └── stores/          # cart.store.ts (Zustand)
│   │   ├── orders/
│   │   ├── events/
│   │   ├── calendar/
│   │   ├── customers/
│   │   ├── loyalty/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── suppliers/
│   │   ├── purchases/
│   │   ├── expenses/
│   │   ├── invoices/
│   │   ├── returns/
│   │   ├── discounts/
│   │   ├── reports/
│   │   ├── statistics/
│   │   ├── notifications/
│   │   ├── staff/
│   │   ├── audit/
│   │   └── settings/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   ├── middleware.ts
│   │   │   └── types.ts         # Generated Database types
│   │   ├── services/
│   │   │   ├── inventory.service.ts
│   │   │   ├── pricing.service.ts
│   │   │   ├── loyalty.service.ts
│   │   │   └── notification.service.ts
│   │   ├── offline/
│   │   │   ├── db.ts            # IndexedDB (Dexie)
│   │   │   └── sync-queue.ts
│   │   ├── i18n/
│   │   │   ├── config.ts
│   │   │   └── messages/
│   │   │       ├── ar.json
│   │   │       └── en.json
│   │   ├── utils/
│   │   │   ├── currency.ts
│   │   │   ├── date.ts
│   │   │   └── barcode.ts
│   │   └── constants/
│   │       ├── order-status.ts
│   │       ├── roles.ts
│   │       └── permissions.ts
│   ├── stores/                  # Global Zustand (theme, sidebar)
│   ├── hooks/                   # Shared hooks
│   ├── types/                   # Global types
│   └── config/
│       ├── site.ts
│       └── navigation.ts
├── middleware.ts                # Auth + RBAC route guard
├── next.config.ts
├── tailwind.config.ts
├── components.json              # shadcn
├── package.json
└── tsconfig.json
```

---

## Tech Decisions (ADR Summary)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State (server) | TanStack Query | Cache, optimistic updates, devtools |
| State (POS cart) | Zustand | <16ms local mutations |
| State (UI) | Zustand minimal | Sidebar, modals |
| Forms | RHF + Zod | Shared schemas with Edge Functions |
| Tables | TanStack Table + Virtual | Performance on large datasets |
| Charts | Recharts (dynamic) | Bundle size |
| Offline | Dexie (IndexedDB) | Mature, typed |
| i18n | next-intl | App Router native |
| Auth | Supabase Auth | Integrated with RLS |
| File storage | Supabase Storage | Product images, logos |
| Print | CSS @media print | Thermal 80mm + A4 templates |

---

## Security Architecture

```
Request → middleware.ts (session check + role route map)
        → RLS policy (branch_id + role permissions)
        → Zod validation (input)
        → Service layer (business rules)
        → Audit trigger (sensitive ops)
```

**Roles → Permissions matrix** stored in DB, cached in session.

---

## Performance Architecture

| Layer | Strategy |
|-------|----------|
| Routing | `loading.tsx` skeletons, `prefetch` on nav hover |
| Data | TanStack Query staleTime per entity type |
| POS | Product catalog in IndexedDB, sync on connect |
| Images | next/image, Supabase transform URLs |
| Charts | `dynamic(() => import(...), { ssr: false })` |
| DB | Indexes, partial indexes, materialized views for dashboard |
