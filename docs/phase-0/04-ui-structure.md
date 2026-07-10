# Phase 0.4 — UI Structure & Navigation

## App Shell Layout

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo] Valentino          🔍 Ctrl+K    🔔 3    🌙    [Avatar] │  ← Floating glass header
├──────────┬─────────────────────────────────────────────────────┤
│          │                                                     │
│  Sidebar │              Main Content Area                      │
│  (RTL    │                                                     │
│   right) │   ┌─────────────────────────────────────────────┐   │
│          │   │  Page Header + Actions                       │   │
│  ─────── │   ├─────────────────────────────────────────────┤   │
│  لوحة    │   │                                             │   │
│  التحكم  │   │  Content (tables, forms, POS grid, etc.)    │   │
│  ─────── │   │                                             │   │
│  نقطة    │   │                                             │   │
│  البيع   │   └─────────────────────────────────────────────┘   │
│  ─────── │                                                     │
│  الطلبات │                                                     │
│  المناسبات│                                                     │
│  ...     │                                                     │
│          │                                                     │
│  ─────── │                                                     │
│  الإعدادات│                                                     │
└──────────┴─────────────────────────────────────────────────────┘
```

**Sidebar:** Same background as canvas (`--cream-50`), border-start separation. Collapsible to icons on tablet.

**POS:** Full-screen mode — hides sidebar, maximizes product grid + cart split.

---

## Navigation Tree (Arabic labels)

```
📊 لوحة التحكم                    /dashboard
🛒 نقطة البيع                     /pos
📦 الطلبات                        /orders
🎉 المناسبات                      /events
📅 تقويم التسليم                  /calendar
👥 العملاء                        /customers
🏷️ المنتجات                       /products
📋 المخزون                        /inventory
🚚 الموردون                       /suppliers
🛍️ المشتريات                      /purchases
💰 المصروفات                      /expenses
🧾 الفواتير                       /invoices
↩️ المرتجعات                      /returns
🏷️ الخصومات والكوبونات            /discounts
📈 التقارير                       /reports
📊 الإحصائيات                     /statistics
🔔 الإشعارات                      /notifications
👤 الموظفون                       /staff
📜 سجل النشاط                     /audit
⚙️ الإعدادات                      /settings
```

Role visibility enforced per item.

---

## Screen Inventory (Key Screens)

### Dashboard `/`
| Section | Components |
|---------|------------|
| KPI Row | 6 bento cards: مبيعات اليوم، الأسبوع، الشهر، صافي الربح، طلبات جديدة، عملاء جدد |
| Charts Row | مبيعات خطية + توزيع الفئات دائري |
| Orders Panel | حالات الطلبات (counts) + متأخرة |
| Inventory Alerts | نواقص + قرب انتهاء |
| Top/Bottom Products | جدول مصغّر |
| Recent Activity | timeline |
| Urgent Alerts | banner |

### POS `/pos`
| Zone | Width | Content |
|------|-------|---------|
| Products | 60% | Search, categories tabs, product grid (virtualized) |
| Cart | 40% | Line items, totals, customer, payment buttons |
| Overlays | — | Held invoices, shift status, shortcuts help (?) |

**POS Keyboard Shortcuts Overlay:**
| Key | Action |
|-----|--------|
| F1 | بحث منتج |
| F2 | اختيار عميل |
| F3 | خصم |
| F4 | تعليق فاتورة |
| F5 | استرجاع معلقة |
| F8 | مرتجع |
| F9 | إتمام الدفع |
| F12 | فتح/إغلاق وردية |
| ESC | إلغاء / إغلاق modal |
| ? | عرض الاختصارات |

### Orders `/orders`
- **Views:** Kanban (default) | Table | Calendar
- **Kanban columns:** 8 status columns + Cancelled
- **Card:** Order #, customer, total, Chocolate Bar Progress, delivery date, assignee
- **Actions:** Change status, view detail, print

### Events `/events`
- List + create wizard (multi-step)
- Steps: نوع المناسبة → التفاصيل → المنتجات/علبة هدايا → التغليف → الدفع/عربون → تأكيد

### Gift Box Builder (modal/page)
1. اختر العلبة (منتج is_bundle=false, type=box)
2. أضف منتجات (قطعة أو وزن)
3. معاينة السعر والتكلفة
4. حفظ كـ bundle product أو إضافة للطلب

---

## Shared UI Components

| Component | Usage |
|-----------|-------|
| `DataTable` | All list screens — search, sort, paginate, virtual |
| `MetricCard` | Dashboard KPIs |
| `ChocolateBarProgress` | Order status (signature) |
| `StatusBadge` | Order, payment, stock status |
| `CurrencyDisplay` | tabular-nums mono formatting |
| `EmptyState` | Illustrated empty per context |
| `ErrorState` | Retry button |
| `PageSkeleton` | loading.tsx |
| `CommandPalette` | Ctrl+K global search |
| `DateRangePicker` | Reports, dashboard filter |
| `CustomerQuickAdd` | Modal from POS |
| `PrintReceipt` | Thermal + A4 templates |
| `OfflineIndicator` | POS connection status |

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| ≥1280px | Full sidebar + content |
| 1024–1279 | Collapsed sidebar |
| 768–1023 | POS optimized tablet layout |
| <768 | Bottom nav for key routes, POS stacked |

---

## Route Groups

```
(auth)/login          — No shell
(dashboard)/*         — App shell + RBAC middleware
pos                   — Optional fullscreen layout variant
```

---

## Page States (Mandatory per screen)

Every route must implement:
1. `loading.tsx` — skeleton matching layout
2. Empty state — contextual CTA
3. `error.tsx` — retry + support message
4. Success — data rendered

---

## Print Templates

| Template | Size | Use |
|----------|------|-----|
| `receipt-thermal` | 80mm | POS after payment |
| `invoice-a4` | A4 | Formal invoice |
| `barcode-label` | 50×30mm | Product labels |
| `z-report` | 80mm | Shift close |

CSS: `@media print` with `size: 80mm auto` for thermal.
