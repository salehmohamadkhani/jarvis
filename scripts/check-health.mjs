#!/usr/bin/env node

/**
 * Health check utility for Jarvis.
 *
 * Usage:
 *   node scripts/check-health.mjs
 *   HEALTH_URL=http://localhost:3001/api/health node scripts/check-health.mjs
 *
 * Exits with code 0 if the backend is healthy, code 1 otherwise.
 * Accepts a response as healthy if:
 *   - ok === true, OR
 *   - status === "ok", OR
 *   - database === "connected"
 */

const HEALTH_URL = process.env.HEALTH_URL || 'http://localhost:3001/api/health';

async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`Health check FAILED: HTTP ${res.status} ${res.statusText}`);
      console.error(`  URL: ${HEALTH_URL}`);
      process.exit(1);
    }

    const data = await res.json();

    const isHealthy = data.ok === true || data.status === 'ok' || data.database === 'connected';

    if (isHealthy) {
      console.log(`Health check PASSED: ${JSON.stringify(data)}`);
      console.log(`  URL: ${HEALTH_URL}`);
      process.exit(0);
    } else {
      console.error(`Health check FAILED: unexpected response shape`);
      console.error(`  Response: ${JSON.stringify(data)}`);
      console.error(`  URL: ${HEALTH_URL}`);
      process.exit(1);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Health check FAILED: timeout (server not responding within 5s)');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('Health check FAILED: connection refused (server not running)');
    } else {
      console.error(`Health check FAILED: ${err.message}`);
    }
    console.error(`  URL: ${HEALTH_URL}`);
    process.exit(1);
  }
}

checkHealth();
