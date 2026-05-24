#!/bin/bash
# اجرای این اسکریپت بعد از هر بار تغییر کد: بیلد فرانت + ری‌استارت سرور
# استفاده: ./scripts/deploy.sh   یا  npm run deploy
set -e
cd "$(dirname "$0")/.."
echo "Building frontend..."
npm run build
echo "Restarting Jarvis (PM2)..."
pm2 restart jarvis
echo "Done. Changes are live."
