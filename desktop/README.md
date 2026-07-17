# تطبيق سطح المكتب — Valentino POS

تحويل المنظومة إلى تطبيق ويندوز/ماك/لينكس عبر [Pake](https://github.com/tw93/Pake) (Tauri خفيف).

الرابط داخل التطبيق: `https://valantino-pos.vercel.app`

## الطريقة الأسهل (موصى بها): GitHub Actions

1. ادفع التغييرات إلى GitHub
2. افتح المستودع → **Actions** → **Build Desktop App (Pake)**
3. **Run workflow** → اختر النظام (`windows` / `macos` / `linux`)
4. بعد انتهاء البناء حمّل الـ Artifact (ملف `.msi` على ويندوز)

لا تحتاج تثبيت Rust محلياً.

## البناء المحلي (Windows)

المتطلبات:

- Node.js 22+
- [Rust](https://rustup.rs/) + Visual Studio Build Tools (C++)

```powershell
pnpm desktop:local
```

أو:

```powershell
pnpm desktop:win
```

الناتج: `ValentinoPOS.msi` في جذر المشروع (أو `desktop-dist/`).

> على ويندوز مع OneDrive: السكربت يستخدم مسار قصير `C:\pake-out` لتفادي فشل تجميع Rust.

## الإعداد

الملف: [`pake.json`](./pake.json)

| الحقل | القيمة |
|--------|--------|
| url | https://valantino-pos.vercel.app |
| name | ValentinoPOS |
| tray | مفعّل — الإغلاق يخفي للشريط |
| maximize | يبدأ مكبراً |
