# اتصال Frontend به Backend API

این پروژه به دیتابیس PostgreSQL (Neon) متصل است و از Vercel Serverless Functions استفاده می‌کند.

## تنظیمات اولیه

### 1. نصب Dependencies

```bash
npm install
```

این دستور تمام dependencies لازم را نصب می‌کند.

### 2. تنظیم Environment Variables

برای اجرای محلی، یک فایل `.env` در root پروژه ایجاد کنید:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

یا می‌توانید از `POSTGRES_URL` یا `POSTGRES_PRISMA_URL` استفاده کنید.

**نکته:** در Vercel، این متغیرها به صورت خودکار از تنظیمات پروژه خوانده می‌شوند.

### 3. اجرای Frontend (Development)

```bash
npm run dev
```

Frontend روی `http://localhost:5173` اجرا می‌شود و به صورت خودکار از `/api` endpoints استفاده می‌کند.

### 4. Deploy روی Vercel

1. پروژه را به Vercel متصل کنید
2. Environment Variables را در تنظیمات Vercel اضافه کنید:
   - `DATABASE_URL` (یا `POSTGRES_URL` / `POSTGRES_PRISMA_URL`)
3. Deploy کنید

API endpoints به صورت خودکار در `/api/*` در دسترس خواهند بود.

## ساختار API

API endpoints در `api/index.js` تعریف شده‌اند و به صورت Vercel Serverless Functions اجرا می‌شوند.

### Health Check
- `GET /api/health/db` - بررسی اتصال به دیتابیس
- `GET /api/health` - بررسی کلی وضعیت سیستم

### Projects
- `GET /api/projects` - دریافت همه پروژه‌ها
- `GET /api/projects/:id` - دریافت پروژه خاص
- `POST /api/projects` - ایجاد پروژه
- `PUT /api/projects/:id` - آپدیت پروژه
- `PATCH /api/projects/:id/archive` - آرشیو پروژه
- `PATCH /api/projects/:id/restore` - بازگردانی پروژه
- `DELETE /api/projects/:id` - حذف پروژه

### Tasks
- `GET /api/tasks` - دریافت همه تسک‌ها
- `GET /api/tasks/:id` - دریافت تسک خاص
- `POST /api/tasks` - ایجاد تسک
- `PUT /api/tasks/:id` - آپدیت تسک
- `PATCH /api/tasks/:id/toggle` - تغییر وضعیت تسک
- `PATCH /api/tasks/:id/archive` - آرشیو تسک
- `DELETE /api/tasks/:id` - حذف تسک

### Meetings
- `GET /api/meetings` - دریافت همه جلسات
- `GET /api/meetings/:id` - دریافت جلسه خاص
- `POST /api/meetings` - ایجاد جلسه
- `PUT /api/meetings/:id` - آپدیت جلسه
- `DELETE /api/meetings/:id` - حذف جلسه

### Collaborators
- `GET /api/collaborators` - دریافت همه همکاران
- `GET /api/collaborators/:id` - دریافت همکار خاص
- `POST /api/collaborators` - ایجاد همکار
- `PUT /api/collaborators/:id` - آپدیت همکار
- `DELETE /api/collaborators/:id` - حذف همکار

## نکات مهم

1. **Environment Variables**: در production، متغیرهای محیطی از طریق Vercel تنظیم می‌شوند.

2. **API Base URL**: Frontend به صورت خودکار از `window.location.origin/api` استفاده می‌کند. برای override کردن، می‌توانید `VITE_BACKEND_URL` را در `.env` تنظیم کنید.

3. **Error Handling**: اگر دیتابیس در دسترس نباشد، صفحه خطای مناسب نمایش داده می‌شود.

4. **Data Sync**: داده‌ها به صورت real-time از API بارگذاری می‌شوند.

## عیب‌یابی

### خطای "Database connection failed"
- بررسی کنید که `DATABASE_URL` در Vercel تنظیم شده است
- بررسی کنید که دیتابیس Neon در دسترس است
- بررسی کنید که SSL connection درست تنظیم شده است

### خطای "Failed to fetch"
- بررسی کنید که API endpoint درست است
- Console مرورگر را بررسی کنید
- Network tab را در DevTools بررسی کنید

### داده‌ها نمایش داده نمی‌شوند
- Console مرورگر را بررسی کنید
- Network tab را در DevTools بررسی کنید
- مطمئن شوید که API responses موفق هستند
- بررسی کنید که health check endpoint کار می‌کند (`/api/health/db`)
