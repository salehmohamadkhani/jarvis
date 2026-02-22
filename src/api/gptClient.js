// src/api/gptClient.js
// GPT/ChatGPT functionality - Gemini completely removed

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const CHATGPT_MODEL = 'gpt-4o-mini'

if (!OPENAI_API_KEY) {
  console.warn('VITE_OPENAI_API_KEY is not set. ChatGPT calls will fail.')
}

/**
 * فراخوانی ChatGPT API
 */
async function callChatGPT(messages, retries = 2) {
  const maxRetries = retries
  let lastError = null

  // استفاده از relative URL برای جلوگیری از Mixed Content
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const proxyUrl = apiBaseUrl ? `${apiBaseUrl}/chatgpt-proxy` : '/api/chatgpt-proxy'

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: CHATGPT_MODEL,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const error = new Error(errorData.error || 'ChatGPT API error: ' + response.status)
        
        // اگر خطای 4xx است، retry نکن
        if (response.status >= 400 && response.status < 500) {
          throw error
        }
        
        lastError = error
        if (attempt < maxRetries) {
          const delay = 1000 * attempt
          console.warn(`⚠️ ChatGPT attempt ${attempt} failed, retrying in ${delay/1000}s...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        throw error
      }

      return response.json()
    } catch (error) {
      lastError = error
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        if (attempt < maxRetries) {
          const delay = 1000 * attempt
          console.warn(`⚠️ ChatGPT attempt ${attempt} failed, retrying in ${delay/1000}s...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      
      if (attempt === maxRetries) {
        console.error(`❌ ChatGPT API error (final attempt):`, error)
        throw error
      }
    }
  }

  throw lastError || new Error('Unknown error')
}

/**
 * Voice → Text
 * Note: Audio transcription using OpenAI Whisper API.
 * This function can be implemented to use OpenAI Whisper API for transcription.
 */
export async function transcribeAudioWithOpenAI(blob) {
  throw new Error('Audio transcription is not available. Please use OpenAI Whisper API or another transcription service for audio transcription.')
}

/**
 * Text → Intent برای اپ Planner
 * Intent های پشتیبانی شده:
 * - create_project: ساخت پروژه جدید
 * - update_project: ویرایش اطلاعات پروژه موجود
 * - add_collaborator_to_project: اضافه کردن همکار به پروژه
 * - none: بقیه جملات
 */
