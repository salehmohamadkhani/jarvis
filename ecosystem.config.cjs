module.exports = {
  apps: [
    {
      name: 'jarvis',
      script: './server.js',
      cwd: '/root/jarvis',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://neondb_owner:npg_m5gB4iMbXQcT@ep-dawn-hat-a4xppwni-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
      }
    },
    {
      name: 'jarvis-api',
      script: './server.js',
      cwd: '/root/jarvis',
      env: {
        PORT: 3001,
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://neondb_owner:npg_m5gB4iMbXQcT@ep-dawn-hat-a4xppwni-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
      }
    }
  ]
};
