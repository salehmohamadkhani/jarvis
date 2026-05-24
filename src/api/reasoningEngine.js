import { callChatGPT } from './gptClient.js'
import { analyzeHeuristicLocal, fallbackReasonWhenNoLlm } from './reasoningHeuristic.js'

const DB_SCHEMA = `
Database schema (what the app has):

• projects: id, name, status (active|archived), clientName, clientPhone, referredByName, referredByPhone, startDate, dueDate, notes
• tasks: id, projectId, title, dueAt, status (todo|done), assigneeId, notes, archived
• meetings: id, projectId, title, scheduledAt, durationMinutes, notes
• collaborators: id, name, role, email, phone (can be assigned to projects and tasks)
• transactions (finance): amount, type (income|expense), date, category, description, projectId (optional)

Supported actions (intents): create_project, create_task, create_meeting, add_transaction, update_project_client_info, add_collaborator_to_project, archive_project, restore_project, update_task, toggle_task_done, navigate_today, navigate_projects, navigate_finance, project_info.
- project_info: when the user asks what they can add to a project, or what information exists in a project, or what data we have for a project (e.g. "چه اطلاعاتی میتونم به پروژه X اضافه کنم", "برای پروژه تهران مدیکس چی داریم", "پروژه X چی داره", "وضعیت پروژه X"). Return executable: true with intent "project_info" and projectName. The answer is given IN CHAT; do NOT use navigate_* for these.
- navigate_today / navigate_projects / navigate_finance: use ONLY when the user EXPLICITLY asks to GO or OPEN that screen (e.g. "برو پروژه‌ها", "برو امروز", "برو مالی", "پروژه‌ها رو نشون بده", "برو به صفحه پروژه‌ها"). If the user is only ASKING A QUESTION about data (چی داریم، چه اطلاعاتی، چی میتونم اضافه کنم، برای پروژه X چی داریم) then do NOT use navigate_* — use project_info or another intent so the answer stays in chat.
If the user request does NOT map to any of these or to existing data, the command is NOT executable.
`

export function buildStateSummary(state) {
  const projects = state?.projects || []
  const tasks = state?.tasks || []
  const meetings = state?.meetings || []
  const collaborators = state?.collaborators || []

  const activeProjects = projects.filter((p) => !p.archived)
  const projectNames = activeProjects.map((p) => p.name)
  const archivedProjectNames = projects.filter((p) => p.archived).map((p) => p.name)
  const collaboratorNames = collaborators.map((c) => c.name)

  const projectDetails = activeProjects.map((p) => {
    const tasksCount = tasks.filter((t) => String(t.projectId) === String(p.id) && t.costAmount == null && !t.archived).length
    const meetingsCount = meetings.filter((m) => String(m.projectId) === String(p.id)).length
    const collabCount = (p.collaborators && Array.isArray(p.collaborators)) ? p.collaborators.length : 0
    return { name: p.name, id: p.id, tasks: tasksCount, meetings: meetingsCount, collaborators: collabCount }
  })
  const projectDetailsText = projectDetails.length
    ? '\n\nPer-project data (for answering "what can I add" or "what is in this project"):\n' +
      projectDetails.map((d) => `• "${d.name}" (id: ${d.id}): ${d.tasks} task(s), ${d.meetings} meeting(s), ${d.collaborators} collaborator(s).`).join('\n')
    : ''

  return {
    hasDatabase: true,
    projectNames,
    archivedProjectNames,
    collaboratorNames,
    projectsCount: projectNames.length,
    tasksCount: tasks.length,
    meetingsCount: meetings.length,
    collaboratorsCount: collaboratorNames.length,
    projectDetails,
    summaryText:
      `Current state: ${projectNames.length} active project(s)${projectNames.length ? ': ' + projectNames.join(', ') : ''}. ` +
      (archivedProjectNames.length ? `Archived projects: ${archivedProjectNames.join(', ')}. ` : '') +
      `${collaboratorNames.length} collaborator(s)${collaboratorNames.length ? ': ' + collaboratorNames.join(', ') : ''}. ` +
      `Tasks: ${tasks.length}, Meetings: ${meetings.length}.` +
      projectDetailsText,
  }
}

