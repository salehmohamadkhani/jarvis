
function baseResult(overrides) {
  return {
    executable: true,
    reason: null,
    clarifyingQuestions: null,
    intent: 'none',
    projectName: '',
    projectId: null,
    needsProjectName: false,
    updateFields: {
      clientName: null,
      clientPhone: null,
      referredByName: null,
      referredByPhone: null,
    },
    collaboratorInfo: {
      collaboratorName: null,
      collaboratorId: null,
      responsibilities: null,
    },
    taskInfo: {
      title: null,
      projectId: null,
      projectName: null,
      assigneeName: null,
      assigneeId: null,
      dueDate: null,
      notes: null,
    },
    meetingInfo: {
      title: null,
      scheduledAt: null,
      projectId: null,
      projectName: null,
      durationMinutes: null,
    },
    transactionInfo: {
      amount: null,
      type: null,
      date: null,
      category: null,
      description: null,
      projectId: null,
    },
    missingFields: [],
    entities: { reason: null },
    ...overrides,
  }
}

export function analyzeHeuristicLocal(userMessage, state) {
  const t = (userMessage || '').trim()
  if (!t) return null

  const projects = (state?.projects || []).filter((p) => !p.archived)

  /* «صدای من می‌آید؟» — تشخیص گفتار اغلب چیز شبیه «سدائمان برقادی» می‌دهد */
  if (
    t.length <= 55 &&
    /صد|صوت|میکروفون|می‌شنو|میشنوی|برقرار|تست\s*صدا|سدائ|برقاد|سدای|شنیدی|می‌فهمی|میفهمی/i.test(t)
  ) {
    return baseResult({
      executable: true,
      intent: 'small_talk',
      entities: { reason: 'voice_check' },
    })
  }

  /* شبیه «یک پروژه…» — قبل از الگوی جلسه چون «سیت اکون» هر دو را دارند */
  if (t.length <= 90 && /یک\s*جانا|جانا\s*سیت|یانه\s*سیت|پروژه.*سیت/i.test(t)) {
    return baseResult({
      intent: 'create_project',
      needsProjectName: true,
      projectName: '',
    })
  }

  /* تشخیص گفتار پرخطا برای «جلسه» — مثال: «نتجلسه سیت باکار»، «نک تیرست سیت بکار» */
  if (t.length <= 90 && /جلس|سلسه|میتین|زلسه|نتجل|سیت\s*با|ست\s*با|باکار|سیت\s*بکار|تیرست|نک\s*تی/i.test(t)) {
    return baseResult({
      intent: 'create_meeting',
      clarifyingQuestions: ['برای چه پروژه‌ای؟', 'چه زمانی؟ (مثلاً فردا ساعت ۱۰)', 'عنوان جلسه چی باشه؟'],
      meetingInfo: {},
    })
  }

  if (t.length <= 90 && /سیت\s*اکون/i.test(t)) {
    return baseResult({
      intent: 'create_project',
      needsProjectName: true,
      projectName: '',
    })
  }

  if (/برو\s*امروز|صفحه\s*امروز|^امروز$/i.test(t)) {
    return baseResult({ intent: 'navigate_today' })
  }
  if (/برو\s*پروژه|لیست\s*پروژه|پروژه\s*ها|برو\s*به\s*پروژه/i.test(t)) {
    return baseResult({ intent: 'navigate_projects' })
  }
  if (/برو\s*مالی|صفحه\s*مالی|^مالی$/i.test(t)) {
    return baseResult({ intent: 'navigate_finance' })
  }

  for (const p of projects) {
    const name = p.name
    if (!name || name.length < 2) continue
    if (!t.includes(name)) continue
    if (/چی\s*داریم|چیا\s*داریم|چه\s*اطلاعاتی|بهم\s*بگو|وضعیت\s*پروژه|توش\s*چی|چی\s*هست\s*توش/i.test(t)) {
      return baseResult({ intent: 'project_info', projectName: name })
    }
  }

  let m = t.match(
    /یک\s*(?:پروژه|جنس|چیز)\s+(?:به\s*نام\s+|به\s*اسم\s+|اسم\s*)?["«]?(.+?)["»]?\s*(?:بساز|بسازیم|ایجاد|بکن|ست\s*کن)/i
  )
  if (!m) m = t.match(/(?:پروژه|جنس)\s+["«]?(.+?)["»]?\s*(?:بساز|ایجاد|بکن)/i)
  if (m && m[1]) {
    const name = m[1]
      .replace(/^(به\s*نام|به\s*اسم|اسم)\s+/i, '')
      .replace(/\s+(بساز|ایجاد|بکن)$/i, '')
      .trim()
    if (name.length >= 2) {
      return baseResult({
        intent: 'create_project',
        projectName: name,
        needsProjectName: false,
      })
    }
  }

  if (/پروژه\s+جدید|ساخت\s*پروژه|پروژه\s+بساز|create\s+project/i.test(t)) {
    return baseResult({
      intent: 'create_project',
      needsProjectName: true,
      projectName: '',
    })
  }

  if (/جلسه\s*(?:بذار|بزار|ست\s*کن|بساز|اضافه)/i.test(t)) {
    return baseResult({
      intent: 'create_meeting',
      clarifyingQuestions: ['برای چه پروژه‌ای؟', 'چه زمانی؟ (مثلاً فردا ساعت ۱۰)', 'عنوان جلسه چی باشه؟'],
      meetingInfo: {},
    })
  }

  const taskMatch = t.match(/تسک\s+(.+?)\s+(?:به|برای)\s*پروژه\s+(.+)/i)
  if (taskMatch) {
    return baseResult({
      intent: 'create_task',
      taskInfo: {
        title: taskMatch[1].trim(),
        projectName: taskMatch[2].trim(),
        projectId: null,
        assigneeName: null,
        assigneeId: null,
        dueDate: null,
        notes: null,
      },
    })
  }

  if (/تسک|وظیفه/i.test(t) && /اضافه|بذار|بساز|ایجاد/i.test(t)) {
    return baseResult({
      intent: 'create_task',
      clarifyingQuestions: [
        'یک جمله بگو؛ مثلاً: «تسک تماس با مشتری را به پروژه دیبا اضافه کن».',
      ],
      taskInfo: {
        title: null,
        projectId: null,
        projectName: null,
        assigneeName: null,
        assigneeId: null,
        dueDate: null,
        notes: null,
      },
    })
  }

  return null
}

export function fallbackReasonWhenNoLlm(userMessage) {
  const t = (userMessage || '').trim()
  const vague = t.length > 0 && t.length < 30 && !/\s/.test(t)
  const hint = vague
    ? ' جملهٔ کوتاه بود یا تشخیص صدا شاید غلط بوده؛ دوباره با چند کلمهٔ واضح‌تر بگو.'
    : ''
  return (
    `تحلیل هوشمند دستور الان برقرار نشد (مدل زبانی یا وصل نیست یا خطای شبکه داد).${hint}\n\n` +
      'معمولاً یکی از این‌ها خالی است:\n' +
      '• در Ollama هنوز هیچ مدلی دانلود نشده — در ترمینال بزن: `ollama pull` و بعد نام مدلی که در `.env.local` برای `LLM_MODEL` نوشتی (مثلاً `ollama pull qwen2.5:7b-instruct`).\n' +
      '• یا نام مدل در `LLM_MODEL` و `VITE_LLM_MODEL` با موردی که `ollama list` نشان می‌دهد یکی نیست.\n' +
      'برای چک سریع از مرورگر: `http://localhost:3001/api/llm-status` (وقتی سرور Node روشن است).'
  )
}
