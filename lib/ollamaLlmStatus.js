/**
 * وضعیت Ollama نسبت به LLM_MODEL / LLM_BASE_URL — برای /api/llm-status و health
 * @param {number} timeoutMs
 */
export async function fetchOllamaLlmStatus(timeoutMs = 5000) {
  const raw =
    process.env.LLM_BASE_URL ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:11434/v1');
  if (!String(raw).trim()) {
    return {
      ok: false,
      llmReachable: false,
      configuredModel: process.env.LLM_MODEL || 'llama3.2',
      hint: 'LLM_BASE_URL در env تنظیم نشده.',
    };
  }

  const base = String(raw).replace(/\/$/, '');
  const isOllama = /localhost|127\.0\.0\.1|\.local/i.test(base) && base.includes('11434');
  const want = process.env.LLM_MODEL || 'llama3.2';

  if (!isOllama) {
    return await checkRemoteApi(base, want, timeoutMs);
  }

  const ollamaOrigin = base.replace(/\/v1$/i, '');
  const tag = want.split(':')[0];

  let tagsRes;
  try {
    const ac = new AbortController();
    const tm = setTimeout(() => ac.abort(), timeoutMs);
    try {
      tagsRes = await fetch(`${ollamaOrigin}/api/tags`, { signal: ac.signal });
    } finally {
      clearTimeout(tm);
    }
  } catch (e) {
    return {
      ok: false,
      llmReachable: false,
      installedModels: [],
      configuredModel: want,
      configuredModelInstalled: false,
      hint:
        'به Ollama روی پورت ۱۱۴۳۴ وصل نشد. برنامهٔ Ollama را در ویندوز اجرا کن یا ترمینال: ollama serve',
      error: e.message || String(e),
    };
  }

  const tagsData = tagsRes.ok ? await tagsRes.json().catch(() => ({})) : {};
  const names = Array.isArray(tagsData.models)
    ? tagsData.models.map((m) => m.name || m.model || '').filter(Boolean)
    : [];
  const installed =
    names.some((n) => n === want) ||
    names.some((n) => n.startsWith(`${tag}:`)) ||
    names.some((n) => n.includes(tag));
  const hint =
    names.length === 0
      ? `هیچ مدلی در Ollama نیست. با اینترنت: ollama pull ${want}`
      : !installed
        ? `مدل «${want}» نصب نیست. بزن: ollama pull ${want} — یا LLM_MODEL را مثل یکی از نصب‌شده‌ها بگذار.`
        : null;

  return {
    ok: installed && names.length > 0,
    llmReachable: tagsRes.ok,
    installedModels: names,
    configuredModel: want,
    configuredModelInstalled: installed,
    hint,
  };
}

async function checkRemoteApi(baseUrl, model, timeoutMs) {
  const apiKey = process.env.LLM_API_KEY;
  try {
    const ac = new AbortController();
    const tm = setTimeout(() => ac.abort(), timeoutMs);
    let modelsRes;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      modelsRes = await fetch(`${baseUrl}/models`, { headers, signal: ac.signal });
    } finally {
      clearTimeout(tm);
    }

    if (!modelsRes.ok) {
      return {
        ok: false,
        llmReachable: true,
        configuredModel: model,
        hint: `API سرور در دسترس است (HTTP ${modelsRes.status}) اما ممکن است کلید API نامعتبر باشد.`,
      };
    }

    const data = await modelsRes.json().catch(() => ({}));
    const models = Array.isArray(data.data)
      ? data.data.map((m) => m.id || '').filter(Boolean)
      : [];

    const installed = models.some((m) => m.includes(model));
    return {
      ok: true,
      llmReachable: true,
      availableModels: models,
      configuredModel: model,
      configuredModelInstalled: installed,
      hint: installed
        ? null
        : `مدل «${model}» ممکن است نام مستعار (alias) باشد. مدل‌های رسمی: ${models.slice(0, 10).join(', ') || '(لیست خالی)'}`,
    };
  } catch (e) {
    return {
      ok: false,
      llmReachable: false,
      configuredModel: model,
      hint: `به API سرور در ${baseUrl} وصل نشد. اینترنت / VPN را چک کن.`,
      error: e.message || String(e),
    };
  }
}
