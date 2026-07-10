# 🍫 Valentino — Chocolate ERP + POS

نظام إدارة متكامل لمحل شوكولاتة: جملة + قطاعي + مناسبات وهدايا.

## التشغيل السريع

```bash
pnpm install
pnpm dev
```

افتح [http://localhost:3000/login](http://localhost:3000/login) واضغط **دخول تجريبي سريع**.

## الأوامر

| الأمر | الوصف |
|-------|--------|
| `pnpm dev` | تشغيل التطوير |
| `pnpm build` | بناء الإنتاج |
| `pnpm typecheck` | فحص TypeScript |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest — اختبارات الوحدة |
| `pnpm check` | فحص شامل (typecheck + lint + test + build) |

## الوحدات (19)

- لوحة التحكم · نقطة البيع · الطلبات · المناسبات · تقويم التسليم
- العملاء · المنتجات · المخزون · الموردون · المشتريات
- المصروفات · الفواتير · المرتجعات · الخصومات · التقارير
- الإحصائيات · الإشعارات · الموظفون · سجل النشاط · الإعدادات

## التقنيات

- **Frontend:** Next.js 15 · React 19 · TypeScript · Tailwind · shadcn/ui
- **State:** TanStack Query · Zustand · React Hook Form · Zod
- **Backend (جاهز):** Supabase PostgreSQL + RLS + Edge Functions
- **Demo Mode:** localStorage + بيانات عربية تجريبية (بدون Supabase)

## التصميم

- RTL عربي كامل
- Dark / Light mode
- توكنات من عالم الشوكولاتة (`cacao`, `cream`, `gold`)
- **Signature:** Chocolate Bar Progress — شريط تقدم الطلب

راجع `.interface-design/system.md` و `docs/phase-0/`.

## السكيلز المستخدمة

| السكيل | الاستخدام |
|--------|-----------|
| `interface-design` | Dashboard/POS UI |
| `high-end-visual-design` | Premium aesthetic |
| `minimalist-ui` | Bento + warm monochrome |
| `vercel-react-best-practices` | Performance |
| `supabase-postgres-best-practices` | DB schema |
| `shadcn` | UI components |
| `web-pwa-offline-first` | PWA readiness |
| `full-output-enforcement` | No placeholders |

## Supabase

```bash
# انسخ .env.example إلى .env.local وأضف مفاتيح Supabase
supabase db push   # تطبيق migrations
```

Migrations في `supabase/migrations/`.

## النشر على Vercel (PWA + إنتاج)

### 1) رفع المشروع إلى GitHub

```bash
git init
git add .
git commit -m "Initial commit — Valentino ERP + POS"
git branch -M main
git remote add origin https://github.com/mturke1996/valantinoPOS.git
git push -u origin main
```

### 2) ربط Vercel

1. افتح [vercel.com/new](https://vercel.com/new) وسجّل الدخول بـ GitHub
2. اختر المستودع `mturke1996/valantinoPOS`
3. الإعدادات تُكتشف تلقائياً (Next.js + pnpm عبر `vercel.json`)
4. أضف **Environment Variables**:

| المتغير | مطلوب | ملاحظة |
|---------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | نعم | من Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | نعم | المفتاح العام |
| `SUPABASE_SERVICE_ROLE_KEY` | نعم | لإنشاء الموظفين (Server only) |
| `IMGBB_API_KEY` | نعم | لرفع صور المنتجات |
| `NEXT_PUBLIC_APP_URL` | نعم | رابط Vercel بعد النشر، مثل `https://valantino-pos.vercel.app` |

5. اضغط **Deploy**

### 3) إعداد Supabase بعد النشر

في Supabase → **Authentication → URL Configuration**:

- **Site URL:** رابط Vercel
- **Redirect URLs:** أضف `https://your-app.vercel.app/**`

### 4) PWA

- `manifest.json` + Service Worker (`/sw.js`) مفعّلين
- من المتصفح (Chrome): قائمة ⋮ → **تثبيت التطبيق**
- يعمل offline للواجهة الأساسية مع مزامنة Supabase عند عودة الاتصال

### 5) التحقق

```bash
pnpm check   # محلياً قبل كل push
```

بعد النشر: `/login` → تسجيل المدير الأول من `/register`

## اختصارات POS

| المفتاح | الإجراء |
|---------|---------|
| F1 | بحث |
| F2 | عميل |
| F4 | تعليق فاتورة |
| F6 | استرجاع معلقة |
| F9 | إتمام الدفع |
| ? | عرض الاختصارات |

## الهيكل

```
src/
├── app/              # Routes
├── features/         # Business modules
├── components/       # UI + layout + signature
├── lib/              # data, services, utils
├── config/           # navigation, site
└── types/            # TypeScript domain types
```

## الترخيص

خاص — Valentino Chocolate Shop
