# اتصال Frontend به Backend API

این پروژه حالا به دیتابیس PostgreSQL (Neon) متصل است و از API backend استفاده می‌کند.

## تنظیمات اولیه

### 1. نصب Dependencies

```bash
cd planner-web
npm install
```

این دستور `@tabler/icons-react` را هم نصب می‌کند که برای آیکون‌ها استفاده می‌شود.

### 2. تنظیم URL API

یک فایل `.env` در فولدر `planner-web` ایجاد کنید:

```env
VITE_BACKEND_URL=http://localhost:3001/api
```

یا اگر backend روی پورت دیگری اجرا می‌شود، URL را تغییر دهید.

### 3. اجرای Backend

قبل از اجرای frontend، مطمئن شوید که backend در حال اجرا است:

```bash
cd ../backend
npm install
npm run migrate
npm start
```

Backend باید روی `http://localhost:3001` اجرا شود.

### 4. اجرای Frontend

```bash
cd planner-web
npm run dev
```

Frontend روی `http://localhost:5173` اجرا می‌شود.

## تغییرات انجام شده

### API Client (`src/api/plannerApi.js`)
- تمام API endpoints برای Projects, Tasks, Meetings, Collaborators
- تبدیل خودکار فرمت دیتابیس به فرمت frontend
- مدیریت خطاها

### PlannerContext (`src/state/PlannerContext.jsx`)
- استفاده از API به جای localStorage
- بارگذاری خودکار داده‌ها از API
- مدیریت state با React hooks
- مدیریت loading و error states

### Components جدید
- `LoadingScreen.jsx` - نمایش صفحه loading
- `ErrorScreen.jsx` - نمایش خطا و امکان retry

## ساختار API

### Projects
- `GET /api/projects` - دریافت همه پروژه‌ها
- `POST /api/projects` - ایجاد پروژه
- `PUT /api/projects/:id` - آپدیت پروژه
- `PATCH /api/projects/:id/archive` - آرشیو
- `PATCH /api/projects/:id/restore` - بازگردانی

### Tasks
- `GET /api/tasks` - دریافت همه تسک‌ها
- `POST /api/tasks` - ایجاد تسک
- `PUT /api/tasks/:id` - آپدیت تسک
- `PATCH /api/tasks/:id/toggle` - تغییر وضعیت

### Meetings
- `GET /api/meetings` - دریافت همه جلسات
- `POST /api/meetings` - ایجاد جلسه

### Collaborators
- `GET /api/collaborators` - دریافت همه همکاران
- `POST /api/collaborators` - ایجاد همکار

## نکات مهم

1. **CORS**: Backend باید CORS را برای `http://localhost:5173` فعال کرده باشد (در `.env` backend تنظیم شده)

2. **Environment Variables**: فایل `.env` را در `.gitignore` قرار دهید

3. **Error Handling**: اگر backend در دسترس نباشد، صفحه خطا نمایش داده می‌شود

4. **Data Sync**: داده‌ها به صورت real-time از API بارگذاری می‌شوند

## عیب‌یابی

### خطای "Failed to fetch"
- مطمئن شوید backend در حال اجرا است
- بررسی کنید که URL در `.env` درست است
- بررسی کنید که CORS در backend تنظیم شده است

### خطای "Database connection failed"
- مطمئن شوید migration اجرا شده است (`npm run migrate` در backend)
- بررسی کنید که `.env` در backend درست تنظیم شده است
- بررسی کنید که دیتابیس Neon در دسترس است

### داده‌ها نمایش داده نمی‌شوند
- Console مرورگر را بررسی کنید
- Network tab را در DevTools بررسی کنید
- مطمئن شوید که API responses موفق هستند