export async function analyzeWithReasoning(userMessage, state, previousContext = null, currentPhase = null, pendingIntent = null, conversationHistory = []) {
  const stateSummary = buildStateSummary(state)
  const schemaAndState = DB_SCHEMA + '\n\n' + stateSummary.summaryText
  let contextBlock = previousContext
    ? `\n\nPrevious exchange:\nAssistant asked: ${previousContext.questions}\nUser said: ${previousContext.userReply}`
    : ''
  if (currentPhase && pendingIntent) {
    contextBlock += `\n\nIMPORTANT: The user is currently in the middle of a task. currentPhase: ${currentPhase}, pendingIntent: ${pendingIntent}. If the user asks "what information do you need?", "what do you need?", "چه اطلاعاتی میخوای", "چی میخوای" or similar meta-questions about the current task, you MUST return executable: true with intent: ${pendingIntent} and the appropriate missingFields or clarifyingQuestions so the assistant can re-explain what is needed. Do NOT return executable: false or "unclear" for these meta-questions.`
  }

  const maxHistory = 24
  const historySlice = Array.isArray(conversationHistory) ? conversationHistory.slice(-maxHistory) : []
  const conversationBlock =
    historySlice.length > 0
      ? '\n\nFull conversation so far (use this to keep context; the user\'s latest message is below):\n' +
        historySlice
          .map((m) => (m.role === 'user' ? `User: ${(m.content || '').trim()}` : `Assistant: ${(m.content || '').trim()}`))
          .join('\n')
      : ''

  const systemPrompt = `You are the reasoning engine for a planner/finance app. The user speaks via voice in Farsi (Persian); you must decide if their request is executable given the database schema and current state. You have access to the ENTIRE conversation so far — use it to understand multi-turn requests (e.g. "set a meeting" then "meeting with CEO" then "next Saturday" = one meeting). Merge information from earlier turns into intent and entities.

IMPORTANT – Voice recognition (Farsi) often mishears words: "جنس" / "چنس" / "جنش" usually means "پروژه" (project). "چیز" / "یچیز" can mean project or task. So when the user says things like "یک جنس X بساز", "یک پروژه X صدید کن", "یک چیز X ساخت کن", treat it as create_project with projectName X. Prefer mapping to create_project or create_task when in doubt for "ساخت / بساز / ست کن / صدید کن" type requests.

ALL your output (reason, clarifyingQuestions) MUST be in the SAME language as the user. If the user wrote in Farsi, respond ONLY in Farsi.

${schemaAndState}
${conversationBlock}
${contextBlock}

Rules:
1. Only actions that exist in the schema (projects, tasks, meetings, collaborators, transactions) are executable. If the user asks for something we don't have (e.g. "send email", "book a flight"), set executable: false and explain in reason (in user language).
2. When the user clearly wants an action (e.g. "یک جلسه ست کن", "جلسه بذار") but details are missing, return executable: true with that intent and set clarifyingQuestions (1–3 short questions in Farsi) so the app can ask. Do NOT return executable: false with "vague" or "not enough info" — use clarifyingQuestions instead.
3. If the request is ambiguous (e.g. "cancel the project" but there are multiple projects), set clarifyingQuestions with 1–3 short questions in the same language as the user.
4. If you have enough to map to exactly one intent and known entities, set executable: true and fill intent + entities in the exact format below.
5. When the user asks WHAT EXISTS in a project or what they can add (any of: "چی داریم", "چیا داریم", "توش چیا هست", "بهم بگو", "چه اطلاعاتی", "وضعیت پروژه", "what do we have", "what's in it"), and a project name is mentioned or clear from context, ALWAYS return executable: true with intent: "project_info" and projectName set to that project (from the state list). Do NOT return executable: false with "نمیتوانم اطلاعات مشخص کنم" or similar — we CAN and MUST answer from data. Examples: "برای پروژه تهران مدیکس چیا داریم بهم بگو توش چیا هست" → project_info, projectName = تهران مدیکس (or matching name in state). "شما درخواست خاصی نکردید" or "متأسفانه نمیتوانم اطلاعات مربوط به وظایف یا جلسات را مشخص کنم" are WRONG for these questions; use project_info instead.
6. CRITICAL – Navigation: Use navigate_today, navigate_projects, or navigate_finance ONLY when the user explicitly asks to go/open that screen (برو، بریم، نشون بده، باز کن، برو به صفحه). If they are asking a question about projects/data (چی داریم، چه اطلاعاتی، برای پروژه X چی داریم، پروژه X چی داره), use project_info or the relevant intent — do NOT navigate. Example: "برای پروژه تهران مدیکس چی داریم" → intent = project_info, projectName = (match from state). Example: "برو پروژه‌ها" or "پروژه‌ها رو نشون بده" → intent = navigate_projects.
7. CRITICAL: When the conversation shows an ongoing task (e.g. assistant asked for "meeting title and time", user then gave a title) — treat the LATEST user message as a follow-up. Fill in meetingInfo/taskInfo with whatever was already provided in earlier turns plus the new message. Do NOT return "ambiguous" or "not complete" if the full conversation already contains the needed pieces; merge them and return executable: true with the combined entities.

Output ONLY valid JSON, no markdown or extra text. Use this exact structure:

{
  "executable": true | false,
  "reason": "string or null (required when executable is false: why the command cannot be executed)",
  "clarifyingQuestions": ["question1", "question2"] or null,
  "intent": "create_project" | "create_task" | "create_meeting" | "add_transaction" | "update_project_client_info" | "add_collaborator_to_project" | "archive_project" | "restore_project" | "update_task" | "toggle_task_done" | "navigate_today" | "navigate_projects" | "navigate_finance" | "project_info" | "small_talk" | null,
  "projectName": string | null,
  "projectId": string | null,
  "needsProjectName": boolean,
  "updateFields": { "clientName": null, "clientPhone": null, "referredByName": null, "referredByPhone": null } | null,
  "collaboratorInfo": { "collaboratorName": null, "collaboratorId": null, "responsibilities": null } | null,
  "taskInfo": { "title": null, "projectId": null, "projectName": null, "assigneeName": null, "assigneeId": null, "dueDate": null, "notes": null } | null,
  "meetingInfo": { "title": null, "scheduledAt": null, "projectId": null, "projectName": null, "durationMinutes": null } | null,
  "transactionInfo": { "amount": null, "type": "income"|"expense"|null, "date": null, "category": null, "description": null, "projectId": null } | null,
  "missingFields": ["field1", "field2"] | null,
  "entities": { "reason": null }
}

When executable is false, always set reason (in user language). When you need more info from user, set clarifyingQuestions (1–3 items, in Farsi if user is Farsi). Example for create_meeting: ["برای چه پروژه‌ای؟", "چه زمانی؟ (مثلاً فردا ساعت ۱۰)", "عنوان جلسه چی باشه؟"]. When executable is true, intent and the relevant *Info and ids must be set. Use the same entity field names as in the schema.`

  const userContent =
    conversationBlock && conversationBlock.length > 0
      ? `Latest user message (current turn): "${userMessage}"\n\nRespond with JSON for this message in the context of the full conversation above.`
      : previousContext
        ? `User follow-up: "${userMessage}"`
        : `User said: "${userMessage}"`

  const heuristicFirst = analyzeHeuristicLocal(userMessage, state)
  if (heuristicFirst) {
    return heuristicFirst
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ]
    const data = await callChatGPT(messages)
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''
    if (!raw) throw new Error('Empty response from reasoning engine')

    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    const jsonStr = jsonStart !== -1 && jsonEnd !== -1 ? raw.slice(jsonStart, jsonEnd + 1) : '{}'
    const parsed = JSON.parse(jsonStr)

    const executable = !!parsed.executable
    const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : null
    const clarifyingQuestions = Array.isArray(parsed.clarifyingQuestions)
      ? parsed.clarifyingQuestions.filter((q) => typeof q === 'string').map((q) => q.trim())
      : null
    const intent = typeof parsed.intent === 'string' && parsed.intent !== 'none' ? parsed.intent : null

    const taskInfo = parsed.taskInfo || {}
    const meetingInfo = parsed.meetingInfo || {}
    const transactionInfo = parsed.transactionInfo || {}

    return {
      executable,
      reason: executable ? null : (reason || 'دستور شما با قابلیت‌های فعلی برنامه همخوان نیست.'),
      clarifyingQuestions: clarifyingQuestions && clarifyingQuestions.length > 0 ? clarifyingQuestions : null,
      intent: intent || 'none',
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
        responsibilities: Array.isArray(parsed.collaboratorInfo?.responsibilities)
          ? parsed.collaboratorInfo.responsibilities
          : null,
      },
      taskInfo: {
        title: typeof taskInfo.title === 'string' ? taskInfo.title.trim() : null,
        projectId: typeof taskInfo.projectId === 'string' ? taskInfo.projectId.trim() : null,
        projectName: typeof taskInfo.projectName === 'string' ? taskInfo.projectName.trim() : null,
        assigneeName: typeof taskInfo.assigneeName === 'string' ? taskInfo.assigneeName.trim() : null,
        assigneeId: typeof taskInfo.assigneeId === 'string' ? taskInfo.assigneeId.trim() : null,
        dueDate: typeof taskInfo.dueDate === 'string' ? taskInfo.dueDate.trim() : null,
        notes: typeof taskInfo.notes === 'string' ? taskInfo.notes.trim() : null,
      },
      meetingInfo: {
        title: typeof meetingInfo.title === 'string' ? meetingInfo.title.trim() : null,
        scheduledAt: typeof meetingInfo.scheduledAt === 'string' ? meetingInfo.scheduledAt.trim() : null,
        projectId: typeof meetingInfo.projectId === 'string' ? meetingInfo.projectId.trim() : null,
        projectName: typeof meetingInfo.projectName === 'string' ? meetingInfo.projectName.trim() : null,
        durationMinutes:
          typeof meetingInfo.durationMinutes === 'number'
            ? meetingInfo.durationMinutes
            : typeof meetingInfo.durationMinutes === 'string' && meetingInfo.durationMinutes
              ? parseInt(meetingInfo.durationMinutes, 10)
              : null,
      },
      transactionInfo: {
        amount: typeof transactionInfo.amount === 'number' ? transactionInfo.amount : (typeof transactionInfo.amount === 'string' && transactionInfo.amount) ? parseFloat(transactionInfo.amount) : null,
        type: transactionInfo.type === 'income' || transactionInfo.type === 'expense' ? transactionInfo.type : null,
        date: typeof transactionInfo.date === 'string' ? transactionInfo.date.trim() : null,
        category: typeof transactionInfo.category === 'string' ? transactionInfo.category.trim() : null,
        description: typeof transactionInfo.description === 'string' ? transactionInfo.description.trim() : null,
        projectId: typeof transactionInfo.projectId === 'string' ? transactionInfo.projectId.trim() : null,
      },
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
      entities: { reason: typeof parsed.entities?.reason === 'string' ? parsed.entities.reason.trim() : null },
    }
  } catch (err) {
    console.error('analyzeWithReasoning failed', err)
    const heuristic = analyzeHeuristicLocal(userMessage, state)
    if (heuristic) {
      return heuristic
    }
    return {
      executable: false,
      reason: fallbackReasonWhenNoLlm(userMessage),
      clarifyingQuestions: null,
      intent: 'none',
      projectName: '',
      projectId: null,
      needsProjectName: false,
      updateFields: {},
      collaboratorInfo: { collaboratorName: null, collaboratorId: null, responsibilities: null },
      taskInfo: { title: null, projectId: null, projectName: null, assigneeName: null, assigneeId: null, dueDate: null, notes: null },
      meetingInfo: { title: null, scheduledAt: null, projectId: null, projectName: null, durationMinutes: null },
      transactionInfo: { amount: null, type: null, date: null, category: null, description: null, projectId: null },
      missingFields: [],
      entities: { reason: null },
    }
  }
}
