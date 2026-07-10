# Phase 0.5 — Development Roadmap

## Overview

| Phase | Name | Duration Est. | Deliverable |
|-------|------|---------------|-------------|
| 0 | Analysis & Design | ✅ Done | Docs + system.md |
| 1 | Foundation | 3–4 days | Project scaffold, shell, auth |
| 2 | Database | 4–5 days | Migrations, RLS, seed |
| 3 | Products & Inventory | 5–6 days | CRUD, batches, movements |
| 4 | Customers & Loyalty | 3–4 days | CRM, tiers, points |
| 5 | POS | 7–10 days | Full POS + shifts + offline |
| 6 | Orders & Events | 6–7 days | Pipeline, calendar, alerts |
| 7 | Suppliers & Expenses | 4–5 days | Procurement, costs |
| 8 | Invoices & Returns | 4–5 days | Payments, discounts |
| 9 | Dashboard & Reports | 5–6 days | Analytics, exports |
| 10 | Polish & Deploy | 4–5 days | PWA, notifications, Pake |

**Total estimate:** ~45–55 dev days for production-ready v1

---

## Phase 1 — Foundation (Detail)

### Tasks
- [ ] `create-next-app` with TypeScript, Tailwind, App Router, src/
- [ ] Install: shadcn, TanStack Query/Table, Zustand, RHF, Zod, Framer Motion, next-intl, next-themes, date-fns, recharts
- [ ] Configure `tailwind.config.ts` with design tokens from `.interface-design/system.md`
- [ ] Setup `globals.css` CSS variables (light + dark)
- [ ] RTL: `dir="rtl"`, logical properties, IBM Plex Sans Arabic font
- [ ] Root layout: ThemeProvider, QueryClientProvider, Toaster
- [ ] Supabase client (browser + server) + env template
- [ ] App shell: Sidebar, Header, CommandPalette skeleton
- [ ] Auth: login page, middleware session check
- [ ] Navigation config with role placeholders
- [ ] `loading.tsx` + `error.tsx` templates

### Definition of Done
- `pnpm build` passes
- Login page renders RTL dark/light
- Shell navigates between placeholder pages
- Tokens applied consistently

---

## Phase 2 — Database (Detail)

### Tasks
- [ ] `supabase init` + link project
- [ ] Migration 001: extensions, enums, branches, roles, permissions
- [ ] Migration 002: products, categories, batches, inventory
- [ ] Migration 003: customers, orders, events
- [ ] Migration 004: payments, invoices, shifts, returns
- [ ] Migration 005: suppliers, purchases, expenses
- [ ] Migration 006: loyalty, discounts, coupons, notifications
- [ ] Migration 007: audit_logs, settings
- [ ] Migration 008: RLS policies all tables
- [ ] Migration 009: triggers (inventory, loyalty, audit, WAC)
- [ ] Migration 010: indexes + materialized views
- [ ] Migration 011: pg_cron jobs (alerts)
- [ ] `seed.sql`: Arabic chocolate products, sample customers, orders
- [ ] Generate TypeScript types: `supabase gen types`

### Definition of Done
- All migrations apply cleanly
- RLS tested per role
- Seed data loads
- Types generated

---

## Phase 3 — Products & Inventory

- Product CRUD with images (Storage upload)
- Category tree management
- Barcode/QR generation
- Unit conversions (piece/gram/kilo)
- Batch tracking + FEFO deduction logic
- Inventory movements UI (add/deduct/transfer/waste/expiry)
- Stock count (جرد) workflow
- Low stock + expiry alerts

---

## Phase 4 — Customers & Loyalty

- Customer CRUD + addresses
- WhatsApp quick link
- Birthday field + notification hook
- Loyalty tier config in settings
- Points earn/redeem on payment
- Customer detail: orders, points history, upcoming events

---

## Phase 5 — POS (Critical Path)

- Product grid with local cache (IndexedDB)
- Barcode wedge input handler
- Cart Zustand store (<16ms mutations)
- Price tier toggle (retail/wholesale)
- Weighted product modal
- Discount/coupon application
- Payment modal (cash/card/mixed/credit)
- Hold/resume invoice
- Return flow
- Shift open/close + Z-report
- Offline queue + sync indicator
- Thermal print CSS
- Keyboard shortcuts

---

## Phase 6 — Orders & Events

- Order Kanban (dnd-kit)
- Status change + history timeline
- Chocolate Bar Progress component
- Event wizard + deposit payments
- Gift Box Builder
- Delivery calendar (month/week/day views)
- Scheduled notification Edge Function

---

## Phase 7 — Suppliers & Expenses

- Supplier CRUD
- PO lifecycle
- Receive goods → inventory + WAC
- Supplier payments + debt aging
- Expense categories + recurring

---

## Phase 8 — Invoices & Returns

- Invoice generation from orders
- Sequential numbering per branch
- Print templates (thermal + A4)
- TLV QR optional
- Return linked to invoice
- Discount/coupon management

---

## Phase 9 — Dashboard & Reports

- Dashboard KPIs from materialized views
- Recharts integration (dynamic import)
- Report pages with filters
- Export: PDF (react-pdf or puppeteer edge), Excel (xlsx), CSV
- Statistics heatmaps

---

## Phase 10 — Polish & Deploy

- Notification center + Realtime
- Email/WhatsApp adapter stubs
- PWA manifest + service worker
- Audit log viewer
- Settings (all config)
- Staff management + RBAC UI
- Performance audit (Lighthouse)
- Pake desktop build scripts
- Production deployment guide

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| POS offline complexity | Phase 5: start online-only, add offline in 5b |
| RLS bugs | Test matrix per role in Phase 2 |
| RTL layout breaks | Review every phase, use logical properties |
| Bundle size | Dynamic imports for charts, POS code-split |
| Scope creep | Strict phase gates, user approval between phases |

---

## Approval Gate

**Phase 0 complete.** Awaiting user approval to proceed to **Phase 1: Foundation**.

Reply with:
- ✅ **موافق — ابدأ Phase 1** to start implementation
- 🔄 **تعديلات** with specific changes to architecture/design
- 📋 **تفاصيل أكثر** on any section
