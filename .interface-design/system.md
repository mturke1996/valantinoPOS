# Valentino — Design System

> Phase 0 · Product Domain Exploration · Approved pending user review

## Intent

**Who:** كاشير يبيع بسرعة في ذروة الزحام، مدير يتابع الأرباح والمخزون بين اجتماعات، موظف تغليف يجهّز طلبات مناسبات بمواعيد محددة.

**What they must do:** بيع فوري (POS) · تتبع طلبات المناسبات · مراقبة المخزون والصلاحية · قراءة الأرقام المالية بثقة.

**How it should feel:** فاخر كمحل شوكولاتة يدوية — دافئ، هادئ، دقيق. ليس "لوحة تحكم SaaS باردة" ولا "تطبيق ألعاب".

---

## Domain Concepts (≥5)

| Concept | Meaning in UI |
|---------|---------------|
| **Tempering** | استقرار النظام — حالات واضحة، لا مفاجآت |
| **Ganache** | طبقات ناعمة — elevation هادئ، لا قفزات حادة |
| **Gold foil** | لمسات فاخرة — accent ذهبي للإجراءات الرئيسية فقط |
| **Ribbon** | تغليف المناسبات — شريط تقدم الطلب (Signature) |
| **Cocoa dust** | تفاصيل دقيقة — borders شفافة، grain خفيف |
| **Batch / Lot** | دفعات المخزون — FEFO، تواريخ انتهاء |
| **Bonbon** | وحدات صغيرة — بطاقات منتجات في POS |
| **Truffle** | منتجات مركّبة — Gift Box Bundles |

---

## Color World (≥5)

| Token | Light | Dark | Source |
|-------|-------|------|--------|
| `--cacao-950` | #1A120B | #0D0906 | كاكاو خام |
| `--cacao-800` | #3D2B1F | #2A1E15 | شوكولاتة داكنة |
| `--cream-50` | #FBF7F2 | #1C1917 | كريمة/عاج |
| `--cream-100` | #F5EDE3 | #252019 | ورق تغليف |
| `--caramel-500` | #C4956A | #D4A574 | كراميل |
| `--gold-400` | #D4AF37 | #E8C547 | ورق ذهبي |
| `--pistachio-400` | #8FB996 | #9FC9A8 | فستق/مكسرات |
| `--berry-500` | #8B3A62 | #A84D78 | توت/فواكه |
| `--burnt-sugar-600` | #6B4423 | #8B5A2B | سكر محروق |

**Semantic (derived):**
- `--success` → pistachio
- `--warning` → caramel
- `--destructive` → berry
- `--accent` → gold (sparingly)

---

## Signature Element

**"Chocolate Bar Progress" — شريط تقدم الطلب على شكل لوح شوكولاتة**

- 8 مربعات = 8 مراحل الطلب
- كل مربع يُعبّأ عند اجتياز المرحلة
- لون المربع: `--cacao-800` → `--gold-400` عند الإكمال
- يظهر في: بطاقة الطلب، Kanban، تفاصيل المناسبة، POS للطلبات المعلقة
- لا يوجد في أنظمة ERP عامة — فريد لـ Valentino

---

## Rejected Defaults

| Default | Why Rejected | Replacement |
|---------|--------------|-------------|
| Sidebar رمادي `#1F2937` + محتوى أبيض | قالب SaaS مبتذل، بارد | Sidebar بنفس `--cream-50` مع border `--cacao-800/8` |
| Metric cards: أيقونة يسار + رقم كبير | كل dashboard AI يفعلها | Bento asymmetrical + sparkline مدمج + delta ٪ |
| Inter / Roboto | ممنوع في high-end-visual-design | IBM Plex Sans Arabic + JetBrains Mono للأرقام |
| Purple gradient hero | AI slop | لا hero — Dashboard يبدأ بالأرقام الحية |
| Glassmorphism على كل شيء | أداء + فوضى بصرية | blur فقط على navbar العائم وmodals |

---

## Design Tokens

### Typography
- **Display/UI:** IBM Plex Sans Arabic (400, 500, 600, 700)
- **Financial:** JetBrains Mono + `font-variant-numeric: tabular-nums`
- **Scale:** 12 / 14 / 16 / 20 / 24 / 32 / 40 px

### Spacing
- Base unit: **4px**
- Scale: 4, 8, 12, 16, 24, 32, 48, 64

### Depth Strategy
**Surface color shifts + hairline borders** (no heavy shadows)
- `--surface-0` base canvas
- `--surface-1` cards (+2% lightness)
- `--surface-2` dropdowns (+4%)
- `--surface-3` modals (+6%)
- Borders: `rgba(var(--cacao-rgb), 0.08)` → `0.16` emphasis

### Radius
- `--radius-sm`: 6px (inputs, badges)
- `--radius-md`: 10px (cards)
- `--radius-lg`: 14px (modals)
- `--radius-full`: 9999px (pills, avatars only)

### Motion
- Micro: 150–200ms `cubic-bezier(0.32, 0.72, 0, 1)`
- Page: ≤350ms
- Respect `prefers-reduced-motion`
- Animate: `transform`, `opacity` only

### RTL
- `dir="rtl"` on `<html>`
- Logical properties: `ms-`, `me-`, `ps-`, `pe-`, `start`, `end`
- Icons that imply direction: mirror in RTL

---

## Component Patterns

### Metric Card (Bento)
- Double-bezel shell (high-end-visual-design)
- Number: tabular-nums, mono
- Delta badge: +green / -berry
- Optional sparkline (lazy-loaded Recharts)

### POS Product Tile
- 88×88 min touch target
- Image + name + price tier badge (قطاعي/جملة)
- Quick-add animation: scale 0.95 → 1

### Order Status (Signature)
- Chocolate Bar Progress component
- 8 segments, clickable for status change (with permission)

### Data Table
- TanStack Table + Virtual
- Sticky header, zebra optional
- Row hover: `--surface-1`

---

## Dark Mode
- Invert elevation: higher = lighter on dark
- Desaturate semantic colors ~10%
- Borders more visible (`0.12` → `0.20`)

---

## Accessibility
- Contrast ≥ 4.5:1 for body text
- Focus rings: `--gold-400` 2px offset
- Touch targets ≥ 44px on POS/tablet
