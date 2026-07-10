# Phase 0.1 — Requirements Analysis & Module Interconnection Map

## Product Vision

**Valentino** = ERP + POS متكامل لمحل شوكولاتة يبيع:
- بالقطاعي (retail)
- بالجملة (wholesale) بأسعار متدرجة
- طلبات مناسبات وهدايا مخصصة (events + gift boxes)

النظام منتج تجاري إنتاجي — ليس MVP تجريبي.

---

## Stakeholders & Personas

| Persona | Primary Tasks | Key Screens |
|---------|---------------|-------------|
| **المدير** | أرباح، تقارير، إعدادات، صلاحيات | Dashboard, Reports, Settings |
| **الكاشير** | بيع سريع، ورديات، طباعة | POS, Shifts |
| **المبيعات** | طلبات، عملاء، مناسبات | Orders, Events, Customers |
| **المخزن** | جرد، دفعات، FEFO، استلام شراء | Inventory, Purchases |
| **المحاسب** | فواتير، مصروفات، موردين | Invoices, Expenses, Suppliers |
| **التوصيل** | طلبات جاهزة، تقويم | Orders (Ready), Calendar |

---

## 19 Modules — Dependency Matrix

```
                    ┌─────────────┐
                    │  Settings   │
                    │  Branches   │
                    │  RBAC       │
                    └──────┬──────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌─────────┐         ┌───────────┐          ┌──────────┐
│Products │◄───────►│ Inventory │◄────────►│Suppliers │
│Categories│        │  Batches  │          │Purchases │
└────┬────┘         └─────┬─────┘          └──────────┘
     │                      │
     │    ┌─────────────────┼─────────────────┐
     │    │                 │                 │
     ▼    ▼                 ▼                 ▼
┌─────────────┐      ┌─────────────┐    ┌─────────────┐
│     POS     │─────►│   Orders    │───►│   Events    │
│   Shifts    │      │  Calendar   │    │ Gift Boxes  │
└──────┬──────┘      └──────┬──────┘    └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│  Customers  │◄────►│   Loyalty   │
└──────┬──────┘      └─────────────┘
       │
       ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Invoices   │      │  Payments   │      │  Returns    │
│  Discounts  │      │  Coupons    │      │  Expenses   │
└──────┬──────┘      └─────────────┘      └──────┬──────┘
       │                                         │
       └─────────────────┬───────────────────────┘
                         ▼
                  ┌─────────────┐
                  │  Dashboard  │
                  │  Reports    │
                  │ Statistics  │
                  └──────┬──────┘
                         │
                  ┌──────┴──────┐
                  ▼             ▼
            ┌──────────┐  ┌──────────┐
            │Notifications│ Audit Log │
            └──────────┘  └──────────┘
```

---

## Critical Business Flows

### Flow 1: POS Sale (Retail)
```
Barcode scan → Product lookup (local cache) → Add to cart (<16ms)
→ Apply price tier (retail/wholesale) → Discount/coupon
→ Payment (cash/card/mixed) → Create order + invoice
→ Deduct inventory (FEFO batch) → Loyalty points
→ Print receipt → Audit log → Dashboard metrics update
```

### Flow 2: Event Order (Wedding)
```
Create event (type, date, delivery, packaging)
→ Gift box builder OR product selection
→ Deposit payment (partial) → Order status: Received
→ Status pipeline (8 stages) → Remaining payment
→ Delivery calendar alerts (7d/3d/1d/2h/30m)
→ Complete → Loyalty + invoice
```

### Flow 3: Purchase Receipt
```
PO created → Sent to supplier → Partial/full receive
→ Update batches (expiry dates) → WAC cost recalc
→ Inventory movement log → Supplier payment/debt
```

### Flow 4: Return
```
Link to original invoice → Select items → Restock OR waste
→ Refund cash OR customer credit → Adjust reports
```

### Flow 5: Shift Close
```
Open shift (opening float) → Sales accumulate
→ Cash in/out movements → Close (count drawer)
→ Z-Report → Variance check
```

---

## Cross-Cutting Concerns

| Concern | Implementation |
|---------|----------------|
| **Multi-branch** | `branch_id` on all operational tables from day 1 |
| **RBAC** | RLS + middleware + UI visibility |
| **Audit** | Trigger on sensitive mutations |
| **Offline POS** | IndexedDB queue + sync on reconnect |
| **Realtime** | Supabase channels: orders, notifications |
| **i18n** | Arabic default RTL, English ready |
| **No AI** | Rule-based only (reorder suggestions, alerts) |

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| POS add-to-cart | < 16ms (no network) |
| Page navigation | Instant feel (prefetch + cache) |
| Table load | Paginated, max 50/page |
| Uptime | Offline POS continues selling |
| Security | RLS on every table |
| Accessibility | WCAG 2.1 AA target |

---

## Skills Applied (Phase 0)

| Skill | Application |
|-------|-------------|
| `interface-design` | Domain exploration, token naming, anti-default |
| `high-end-visual-design` | Double-bezel, motion, banned patterns |
| `minimalist-ui` (project) | Flat bento, warm monochrome base |
| `full-output-enforcement` (project) | Complete docs, no placeholders |
| `supabase-postgres-best-practices` | Schema indexes, RLS priority |
| `next-best-practices` | RSC-first architecture |
| `persistent-memory` | `.cursor/memory/` structure |
| **Banned:** design-taste-frontend, imagegen-* | Landing-page skills — not used |
