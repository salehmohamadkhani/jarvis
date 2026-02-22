# محل رمزها و API Keyها در پروژه Jarvis

## فایل اصلی رمزها: `.env.local`

**مسیر در پروژه:**  
`/root/jarvis/.env.local`

این فایل **تنها جایی است** که همهٔ رمزها و API keyها باید در آن قرار بگیرند.  
در گیت push **نمی‌شود** (طبق `.gitignore`: ` .env*` نادیده گرفته می‌شود).

---

## متغیرهای محیطی و محل استفاده

| متغیر | استفاده | کجا خوانده می‌شود |
|--------|----------|---------------------|
| `DATABASE_URL` | اتصال به PostgreSQL (Neon) | `server.js`, `run_schema.cjs` |
| `OPENAI_API_KEY` | ChatGPT از سمت سرور (proxy) | `server.js` |
| `VITE_OPENAI_API_KEY` | هشدار/fallback فرانت | `src/api/gptClient.js` (در عمل از proxy استفاده می‌شود) |
| `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY` | در صورت استفاده مجدد از Gemini | `src/api/geminiClient.js*` |
| `VITE_API_BASE_URL` | آدرس بک‌اند برای فرانت (خالی = همان دامنه) | `src/api/gptClient.js` |
| `VITE_BACKEND_URL` | آدرس API برای planner | `src/api/plannerApi.js` |
| `PORT` | پورت سرور | `server.js` (پیش‌فرض ۳۰۰۱) |

---

## نحوهٔ استفاده

1. **کپی از نمونه:**  
   `cp .env.example .env.local`
2. **پر کردن مقادیر واقعی** در `.env.local`.
3. **سرور:** با اجرای `server.js`، هر دو فایل `.env` و `.env.local` بارگذاری می‌شوند و مقدارهای `.env.local` اولویت دارند.
4. **اسکریپت دیتابیس:** `node run_schema.cjs` هم از `.env` و `.env.local` استفاده می‌کند.
5. **فرانت (Vite):** فقط متغیرهای با پیشوند `VITE_` از `.env` / `.env.local` در بیلد قرار می‌گیرند.

---

## خلاصهٔ مسیرها در پروژه jarvis

| مورد | مسیر |
|------|------|
| **فایل رمزها** | `jarvis/.env.local` |
| نمونه بدون مقدار | `jarvis/.env.example` |
| بارگذاری env در سرور | `server.js` (ابتدای فایل) |
| بارگذاری env برای اسکما | `run_schema.cjs` (ابتدای فایل) |
| تنظیمات PM2 (بدون رمز) | `ecosystem.config.cjs` |