export async function analyzePlannerIntent(message, availableProjects = [], availableCollaborators = []) {
  const projectsList = availableProjects.map((p) => `- "${p.name}" (id: ${p.id})`).join('\n')
  const collaboratorsList = availableCollaborators.map((c) => `- "${c.name}" (id: ${c.id}, role: ${c.role || 'N/A'})`).join('\n')

  const prompt = `
تو یک Intent Classifier برای یک اپ برنامه‌ریزی شخصی هستی.

Intent های پشتیبانی شده:

• "create_project"
  - ساخت پروژه جدید.
  - اگر نام پروژه گفته نشده، باید از کاربر سؤال کند.
  - اگر پروژه‌ای با نام شبیه وجود دارد، می‌تواند پیشنهاد بدهد ولی در نهایت باید با تأیید کاربر ایجاد کند.

• "update_project_client_info"
  - آپدیت اطلاعات کارفرما و معرف یک پروژه:
    - clientName، clientPhone
    - referredByName، referredByPhone
  - پروژه می‌تواند با نام یا شناسه‌اش در stateSnapshot پیدا شود.

• "add_collaborator_to_project"
  - اضافه کردن همکار به یک پروژه موجود.

• "archive_project"
  - قرار دادن پروژه در حالت آرشیو (غیرفعال).

• "restore_project"
  - برگرداندن پروژه‌ی آرشیو شده به حالت Active.

• "create_task"
  - ساخت تسک جدید برای یک پروژه.
  - فیلدهای مهم:
    - projectName یا projectId
    - title (عنوان تسک)
    - dueDate (تاریخ انجام، به فرمت استانداردی که در کد استفاده می‌شود مثل dueAt)
    - assignee / assignedTo
    - notes
  - اگر پروژه مشخص نیست یا عنوان تسک داده نشده، باید سؤال تکمیلی بپرسد.

• "update_task"
  - پیدا کردن یک تسک موجود (بر اساس اسم تسک + پروژه یا نزدیک‌ترین match در state).
  - امکان تغییر:
    - عنوان (title)
    - تاریخ (dueDate / dueAt)
    - مسئول (assignee / assignedTo)
    - یادداشت (notes)
  - اگر تسک مبهم است یا چند تسک شبیه وجود دارد، باید از کاربر بخواهد مشخص کند کدام تسک منظور است.

• "toggle_task_done"
  - مارک کردن تسک به عنوان انجام شده یا بازگردانی از done.
  - اگر کاربر بگوید «این تسک رو انجام شده بزن» یا «از done دربیار»، intent باید همین باشد.

• "navigate_today"
  - کاربر می‌خواهد به صفحه Today برود. (مثلاً: «برو صفحه Today» یا «امروز رو نشونم بده»).

• "navigate_projects"
  - رفتن به صفحه Projects.

• "navigate_finance"
  - رفتن به صفحه Finance.

• "small_talk" یا "unknown"
  - اگر پیام کاربر هیچ‌کدام از intentهای بالا را پوشش نمی‌دهد، intent را "small_talk" یا "unknown" قرار بده.
  - در صورت "unknown"، توضیح کوتاهی در entities.reason بنویس.

پروژه‌های موجود:
${projectsList || '(هیچ پروژه‌ای وجود ندارد)'}

همکاران موجود:
${collaboratorsList || '(هیچ همکاری وجود ندارد)'}

مثال‌های create_project:
- "یه پروژه جدید برای کابینکس باز کن"
- "برام یه پروژه مارکتینگ برای دیبا دنیـم بساز"
- "میخوام یه پروژه به اسم برنامه‌ریزی مهاجرت اضافه کنم"
- "یه پروژه جدید اضافه کن"

مثال‌های update_project_client_info:
- "کارفرمای پروژه کابینکس رو عوض کن به علی احمدی"
- "شماره تماس کارفرمای کابینکس رو بذار 09123456789"
- "برای پروژه کابینکس کارفرما رو اضافه کن: محمد رضایی"
- "اسم معرف پروژه دیبا رو بذار سعید کریمی"
- "شماره معرف کابینکس رو 09111111111 کن"

مثال‌های restore_project:
- "پروژه کابینکس رو restore کن"
- "پروژه دیبا رو از آرشیو دربیار"
- "پروژه کابینکس رو فعال کن"

مثال‌های add_collaborator_to_project:
- "همکار علی رو به پروژه کابینکس اضافه کن"
- "علی زارعی رو به پروژه کابینکس اضافه کن با مسئولیت طراحی UI"
- "برای پروژه کابینکس، همکار علی رو اضافه کن و مسئولیتش رو بذار توسعه Backend"
- "سارا رو به پروژه دیبا اضافه کن"
- "برای این پروژه اساین کن به علی"
- "برای پروژه کابینکس اساین کن به سارا نوری"
- "همکار علی رو به پروژه کابینکس اساین کن"
- "علی رو به این پروژه assign کن"
- "برای این پروژه همکار علی رو اضافه کن"
- "همکار علی رو به کابینکس اساین کن"

مثال‌های archive_project:
- "پروژه کابینکس رو archive کن"
- "پروژه کابینکس رو بایگانی کن"
- "پروژه دیبا رو حذف کن" (حذف یعنی archive)
- "پروژه کابینکس رو به آرشیو ببر"

مثال‌های create_task:
- "یه تسک جدید برای پروژه کابینکس اضافه کن: debug کردن سیستم"
- "یه وظیفه برای کابینکس بساز: تکمیل طراحی UI"
- "تسک جدید: تست نهایی برای پروژه دیبا"
- "یه کار جدید برای کابینکس: برطرف کردن باگ لاگین"
- "تسک: پیگیری پرداخت کارفرما، برای پروژه کابینکس"
- "یه تسک جدید بساز: تماس با مشتری، برای کابینکس"
- "یه تسک برای پروژه کابینکس اضافه کن و اساین کن به علی زارعی"
- "تسک جدید برای کابینکس: پیگیری درگاه پرداخت و اساین کن به علی زارعی"
- "برای پروژه کابینکس یه تسک بساز با عنوان تست و اساین کن به سارا نوری"
- "یه تسک برای کابینکس با تاریخ ۱۵ بهمن"
- "تسک جدید برای کابینکس تا ۲۰/۱۱/۱۴۰۳"
- "یه تسک برای پروژه کابینکس با تاریخ 2025-02-15 و اساین کن به علی زارعی"
- "تسک: تست سیستم، برای کابینکس، تا ۱۰ بهمن، اساین کن به سارا نوری"

مثال‌های update_task:
- "تسک debug کردن سیستم رو ویرایش کن"
- "تاریخ تسک تست رو تغییر بده به ۲۰ بهمن"
- "مسئول تسک پیگیری پرداخت رو عوض کن به علی"
- "یادداشت تسک تست رو اضافه کن: انجام شد"

مثال‌های toggle_task_done:
- "تسک debug کردن سیستم رو انجام شده بزن"
- "این تسک رو done کن"
- "تسک تست رو از done دربیار"
- "تسک پیگیری پرداخت رو undone کن"

مثال‌های navigate_today:
- "برو صفحه Today"
- "امروز رو نشونم بده"
- "صفحه امروز رو باز کن"

مثال‌های navigate_projects:
- "برو صفحه Projects"
- "پروژه‌ها رو نشون بده"

مثال‌های navigate_finance:
- "برو صفحه Finance"
- "مالی رو نشون بده"

خروجی باید فقط و فقط JSON معتبر باشد، بدون هیچ توضیح دیگری، بدون code fence (مثل \`\`\`json)، بدون متن اضافه. فقط JSON خالص.

ساختار JSON:

{
  "intent": "create_project" | "update_project_client_info" | "add_collaborator_to_project" | "archive_project" | "restore_project" | "create_task" | "update_task" | "toggle_task_done" | "navigate_today" | "navigate_projects" | "navigate_finance" | "small_talk" | "unknown",
  "projectName": string,
  "projectId": string | null,
  "needsProjectName": boolean,
  "updateFields": {
    "clientName": string | null,
    "clientPhone": string | null,
    "referredByName": string | null,
    "referredByPhone": string | null
  },
  "collaboratorInfo": {
    "collaboratorName": string | null,
    "collaboratorId": string | null,
    "responsibilities": string[] | null
  },
  "taskInfo": {
    "title": string | null,
    "projectId": string | null,
    "projectName": string | null,
    "assigneeName": string | null,
    "assigneeId": string | null,
    "dueDate": string | null,
    "notes": string | null
  },
  "missingFields": string[] | null,
  "entities": {
    "reason": string | null
  }
}

قوانین مهم:
- همیشه فقط یک intent اصلی برگردان (نه چند intent).
- در entities فقط فیلدهایی را پر کن که واقعاً از پیام کاربر یا state قابل استنتاج هستند.
- اگر برای اجرای intent به اطلاعات بیشتری نیاز است، اسم فیلدهای مورد نیاز را در missingFields فهرست کن (مثلاً: ["projectName", "title"]).
- اگر intent = "unknown" است، دلیل را در entities.reason بنویس.
- اگر کاربر می‌خواهد پروژه جدید بسازد → intent = "create_project"
- اگر کاربر می‌خواهد اطلاعات کارفرما/معرف پروژه را تغییر دهد → intent = "update_project_client_info"
- اگر کاربر می‌خواهد همکاری را به پروژه اضافه کند (بدون ساخت تسک) → intent = "add_collaborator_to_project"
- اگر کاربر می‌خواهد پروژه را archive (بایگانی) کند → intent = "archive_project"
- اگر کاربر می‌خواهد پروژه آرشیو شده را restore کند → intent = "restore_project"
- اگر کاربر می‌خواهد تسک/وظیفه جدید بسازد → intent = "create_task"
- اگر کاربر می‌خواهد تسک موجود را ویرایش کند → intent = "update_task"
- اگر کاربر می‌خواهد تسک را done/undone کند → intent = "toggle_task_done"
- اگر کاربر می‌خواهد به صفحه Today برود → intent = "navigate_today"
- اگر کاربر می‌خواهد به صفحه Projects برود → intent = "navigate_projects"
- اگر کاربر می‌خواهد به صفحه Finance برود → intent = "navigate_finance"
- تفاوت مهم: اگر کاربر می‌گوید "تسک" یا "وظیفه" یا "کار" در جمله → احتمالاً create_task یا update_task است
- اما اگر فقط می‌گوید "برای پروژه X اساین کن به Y" یا "همکار Y رو به پروژه X اضافه کن" → intent = "add_collaborator_to_project"
- برای update_project_client_info، projectId را از لیست پروژه‌های موجود پیدا کن (با تطبیق نام)
- برای add_collaborator_to_project:
  - projectId و collaboratorId را از لیست‌های موجود پیدا کن (با تطبیق نام)
  - responsibilities را به صورت آرایه استخراج کن (اگر ذکر شده)
- برای archive_project، projectId را از لیست پروژه‌های موجود پیدا کن (با تطبیق نام)
- برای create_task:
  - taskInfo.title: عنوان تسک را استخراج کن (مثلاً: "debug کردن سیستم"، "تکمیل طراحی UI")
  - taskInfo.projectId و taskInfo.projectName: پروژه را از لیست پروژه‌های موجود پیدا کن (با تطبیق نام). کلمات کلیدی: "برای پروژه"، "به پروژه"، "در پروژه"، "پروژه"
  - taskInfo.assigneeName و taskInfo.assigneeId: اگر کاربر نام همکاری را ذکر کرد، از لیست همکاران موجود پیدا کن. کلمات کلیدی: "اساین کن به"، "assign کن به"، "مسئولش کن"، "به [نام همکار] اساین کن"
  - taskInfo.dueDate: اگر تاریخ یا روزی ذکر شد، به فرمت YYYY-MM-DD برگردان (مثلاً: "2025-02-15")
  - taskInfo.notes: اگر توضیحات اضافی ذکر شد، استخراج کن. کلمات کلیدی: "توضیحات"، "notes"، "گزارش"، "یادداشت"
  - مهم: اگر کاربر در یک جمله هم project و هم assignee گفته (مثل: "یه تسک برای پروژه کابینکس و اساین کن به علی زارعی") هر دو را استخراج کن
- updateFields فقط برای update_project_client_info پر می‌شود
- collaboratorInfo فقط برای add_collaborator_to_project پر می‌شود
- taskInfo برای create_task، update_task، و toggle_task_done پر می‌شود
- missingFields: لیست فیلدهای مورد نیاز که در پیام کاربر ذکر نشده (مثلاً اگر create_project اما projectName داده نشده: ["projectName"])
- entities.reason: فقط برای intent = "unknown" پر می‌شود
- اگر فیلدی در پیام کاربر ذکر نشده، null بگذار
- projectName، collaboratorName، taskInfo.title را تا حد امکان کوتاه و تمیز برگردان (بدون واژه‌هایی مثل "یه پروژه به نام")
- برای toggle_task_done: باید taskInfo.title یا taskInfo.projectId + taskInfo.title را پر کنی تا تسک مورد نظر پیدا شود
- برای update_task: باید taskInfo.title و taskInfo.projectId/projectName را پر کنی تا تسک مورد نظر پیدا شود`

  try {
    console.log('🔄 Using ChatGPT for intent analysis')
    const chatgptMessages = [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: `User message:\n"${message}"`
      }
    ]
    
    const chatgptData = await callChatGPT(chatgptMessages)
    const raw = chatgptData?.choices?.[0]?.message?.content?.trim() || ''
    
    if (!raw) {
      throw new Error('ChatGPT did not return any response')
    }
    
    console.log('✅ ChatGPT succeeded')

    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    const jsonString =
      jsonStart !== -1 && jsonEnd !== -1 ? raw.slice(jsonStart, jsonEnd + 1) : '{}'

    const parsed = JSON.parse(jsonString)

    let intent = 'none'
    if (parsed.intent === 'create_project') intent = 'create_project'
    else if (parsed.intent === 'update_project_client_info') intent = 'update_project_client_info'
    else if (parsed.intent === 'add_collaborator_to_project') intent = 'add_collaborator_to_project'
    else if (parsed.intent === 'archive_project') intent = 'archive_project'
    else if (parsed.intent === 'restore_project') intent = 'restore_project'
    else if (parsed.intent === 'create_task') intent = 'create_task'
    else if (parsed.intent === 'update_task') intent = 'update_task'
    else if (parsed.intent === 'toggle_task_done') intent = 'toggle_task_done'
    else if (parsed.intent === 'navigate_today') intent = 'navigate_today'
    else if (parsed.intent === 'navigate_projects') intent = 'navigate_projects'
    else if (parsed.intent === 'navigate_finance') intent = 'navigate_finance'

    // پردازش responsibilities - اگر string بود، تبدیل به آرایه کن
    let responsibilities = null
    if (parsed.collaboratorInfo?.responsibilities) {
      if (Array.isArray(parsed.collaboratorInfo.responsibilities)) {
        responsibilities = parsed.collaboratorInfo.responsibilities.filter((r) => r && r.trim())
      } else if (typeof parsed.collaboratorInfo.responsibilities === 'string') {
        responsibilities = parsed.collaboratorInfo.responsibilities
          .split(/[،,]/)
          .map((r) => r.trim())
          .filter((r) => r)
      }
    }

    // پردازش taskInfo
    const taskInfo = parsed.taskInfo || {}
    let taskAssigneeName = null
    let taskAssigneeId = null
    if (taskInfo.assigneeName) {
      const assigneeName = typeof taskInfo.assigneeName === 'string' ? taskInfo.assigneeName.trim() : null
      if (assigneeName) {
        // پیدا کردن همکار از لیست
        const foundCollaborator = availableCollaborators.find(
          (c) =>
            c.name.toLowerCase().includes(assigneeName.toLowerCase()) ||
            assigneeName.toLowerCase().includes(c.name.toLowerCase())
        )
        if (foundCollaborator) {
          taskAssigneeName = foundCollaborator.name
          taskAssigneeId = foundCollaborator.id
        } else {
          taskAssigneeName = assigneeName
        }
      }
    }

    return {
      intent,
      projectName: typeof parsed.projectName === 'string' ? parsed.projectName.trim() : '',
      projectId: typeof parsed.projectId === 'string' ? parsed.projectId.trim() : null,
      needsProjectName: !!parsed.needsProjectName,
      updateFields: parsed.updateFields || {
        clientName: null,
        clientPhone: null,
        referredByName: null,
        referredByPhone: null,
      },
      collaboratorInfo: {
        collaboratorName:
          typeof parsed.collaboratorInfo?.collaboratorName === 'string'
            ? parsed.collaboratorInfo.collaboratorName.trim()
            : null,
        collaboratorId:
          typeof parsed.collaboratorInfo?.collaboratorId === 'string'
            ? parsed.collaboratorInfo.collaboratorId.trim()
            : null,
        responsibilities,
      },
      taskInfo: {
        title: typeof taskInfo.title === 'string' ? taskInfo.title.trim() : null,
        projectId: typeof taskInfo.projectId === 'string' ? taskInfo.projectId.trim() : null,
        projectName: typeof taskInfo.projectName === 'string' ? taskInfo.projectName.trim() : null,
        assigneeName: taskAssigneeName,
        assigneeId: taskAssigneeId,
        dueDate: typeof taskInfo.dueDate === 'string' ? taskInfo.dueDate.trim() : null,
        notes: typeof taskInfo.notes === 'string' ? taskInfo.notes.trim() : null,
      },
    }
  } catch (error) {
    console.error('analyzePlannerIntent failed', error)
    return {
      intent: 'none',
      projectName: '',
      needsProjectName: false,
      taskInfo: {
        title: null,
        projectId: null,
        projectName: null,
        assigneeName: null,
        assigneeId: null,
        dueDate: null,
        notes: null,
      },
    }
  }
}

