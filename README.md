# Jarvis — Planner

پروژهٔ برنامه‌ریز (پلنر) با بک‌اند Node و فرانت React/Vite.

## اجرا

```bash
npm install
cp .env.example .env.local
# برای دیتابیس: روی ویندوز می‌توانید اصلاً این مرحله را رها کنید — `start-backend.bat` اگر `.env.local` نباشد از روی `.env.example` می‌سازد و به‌صورت پیش‌فرض PGlite را فعال می‌کند.
npm run build
npm run start
```

- **ویندوز (پیشنهادی برای تست سریع):** `start-local.bat` (بک‌اند + فرانت). بک‌اند با **PGlite** بالا می‌آید و نیازی به `DATABASE_URL` نیست.
- **بک‌اند فقط:** `start-backend.bat` (PGlite) یا `start-backend-postgres.bat` (Postgres واقعی؛ `DATABASE_URL` در `.env.local`).
- **توسعه:** `npm run dev` (فرانت) و جداگانه `node server.js` (بک‌اند؛ برای PGlite قبل از اجرا `USE_PGLITE=true` را در محیط ست کنید یا از `start-backend.bat` استفاده کنید).
- **متغیرهای محیطی:** همهٔ کلیدهای لازم در `.env.example` با توضیح کوتاه آمده است؛ در صورت نیاز از آن کپی کنید و در `.env.local` مقدار واقعی بگذارید.
- **مستندات API:** پس از استارت سرور، Swagger در [http://localhost:3001/api/docs](http://localhost:3001/api/docs) (یا آدرس سرور شما + `/api/docs`) در دسترس است.

## دیتابیس

### حالت پیش‌فرض توسعه (بدون Docker): PGlite داخل Node

با `USE_PGLITE=true` (در `start-backend.bat` به‌صورت پیش‌فرض ست می‌شود) سرور **بدون** `DATABASE_URL` هم بالا می‌آید؛ داده‌ها پیش‌فرض در پوشهٔ `.data/pglite` ذخیره می‌شوند (در `.gitignore` است).

### حالت پیشنهادی: Postgres لوکال با Docker (کاملاً آفلاین)

1) Docker Desktop را باز کنید و این را اجرا کنید:

```bash
docker compose up -d
```

2) اسکیمای اولیه را اعمال کنید (یک بار):

```bash
scripts\\local-db-up.bat
```

3) در `.env.local` این را بگذارید:

```bash
DATABASE_URL=postgresql://jarvis:jarvis@localhost:5432/jarvis?sslmode=disable
```

### حالت ابری (Neon/هر Postgres)

اسکیمای اولیه: فایل `db/schema.sql` را یک بار در Neon (یا هر Postgres) در ادیتور SQL اجرا کنید. بعد از آن نیازی به مایگریشن جداگانه نیست.

---

## Documentation Roadmap (English)

Jarvis development follows a phased roadmap. Key documentation files for contributors and AI agents:

| File | Purpose |
|------|---------|
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | Product specification: positioning, users, modules, MVP scope, success criteria |
| [DATA_MODEL.md](DATA_MODEL.md) | Data model: current tables, proposed v2 entities, finance/invoice model, migration strategy |
| [PHASE_03_IMPLEMENTATION_PLAN.md](PHASE_03_IMPLEMENTATION_PLAN.md) | Practical plan for Finance Persistence phase: endpoints, migration, testing |
| [ROADMAP.md](ROADMAP.md) | 8-phase development roadmap from foundation through portfolio release |
| [CHANGELOG.md](CHANGELOG.md) | Release history and unreleased changes |
| [db/schema.v2.sql](db/schema.v2.sql) | Draft schema for Phase 03 finance/invoice tables (review before applying) |
