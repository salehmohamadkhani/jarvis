// PM2: رمزها و API keyها از .env.local بارگذاری می‌شوند (در server.js)
// مطمئن شو فایل .env.local در همین پوشه وجود دارد.
module.exports = {
  apps: [
    {
      name: 'jarvis',
      script: './server.js',
      cwd: '/root/jarvis',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'jarvis-api',
      script: './server.js',
      cwd: '/root/jarvis',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
