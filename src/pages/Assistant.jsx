import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useVoiceRecorder from '../hooks/useVoiceRecorder.js'
import { transcribeWithFallback, STT_LANGUAGE } from '../api/speechToText.js'
import { analyzeWithReasoning } from '../api/reasoningEngine.js'
import { usePlanner } from '../state/PlannerContext.jsx'
import { plannerApiUrl } from '../utils/plannerApiUrl.js'
import { DSPage, DSSection, DSButton } from '../design-system'
import {
  handleCreateProject,
  handleUpdateProjectClientInfo,
  handleAddCollaboratorToProject,
  handleArchiveProject,
  handleRestoreProject,
  handleCreateTask,
  handleUpdateTask,
  handleToggleTaskDone,
  handleNavigateToday,
  handleNavigateProjects,
  handleNavigateFinance,
  handleCreateMeeting,
} from '../assistant/assistantActions.js'

const PHASE_IDLE = 'idle'
const PHASE_WAITING_NAME = 'awaitingProjectName'
const PHASE_WAITING_CONFIRM = 'awaitingProjectConfirmation'
const PHASE_WAITING_UPDATE_CONFIRM = 'awaitingUpdateConfirmation'
const PHASE_WAITING_COLLABORATOR_CONFIRM = 'awaitingCollaboratorConfirmation'
const PHASE_WAITING_ARCHIVE_CONFIRM = 'awaitingArchiveConfirmation'
const PHASE_WAITING_TASK_ASSIGNEE = 'awaitingTaskAssignee'
const PHASE_WAITING_TASK_DATE = 'awaitingTaskDate'
const PHASE_WAITING_TASK_NOTES = 'awaitingTaskNotes'
const PHASE_WAITING_TASK_CONFIRM = 'awaitingTaskConfirmation'
const PHASE_WAITING_MEETING_PROJECT = 'awaitingMeetingProject'
const PHASE_WAITING_MEETING_WHEN = 'awaitingMeetingWhen'
const PHASE_WAITING_MEETING_TITLE = 'awaitingMeetingTitle'
const PHASE_WAITING_MEETING_CONFIRM = 'awaitingMeetingConfirmation'
const PHASE_WAITING_CLARIFICATION = 'awaitingClarification'

const SESSION_CONVERSATION_KEY = 'jarvis-assistant-conversation'
const MAX_PERSISTED_MESSAGES = 80

function loadConversationFromSession() {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_CONVERSATION_KEY) : null
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-MAX_PERSISTED_MESSAGES)
  } catch {
    return []
  }
}

const VOICE_NEXT_HINTS = {
  project: 'می‌تونی با صدا بگی: تسک اضافه کن، همکار به پروژه اضافه کن، جلسه بذار، یا اطلاعات پروژه رو آپدیت کن.',
  meeting: 'می‌تونی تسک یا جلسهٔ بعدی رو با صدا اضافه کنی.',
  projectUpdated: 'می‌تونی تسک، همکار یا جلسه به این پروژه اضافه کنی.',
  collaborator: 'می‌تونی همکار دیگه اضافه کنی یا تسک بهش اساین کنی.',
  task: 'می‌تونی تسک بعدی بگی یا همین تسک رو با صدا آپدیت/تکمیل کنی.',
  archived: 'می‌تونی با صدا بگی: پروژه رو برگردون (restore) یا پروژهٔ جدید بساز.',
}

const SpeechRecognitionCtor = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export default function Assistant() {
  const { isRecording, startRecording, stopRecording, streamRef: recorderStreamRef } = useVoiceRecorder()
  const [voiceLevel, setVoiceLevel] = useState(0)
  const [voiceJitter, setVoiceJitter] = useState(0)
  const voiceAnalyserRef = useRef(null)
  const orbSceneRef = useRef(null)
  const recognitionRef = useRef(null)
  const browserTranscriptRef = useRef('')
  const speechRecognitionErrorRef = useRef('')
  const voiceSessionActiveRef = useRef(false)
  const voicePressEndHandledRef = useRef(false)
  const confirmTaskRef = useRef(null)
  const {
    state,
    addProject,
    updateProject,
    archiveProject,
    restoreProject,
    addTask,
    updateTask,
    toggleTask,
    addCollaborator,
    addMeeting,
  } = usePlanner()
  const navigate = useNavigate()

  const planner = {
    state,
    addProject,
    updateProject,
    archiveProject,
    restoreProject,
    addTask,
    updateTask,
    toggleTask,
    addCollaborator,
    addMeeting,
  }

  const [mode, setMode] = useState('idle')
  const [assistantPhase, setAssistantPhase] = useState(PHASE_IDLE)
  const [_lastTranscript, setLastTranscript] = useState('')
  const [assistantNote, setAssistantNote] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [llmSetupHint, setLlmSetupHint] = useState('')
  const [pendingProject, setPendingProject] = useState(null)
  const [pendingUpdate, setPendingUpdate] = useState(null)
  const [pendingCollaborator, setPendingCollaborator] = useState(null)
  const [pendingArchive, setPendingArchive] = useState(null)
  const [pendingTask, setPendingTask] = useState(null)
  const [pendingMeeting, setPendingMeeting] = useState(null)
  const [pendingReasoningContext, setPendingReasoningContext] = useState(null)
  const [conversationMessages, setConversationMessages] = useState(loadConversationFromSession)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orbTilt, setOrbTilt] = useState({ rx: 0, ry: 0, dx: 0, dy: 0 })

  useEffect(() => {
    try {
      const toSave = conversationMessages.slice(-MAX_PERSISTED_MESSAGES)
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_CONVERSATION_KEY, JSON.stringify(toSave))
    } catch (e) {
      // ignore quota or parse errors
    }
  }, [conversationMessages])

  useEffect(() => {
    const loaded = loadConversationFromSession()
    if (loaded.length > 0) setConversationMessages(loaded)
  }, [])

  useEffect(() => {
    let cancelled = false
    const url = plannerApiUrl('llm-status')
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data || data.ok) return
        if (typeof data.hint === 'string' && data.hint.trim()) setLlmSetupHint(data.hint.trim())
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const addAssistantReply = useCallback((text) => {
    setAssistantNote(text)
    setConversationMessages((prev) => [...prev, { role: 'assistant', content: text }])
  }, [])

  const handlePressStart = useCallback(async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    /* از ref استفاده می‌کنیم تا همپوشانی با به‌روزرسانی دیرهنگام isRecording نگیریم */
    if (voiceSessionActiveRef.current || isRecording) return

    setErrorMessage('')
    browserTranscriptRef.current = ''
    speechRecognitionErrorRef.current = ''

    if (SpeechRecognitionCtor) {
      try {
        const rec = new SpeechRecognitionCtor()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = STT_LANGUAGE
        // همهٔ segmentها (شامل interim) را بساز؛ فقط isFinal باعث می‌شد تا قبل از رها کردن دکمه متن خالی بماند.
        rec.onresult = (event) => {
          let line = ''
          for (let i = 0; i < event.results.length; i++) {
            line += event.results[i][0]?.transcript || ''
          }
          browserTranscriptRef.current = line
        }
        rec.onerror = (event) => {
          speechRecognitionErrorRef.current = event?.error || 'unknown'
        }
        rec.start()
        recognitionRef.current = rec
      } catch {
        recognitionRef.current = null
      }
    }

    try {
      setMode('recording')
      voiceSessionActiveRef.current = true
      await startRecording()
    } catch (error) {
      console.error('Failed to start recording', error)
      voiceSessionActiveRef.current = false
      setMode('idle')
      setErrorMessage('Microphone access failed. Check your browser settings.')
    }
  }, [isRecording, startRecording])

  const handleOrbPointerMove = useCallback((e) => {
    const el = orbSceneRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
    const ry = clamp((x - 0.5) * 20, -12, 12)
    const rx = clamp((0.5 - y) * 20, -12, 12)
    const dx = clamp((x - 0.5) * 16, -8, 8)
    const dy = clamp((y - 0.5) * 16, -8, 8)
    setOrbTilt({ rx, ry, dx, dy })
  }, [])

  const handleOrbPointerLeave = useCallback(() => {
    setOrbTilt({ rx: 0, ry: 0, dx: 0, dy: 0 })
  }, [])

  const handlePressEnd = useCallback(async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!voiceSessionActiveRef.current && !isRecording) {
      setMode('idle')
      return
    }
    if (voicePressEndHandledRef.current) return
    voicePressEndHandledRef.current = true

    try {
      setMode('processing')
      if (recognitionRef.current) {
        try {
          await Promise.race([
            new Promise((resolve) => {
              recognitionRef.current.onend = resolve
              recognitionRef.current.stop()
            }),
            new Promise((r) => setTimeout(r, 2000)),
          ])
        } catch {}
        recognitionRef.current = null
      }
      const blob = await stopRecording()
      const browserText = (browserTranscriptRef.current || '').trim()

      if (!blob && !browserText) {
        setErrorMessage('صدا ضبط نشد. روی گوشی از Chrome امتحان کن یا دکمه را نگه دار و دوباره حرف بزن.')
        setMode('idle')
        return
      }

      const speechErr = speechRecognitionErrorRef.current

      if (blob && blob.size > 0) {
        setAssistantNote('در حال تبدیل صدا به متن…')
      } else if (browserText) {
        setAssistantNote('در حال آماده‌سازی متن…')
      }

      let transcript = ''
      try {
        transcript =
          blob && blob.size > 0
            ? await transcribeWithFallback(blob, { browserFallbackText: browserText })
            : browserText
        setLastTranscript(transcript)
        setErrorMessage('')
      } catch (aiError) {
        setAssistantNote('')
        const raw = (aiError && aiError.message) ? aiError.message : ''
        const isServerHint = raw.includes('سرویس تبدیل صدا') || raw.includes('صدا خیلی کوتاه') || raw.includes('طول کشید') || raw.includes('صدا درست پردازش نشد') || raw.includes('صدا خیلی کوتاه یا نامعتبر')
        const isWhisperOff = raw.includes('Whisper محلی')
        const isNetworkError = /failed to fetch|network error|load failed|متن طول کشید|Missing audio|نرسید/i.test(raw)
        const hasBrowserSpeech = !!SpeechRecognitionCtor
        let friendly = isServerHint ? raw : (isNetworkError ? 'صدا به سرور نرسید. وای‌فای یا دیتا را چک کن و دوباره امتحان کن.' : 'سرویس تبدیل صدا در دسترس نیست. لطفاً کمی بعد تلاش کن یا از تایپ استفاده کن.')
        if (isWhisperOff) {
          friendly =
            'Whisper روی سرور روشن نیست. در `.env.local` مقدار WHISPER_LOCAL_URL را بگذار، سرویس Whisper را لوکال اجرا کن، بعد `npm run start` را ری‌استارت کن (نیازی به ChatGPT/OpenAI نیست).'
        } else if (!hasBrowserSpeech) {
          friendly = 'در این مرورگر تشخیص صدا فقط با ارسال به سرور انجام می‌شود و الان سرور جواب نداد. برای تشخیص صدا از مرورگر Chrome استفاده کن یا کمی بعد دوباره امتحان کن.'
        }
        setErrorMessage(friendly)
        setMode('idle')
        return
      }

      const trimmed = transcript.trim()
      if (!trimmed) {
        setAssistantNote('')
        const hasBrowserSpeech = !!SpeechRecognitionCtor
        const shortBlob = blob && blob.size > 0 && blob.size < 2500
        const netHint =
          speechErr === 'network' || speechErr === 'service-not-allowed'
            ? ' Web Speech به گوگل وصل نمی‌شود.'
            : ''
        const msg = hasBrowserSpeech
          ? shortBlob
            ? `ضبط هنوز کوتاه بود یا متنی نیامد.${netHint} دکمه را ۳–۴ ثانیه نگه دار و بلند حرف بزن؛ برای Whisper محلی npm run start و Docker (whisper) باید روشن باشند.`
            : `متنی از صدا نیامد.${netHint} دوباره امتحان کن؛ اگر Whisper خطا داد لاگ سرور را ببین.`
          : 'در این مرورگر تشخیص صدا پشتیبانی نمی‌شود. برای استفاده از صدا از مرورگر Chrome استفاده کن.'
        setErrorMessage(msg)
        setMode('idle')
        return
      }

      setConversationMessages((prev) => [...prev, { role: 'user', content: trimmed }])

      if (assistantPhase === PHASE_WAITING_NAME) {
        const isMetaQuestion = /چه\s*اطلاعات|چی\s*میخوای|چه\s*میخوای|what\s*do\s*you\s*need|what\s*info|چی\s*بدم|چه\s*بگم/i.test(trimmed)
        if (isMetaQuestion) {
          addAssistantReply('برای ساخت پروژه فقط نام پروژه را بگو. مثلاً: پروژه کابینکس، یا دیبا.')
          setMode('idle')
          return
        }
        if (trimmed.length < 2) {
          setAssistantNote('⚠️ Say the project name more clearly. At least 2 characters required.')
        } else {
          setPendingProject({ name: trimmed })
          setAssistantPhase(PHASE_WAITING_CONFIRM)
          addAssistantReply(`I'll use «${trimmed}» as the project name.\n\nConfirm to create it?`)
        }
        setMode('idle')
        return
      }

      if (assistantPhase === PHASE_WAITING_MEETING_PROJECT && pendingMeeting) {
        const trimmedLower = trimmed.toLowerCase()
        const found = state.projects.find(
          (p) => p.name && (trimmedLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(trimmedLower.split(' ')[0]))
        )
        if (found) {
          setPendingMeeting((prev) => ({ ...prev, projectId: found.id, projectName: found.name }))
          setAssistantPhase(PHASE_WAITING_MEETING_WHEN)
          addAssistantReply(`پروژه «${found.name}». چه زمانی جلسه باشد؟ مثلاً فردا ساعت ۱۰.`)
        } else {
          addAssistantReply('این پروژه را پیدا نکردم. نام دقیق پروژه را بگو یا از لیست پروژه‌ها یکی را انتخاب کن.')
        }
        setMode('idle')
        return
      }

      if (assistantPhase === PHASE_WAITING_MEETING_WHEN) {
        const isMetaQuestion = /چه\s*اطلاعات|چی\s*میخوای|what\s*do\s*you\s*need/i.test(trimmed)
        if (isMetaQuestion && pendingMeeting) {
          addAssistantReply('فقط زمان جلسه را بگو. مثلاً: فردا ساعت ۱۰، یا پس‌فردا ۱۴:۰۰.')
          setMode('idle')
          return
        }
      }

      if (assistantPhase === PHASE_WAITING_MEETING_TITLE) {
        const isMetaQuestion = /چه\s*اطلاعات|چی\s*میخوای|چه\s*میخوای|what\s*do\s*you\s*need|what\s*info|چی\s*بدم|چه\s*بگم/i.test(trimmed)
        if (isMetaQuestion && pendingMeeting) {
          addAssistantReply('برای ثبت جلسه فقط به یک چیز نیاز دارم: عنوان جلسه. مثلاً بگو: جلسه تیم، یا هماهنگی با مشتری.')
          setMode('idle')
          return
        }
        if (trimmed.length < 2) {
          setAssistantNote('⚠️ Say the meeting title more clearly. At least 2 characters required.')
        } else if (pendingMeeting) {
          const updated = {
            ...pendingMeeting,
            title: trimmed,
          }
          setPendingMeeting(updated)
          setAssistantPhase(PHASE_WAITING_MEETING_CONFIRM)
          const at = updated.scheduledAt && updated.scheduledAt.length >= 16 ? updated.scheduledAt.slice(0, 16) : 'now'
          addAssistantReply(`Schedule meeting «${trimmed}»${updated.projectName ? ` for project «${updated.projectName}»` : ''} at ${at} (${updated.durationMinutes || 30} min)?`)
        } else {
          setAssistantPhase(PHASE_IDLE)
        }
        setMode('idle')
        return
      }

      if (assistantPhase === PHASE_WAITING_TASK_ASSIGNEE) {
        if (!pendingTask) {
          setAssistantPhase(PHASE_IDLE)
          setMode('idle')
          return
        }
        
        const isNegative = trimmed.toLowerCase().includes('نه') || 
                           trimmed.toLowerCase().includes('خیر') || 
                           trimmed.toLowerCase().includes('نیاز نداره') || 
                           trimmed.toLowerCase().includes('نیازی نیست')
        
        let extractedAssignee = null
        let extractedNotes = null
        
        for (const collaborator of (state.collaborators || [])) {
          const collaboratorNameLower = collaborator.name.toLowerCase()
          const trimmedLower = trimmed.toLowerCase()
          if (trimmedLower.includes(collaboratorNameLower) || 
              collaboratorNameLower.includes(trimmedLower.split(' ')[0]) ||
              trimmedLower.includes(collaboratorNameLower.split(' ')[0])) {
            extractedAssignee = collaborator
            break
          }
        }
        
        const notesKeywords = ['توضیحات', 'توضیح', 'notes', 'گزارش', 'پیگیری', 'یادداشت', 'گفتم', 'بگو', 'بنویس', 'توضیحاتش']
        const hasNotesKeyword = notesKeywords.some(keyword => trimmed.toLowerCase().includes(keyword.toLowerCase()))
        
        if (hasNotesKeyword || trimmed.length > 30) {
          let notesText = trimmed
          
          if (extractedAssignee) {
            notesText = notesText.replace(new RegExp(extractedAssignee.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim()
          }
          
          for (const keyword of notesKeywords) {
            const keywordIndex = notesText.toLowerCase().indexOf(keyword.toLowerCase())
            if (keywordIndex !== -1) {
              notesText = notesText.substring(keywordIndex + keyword.length).trim()
              notesText = notesText.replace(/^(را|رو|و|هم|این|تسک|برای|به|این|را|رو|اساین|assign)\s+/gi, '').trim()
              break
            }
          }
          
          if (!notesText || notesText === trimmed) {
            const prefixWords = ['اساین', 'assign', 'به', 'برای', 'این', 'تسک', 'رو', 'این', 'را', 'و', 'هم']
            for (const prefix of prefixWords) {
              const regex = new RegExp(`^${prefix}\\s+`, 'gi')
              notesText = notesText.replace(regex, '').trim()
            }
          }
          
          if (notesText && notesText.length > 3 && notesText.length < 500 && notesText !== trimmed) {
            extractedNotes = notesText
          } else if (trimmed.length > 30 && !extractedAssignee) {
            extractedNotes = trimmed
          }
        }
        
        if (isNegative && !extractedAssignee) {
          const updatedTask = {
            ...pendingTask,
            assigneeName: null,
            assigneeId: null,
          }
          
          if (updatedTask.missingFields?.includes('dueDate')) {
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_DATE)
            setAssistantNote(
              `Task «${updatedTask.title}» for project «${updatedTask.projectName}» is ready without assignee.\n\n⚠️ Missing: you didn't set a due date.\n\nDo you want to set a due date?\n• If yes, say the date (e.g. "tomorrow", "2025-02-15")\n• If no, say "no" or "skip"`
            )
          } else if (updatedTask.missingFields?.includes('notes')) {
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_NOTES)
            const dueDateText = updatedTask.dueDate ? ` با تاریخ ${updatedTask.dueDate}` : ''
            setAssistantNote(
              `Task «${updatedTask.title}» for project «${updatedTask.projectName}»${dueDateText} is ready. Do you want to add notes? Say them, or say "no".`
            )
          } else {
            const dueDateText = updatedTask.dueDate ? ` تا تاریخ ${updatedTask.dueDate}` : ''
            try {
              let dueAt = null
              if (updatedTask.dueDate) {
                try {
                  const d = new Date(updatedTask.dueDate)
                  if (!isNaN(d.getTime())) dueAt = d.toISOString()
                } catch (_) {}
              }
              await addTask({
                projectId: updatedTask.projectId,
                title: updatedTask.title,
                assigneeId: updatedTask.assigneeId || null,
                dueAt,
                notes: updatedTask.notes || null,
                priority: 3,
                status: 'todo',
              })
              setPendingTask(null)
              setAssistantPhase(PHASE_IDLE)
              const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
              const msg = `تسک «${updatedTask.title}» به پروژه «${updatedTask.projectName}» اضافه شد${assigneeText}${dueDateText} ✅\n\n${VOICE_NEXT_HINTS.task}`
              setAssistantNote(msg)
              addAssistantReply(msg)
            } catch (err) {
              console.error('Failed to add task (voice)', err)
              setPendingTask(updatedTask)
              setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
              const errMsg = err?.message ? ` (${err.message})` : ''
              setAssistantNote(`تسک «${updatedTask.title}» ذخیره نشد.${errMsg} دوباره امتحان کن یا صفحه را رفرش کن و دکمه تأیید را بزن.`)
            }
          }
        } else {
          const foundCollaborator = extractedAssignee || (state.collaborators || []).find(
            (c) =>
              c.name.toLowerCase().includes(trimmed.toLowerCase()) ||
              trimmed.toLowerCase().includes(c.name.toLowerCase())
          )
          
          if (foundCollaborator || extractedNotes) {
            const updatedTask = {
              ...pendingTask,
              assigneeName: foundCollaborator ? foundCollaborator.name : pendingTask.assigneeName,
              assigneeId: foundCollaborator ? foundCollaborator.id : pendingTask.assigneeId,
              notes: extractedNotes || pendingTask.notes,
            }
            
            if (!updatedTask.dueDate && updatedTask.missingFields?.includes('dueDate')) {
              setPendingTask(updatedTask)
              setAssistantPhase(PHASE_WAITING_TASK_DATE)
              const assigneeText = foundCollaborator ? ` با همکار «${foundCollaborator.name}»` : ''
            setAssistantNote(
              `Task «${updatedTask.title}» for project «${updatedTask.projectName}»${assigneeText} is ready.\n\n⚠️ Missing: due date. Say a date (e.g. "tomorrow") or "no" to skip.`
            )
            } else if (!updatedTask.notes && updatedTask.missingFields?.includes('notes')) {
              setPendingTask(updatedTask)
              setAssistantPhase(PHASE_WAITING_TASK_NOTES)
              const assigneeText = foundCollaborator ? ` با همکار «${foundCollaborator.name}»` : ''
              const dueDateText = updatedTask.dueDate ? ` با تاریخ ${updatedTask.dueDate}` : ''
            setAssistantNote(
              `Task «${updatedTask.title}» for project «${updatedTask.projectName}»${assigneeText}${dueDateText} is ready.\n\n⚠️ Missing: notes. Say notes or "no" to skip.`
            )
            } else {
              setPendingTask(updatedTask)
              setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
              const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
              const dueDateText = updatedTask.dueDate ? ` تا تاریخ ${updatedTask.dueDate}` : ''
              const notesText = updatedTask.notes ? `\nتوضیحات: ${updatedTask.notes}` : ''
              setAssistantNote(
                `Add task «${updatedTask.title}» to project «${updatedTask.projectName}»${assigneeText}${dueDateText}${notesText}?`
              )
            }
          } else {
            setAssistantNote(
              `Collaborator «${trimmed}» not found. Say a name from the list or "no" to continue without assignee.`
            )
          }
        }
        setMode('idle')
        return
      }

      if (pendingTask && assistantPhase === PHASE_WAITING_TASK_CONFIRM) {
        const isConfirmVoice = /بله|آره|آری|تأیید|تایید|اوکی|ok|yes|بزن|بساز|اضافه\s*کن|موافقم/i.test(trimmed.trim())
        if (isConfirmVoice && confirmTaskRef.current) {
          confirmTaskRef.current()
          setMode('idle')
          return
        }
      }

      if (pendingTask && (
        assistantPhase === PHASE_WAITING_TASK_ASSIGNEE ||
        assistantPhase === PHASE_WAITING_TASK_DATE ||
        assistantPhase === PHASE_WAITING_TASK_NOTES ||
        assistantPhase === PHASE_WAITING_TASK_CONFIRM
      )) {
        const correctionKeywords = [
          'اسم تسک', 'عنوان تسک', 'اسم', 'عنوان', 'نام تسک',
          'تغییر بده', 'درست کن', 'اصلاح کن', 'تغییر', 'درست', 'اصلاح',
          'عوض کن', 'عوض بکن', 'عوض', 'بذار', 'بذارش', 'قرار بده',
          'نه', 'اشتباه', 'غلط', 'نذار', 'نکن', 'نباشه'
        ]
        const hasCorrectionKeyword = correctionKeywords.some(keyword => 
          trimmed.toLowerCase().includes(keyword.toLowerCase())
        )
        
        const titleKeywords = ['اسم تسک', 'عنوان تسک', 'اسم', 'عنوان', 'نام تسک', 'بذار', 'عوض', 'تغییر']
        const wantsTitleChange = titleKeywords.some(keyword => 
          trimmed.toLowerCase().includes(keyword.toLowerCase())
        ) && (
          trimmed.toLowerCase().includes('اسم') || 
          trimmed.toLowerCase().includes('عنوان') || 
          trimmed.toLowerCase().includes('تسک')
        )
        
        if (hasCorrectionKeyword && wantsTitleChange) {
          const titlePattern1 = /(?:اسم|عنوان|نام)\s+تسک\s+(?:رو|را)?\s*بذار\s+(.+?)(?:\s+(?:نذار|نکن|نباشه))?$/i
          const titlePattern2 = /(?:اسم|عنوان|نام)\s+تسک\s+(?:رو|را)?\s*(.+?)(?:\s+(?:نذار|نکن|نباشه))?$/i
          const titlePattern3 = /(?:اسم|عنوان|نام)\s+(?:تسک\s+)?(?:رو|را)?\s*بذار\s+(.+?)(?:\s+(?:نذار|نکن|نباشه))?$/i
          
          let newTitle = null
          
          const match1 = trimmed.match(titlePattern1)
          const match2 = trimmed.match(titlePattern2)
          const match3 = trimmed.match(titlePattern3)
          
          const extractedTitle = match1?.[1] || match2?.[1] || match3?.[1]
          
          if (extractedTitle) {
            let tempTitle = extractedTitle.trim()
            
            const removeWords = ['رو', 'را', 'و', 'هم', 'این', 'تسک', 'برای', 'به', 'با', 'باشه', 'نیست']
            for (const word of removeWords) {
              const regex = new RegExp(`^${word}\\s+`, 'gi')
              tempTitle = tempTitle.replace(regex, '').trim()
              const regexEnd = new RegExp(`\\s+${word}$`, 'gi')
              tempTitle = tempTitle.replace(regexEnd, '').trim()
            }
            
            tempTitle = tempTitle.replace(/[،,.]$/, '').trim()
            
            if (tempTitle && tempTitle.length > 2) {
              newTitle = tempTitle
            }
          } else {
            const sentences = trimmed.split(/[،,.]/).map(s => s.trim()).filter(s => s.length > 0)
            
            let tempTitle = sentences.length > 1 ? sentences[sentences.length - 1] : trimmed
            
            if (tempTitle.toLowerCase().includes('بذار')) {
              for (const keyword of ['اسم تسک', 'عنوان تسک', 'اسم', 'عنوان', 'نام تسک']) {
                const keywordIndex = tempTitle.toLowerCase().indexOf(keyword.toLowerCase())
                if (keywordIndex !== -1) {
                  tempTitle = tempTitle.substring(keywordIndex + keyword.length).trim()
                  break
                }
              }
              
              tempTitle = tempTitle.replace(/^(رو|را|و|هم|این|تسک|برای|به|با|بذار)\s+/gi, '').trim()
              tempTitle = tempTitle.replace(/\s+(نذار|نکن|نباشه|نیست|باشه)$/gi, '').trim()
              tempTitle = tempTitle.replace(/[،,.]$/, '').trim()
              
              if (tempTitle && tempTitle.length > 2 && tempTitle.length < 100) {
                newTitle = tempTitle
              }
            } else {
              for (const keyword of ['اسم تسک', 'عنوان تسک', 'اسم', 'عنوان', 'نام تسک']) {
                const keywordIndex = tempTitle.toLowerCase().indexOf(keyword.toLowerCase())
                if (keywordIndex !== -1) {
                  tempTitle = tempTitle.substring(keywordIndex + keyword.length).trim()
                  break
                }
              }
              
              tempTitle = tempTitle.replace(/^(رو|را|و|هم|این|تسک|برای|به|با|بذار)\s+/gi, '').trim()
              tempTitle = tempTitle.replace(/\s+(نذار|نکن|نباشه|نیست|باشه)$/gi, '').trim()
              tempTitle = tempTitle.replace(/[،,.]$/, '').trim()
              
              if (tempTitle && tempTitle.length > 2 && tempTitle.length < 100) {
                newTitle = tempTitle
              }
            }
          }
          
          if (newTitle) {
            const updatedTask = {
              ...pendingTask,
              title: newTitle,
            }
            
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
            const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
            const dueDateText = updatedTask.dueDate ? ` تا تاریخ ${updatedTask.dueDate}` : ''
            const notesText = updatedTask.notes ? `\nتوضیحات: ${updatedTask.notes}` : ''
            setAssistantNote(
              `Task with new title «${newTitle}» for project «${updatedTask.projectName}»${assigneeText}${dueDateText}${notesText} is ready. Confirm?`
            )
            setMode('idle')
            return
          }
        }
      }

      if (assistantPhase === PHASE_WAITING_TASK_DATE) {
        if (!pendingTask) {
          setAssistantPhase(PHASE_IDLE)
          setMode('idle')
          return
        }
        
        const isNegative = trimmed.toLowerCase().includes('نه') || 
                           trimmed.toLowerCase().includes('خیر') || 
                           trimmed.toLowerCase().includes('نیاز نداره') || 
                           trimmed.toLowerCase().includes('نیازی نیست')
        
        if (isNegative) {
          const updatedTask = {
            ...pendingTask,
            dueDate: null,
          }
          
          if (updatedTask.missingFields?.includes('notes')) {
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_NOTES)
            const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
            setAssistantNote(
              `Task «${updatedTask.title}» for project «${updatedTask.projectName}»${assigneeText} has no due date.\n\n⚠️ Missing: notes. Say notes or "no" to skip.`
            )
          } else {
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
            const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
            const notesText = updatedTask.notes ? `\nتوضیحات: ${updatedTask.notes}` : ''
            setAssistantNote(
              `Add task «${updatedTask.title}» to project «${updatedTask.projectName}»${assigneeText}${notesText}?`
            )
          }
        } else {
          let extractedDate = null
          
          const datePatterns = [
            /(\d{4})-(\d{1,2})-(\d{1,2})/,
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            /(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4})/,
          ]
          
          for (const pattern of datePatterns) {
            const match = trimmed.match(pattern)
            if (match) {
              try {
                let year, month, day
                if (pattern.source.includes('YYYY')) {
                  year = parseInt(match[1])
                  month = parseInt(match[2])
                  day = parseInt(match[3])
                } else {
                  day = parseInt(match[1])
                  month = parseInt(match[2])
                  year = parseInt(match[3])
                }
                
                if (year >= 1400 && year < 1500) {
                  year = year + 621
                }
                
                if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                  const date = new Date(year, month - 1, day)
                  if (!isNaN(date.getTime())) {
                    extractedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    break
                  }
                }
              } catch (e) {
                console.error('Error parsing date', e)
              }
            }
          }
          
          if (!extractedDate) {
            const today = new Date()
            let daysToAdd = 0
            
            const relativePatterns = [
              { pattern: /(?:دو|2)\s*روز\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 2 },
              { pattern: /(?:دوروز|دو\s*روز)\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 2 },
              { pattern: /(?:(\d+)\s*روز|(\d+)\s*روزه)\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, multiplier: 1 },
              { pattern: /(?:(\d+)\s*روز|(\d+)\s*روزه)\s*(?:روز|از امروز)/i, multiplier: 1 },
              { pattern: /(?:فردا|پس فردا|پسفردا)/i, days: 1 },
              { pattern: /(?:پس|بعد)\s*فردا/i, days: 2 },
              { pattern: /(?:سه|3)\s*روز\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 3 },
              { pattern: /(?:چهار|4)\s*روز\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 4 },
              { pattern: /(?:پنج|5)\s*روز\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 5 },
              { pattern: /(?:هفته\s*دیگه|هفته\s*دیگر|هفته\s*بعد|هفته\s*آینده)\s*(?:سه\s*شنبه|سه\u200cشنبه|چهارشنبه|پنج\s*شنبه|پنج\u200cشنبه|جمعه|شنبه|یکشنبه|دوشنبه)/i, getDayOfWeek: true },
              { pattern: /(?:سه\s*شنبه|سه\u200cشنبه|چهارشنبه|پنج\s*شنبه|پنج\u200cشنبه|جمعه|شنبه|یکشنبه|دوشنبه)\s*(?:هفته\s*دیگه|هفته\s*دیگر|هفته\s*بعد|هفته\s*آینده)/i, getDayOfWeek: true },
              { pattern: /(?:بذار|بزار)\s*(?:برای|به)\s*(?:هفته\s*دیگه|هفته\s*دیگر|هفته\s*بعد)\s*(?:سه\s*شنبه|سه\u200cشنبه|چهارشنبه|پنج\s*شنبه|پنج\u200cشنبه|جمعه|شنبه|یکشنبه|دوشنبه)/i, getDayOfWeek: true },
              { pattern: /(?:(\d+)\s*هفته|(\d+)\s*هفته‌ای)\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, multiplier: 7 },
              { pattern: /(?:(\d+)\s*هفته|(\d+)\s*هفته‌ای)\s*(?:هفته|از امروز)/i, multiplier: 7 },
              { pattern: /(?:یک|یه)\s*هفته\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 7 },
              { pattern: /(?:دو)\s*هفته\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 14 },
              { pattern: /(?:سه)\s*هفته\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 21 },
              { pattern: /(?:(\d+)\s*ماه|(\d+)\s*ماهه)\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, multiplier: 30 },
              { pattern: /(?:سه)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 3 },
              { pattern: /(?:چهار)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 4 },
              { pattern: /(?:پنج)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 5 },
              { pattern: /(?:شش)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 6 },
              { pattern: /(?:هفت)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 7 },
            ]
            
            const getDayOfWeekNumber = (dayName) => {
              const dayMap = {
                'شنبه': 6, 'یکشنبه': 0, 'دوشنبه': 1, 'سه\u200cشنبه': 2, 'سه شنبه': 2,
                'چهارشنبه': 3, 'پنج\u200cشنبه': 4, 'پنج شنبه': 4, 'جمعه': 5
              }
              for (const [key, value] of Object.entries(dayMap)) {
                if (dayName.toLowerCase().includes(key.toLowerCase())) {
                  return value
                }
              }
              return null
            }
            
            const getNextDayOfWeek = (targetDay) => {
              const todayDay = today.getDay()
              let daysToAdd = targetDay - todayDay
              if (daysToAdd <= 0) {
                daysToAdd += 7
              }
              return daysToAdd
            }
            
            for (const patternInfo of relativePatterns) {
              const match = trimmed.match(patternInfo.pattern)
              if (match) {
                if (patternInfo.getDayOfWeek) {
                  const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه\u200cشنبه', 'سه شنبه', 'چهارشنبه', 'پنج\u200cشنبه', 'پنج شنبه', 'جمعه']
                  for (const dayName of dayNames) {
                    if (trimmed.toLowerCase().includes(dayName.toLowerCase())) {
                      const targetDay = getDayOfWeekNumber(dayName)
                      if (targetDay !== null) {
                        daysToAdd = getNextDayOfWeek(targetDay)
                        break
                      }
                    }
                  }
                } else if (patternInfo.days !== undefined) {
                  daysToAdd = patternInfo.days
                } else if (patternInfo.multiplier) {
                  const num = parseInt(match[1] || match[2] || '1')
                  daysToAdd = num * patternInfo.multiplier
                }
                if (daysToAdd > 0) break
              }
            }
            
            if (daysToAdd > 0) {
              const targetDate = new Date(today)
              targetDate.setDate(today.getDate() + daysToAdd)
              const year = targetDate.getFullYear()
              const month = targetDate.getMonth() + 1
              const day = targetDate.getDate()
              extractedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            }
          }
          
          if (!extractedDate) {
            const numbers = trimmed.match(/\d+/g)
            if (numbers && numbers.length >= 1) {
              const day = parseInt(numbers[0])
              if (day >= 1 && day <= 31) {
                const today = new Date()
                const year = today.getFullYear()
                const month = today.getMonth() + 1
                const date = new Date(year, month - 1, day)
                if (!isNaN(date.getTime())) {
                  extractedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                }
              }
            }
          }
          
          const updatedTask = {
            ...pendingTask,
            dueDate: extractedDate,
          }
          
          if (!extractedDate) {
            setAssistantNote(
              `I didn't understand the date «${trimmed}». Say it more clearly, e.g. "tomorrow", "2025-02-15", or "no" to skip.`
            )
            setMode('idle')
            return
          }
          
          // اگر notes هم ناقص است، بپرس
          if (updatedTask.missingFields?.includes('notes')) {
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_NOTES)
            const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
            setAssistantNote(
              `Task «${updatedTask.title}» for project «${updatedTask.projectName}»${assigneeText} with date ${extractedDate} is ready.\n\n⚠️ Missing: notes. Say notes or "no" to skip.`
            )
          } else {
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
            const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
            const notesText = updatedTask.notes ? `\nتوضیحات: ${updatedTask.notes}` : ''
            setAssistantNote(
              `Add task «${updatedTask.title}» to project «${updatedTask.projectName}»${assigneeText} by ${extractedDate}${notesText}?`
            )
          }
        }
        setMode('idle')
        return
      }

      if (assistantPhase === PHASE_WAITING_TASK_NOTES) {
        if (!pendingTask) {
          setAssistantPhase(PHASE_IDLE)
          setMode('idle')
          return
        }
        
        if (trimmed.toLowerCase().includes('نه') || trimmed.toLowerCase().includes('خیر') || trimmed.toLowerCase().includes('نیاز نداره') || trimmed.toLowerCase().includes('نیازی نیست')) {
          setPendingTask({
            ...pendingTask,
            notes: null,
          })
        } else {
          setPendingTask({
            ...pendingTask,
            notes: trimmed,
          })
        }
        
        setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
        const assigneeText = pendingTask.assigneeName ? ` با همکار «${pendingTask.assigneeName}»` : ''
        const dueDateText = pendingTask.dueDate ? ` تا تاریخ ${pendingTask.dueDate}` : ''
        const notesText = trimmed.toLowerCase().includes('نه') || trimmed.toLowerCase().includes('خیر') || trimmed.toLowerCase().includes('نیاز نداره') || trimmed.toLowerCase().includes('نیازی نیست') ? '' : `\nتوضیحات: ${trimmed}`
        setAssistantNote(
          `Add task «${pendingTask.title}» to project «${pendingTask.projectName}»${assigneeText}${dueDateText}${notesText}?`
        )
        setMode('idle')
        return
      }

      setAssistantNote('در حال بررسی دستور و تطبیق با دیتابیس…')

      const previousContext =
        assistantPhase === PHASE_WAITING_CLARIFICATION && pendingReasoningContext
          ? { questions: pendingReasoningContext.questions, userReply: trimmed }
          : null

      const pendingIntent =
        pendingMeeting != null ? 'create_meeting' : pendingProject != null ? 'create_project' : pendingTask != null ? 'create_task' : pendingUpdate != null ? 'update_project_client_info' : pendingCollaborator != null ? 'add_collaborator_to_project' : pendingArchive != null ? 'archive_project' : null
      const reasoningResult = await analyzeWithReasoning(
        trimmed,
        state,
        previousContext,
        assistantPhase !== PHASE_IDLE ? assistantPhase : null,
        pendingIntent,
        conversationMessages
      )
      setPendingReasoningContext(null)

      if (!reasoningResult.executable) {
        const isAskingWhatInProject = /چی[ا]?\s*داریم|توش\s*چی[ا]?\s*هست|بهم\s*بگو|چه\s*اطلاعاتی|وضعیت\s*پروژه|چی\s*هست\s*توش/i.test(trimmed)
        let projectForFallback = null
        if (isAskingWhatInProject && state.projects && state.projects.length > 0) {
          for (const p of state.projects) {
            if (p.archived || !p.name) continue
            if (trimmed.toLowerCase().includes(p.name.toLowerCase())) {
              projectForFallback = p
              break
            }
          }
        }
        if (projectForFallback) {
          const tasksCount = (state.tasks || []).filter((t) => String(t.projectId) === String(projectForFallback.id) && t.costAmount == null && !t.archived).length
          const meetingsCount = (state.meetings || []).filter((m) => String(m.projectId) === String(projectForFallback.id)).length
          const collabCount = (projectForFallback.collaborators && projectForFallback.collaborators.length) || 0
          addAssistantReply(
            `پروژه «${projectForFallback.name}» الان ${tasksCount} تسک، ${collabCount} همکار و ${meetingsCount} جلسه داره.\n\nمی‌تونی با صدا: تسک اضافه کنی، همکار به پروژه اضافه کنی، جلسه بذاری، یا اطلاعات پروژه (کارفرما، معرف) رو آپدیت کنی.`
          )
        } else {
          addAssistantReply(
            reasoningResult.reason || 'دستور شما با قابلیت‌های فعلی برنامه همخوان نیست. (دیتابیس و ساختار اپ را چک کردم.)'
          )
        }
        setAssistantPhase(PHASE_IDLE)
        setMode('idle')
        return
      }

      if (reasoningResult.clarifyingQuestions && reasoningResult.clarifyingQuestions.length > 0) {
        if (reasoningResult.intent === 'create_meeting') {
          setPendingMeeting({
            title: reasoningResult.meetingInfo?.title || null,
            scheduledAt: reasoningResult.meetingInfo?.scheduledAt || null,
            projectId: reasoningResult.meetingInfo?.projectId || null,
            projectName: reasoningResult.meetingInfo?.projectName || null,
            durationMinutes: reasoningResult.meetingInfo?.durationMinutes ?? 30,
          })
          setAssistantPhase(PHASE_WAITING_MEETING_TITLE)
          addAssistantReply(
            reasoningResult.clarifyingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')
          )
          setMode('idle')
          return
        }
        setAssistantPhase(PHASE_WAITING_CLARIFICATION)
        setPendingReasoningContext({ questions: reasoningResult.clarifyingQuestions, userReply: trimmed })
        addAssistantReply(
          'برای اجرای دقیق، لطفاً این سؤال‌ها را جواب بده:\n\n' +
            reasoningResult.clarifyingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')
        )
        setMode('idle')
        return
      }

      const intentResult = reasoningResult
      const entities = {
        projectId: intentResult.projectId,
        projectName: intentResult.projectName,
        needsProjectName: intentResult.needsProjectName,
        updateFields: intentResult.updateFields,
        collaboratorInfo: intentResult.collaboratorInfo,
        taskInfo: intentResult.taskInfo,
        meetingInfo: intentResult.meetingInfo || {},
      }

      let result = null

      switch (intentResult.intent) {
        case 'create_project': {
          result = handleCreateProject({ planner, entities })
          if (result.needsConfirmation) {
            setPendingProject(result.pendingData)
            setAssistantPhase(PHASE_WAITING_CONFIRM)
            addAssistantReply(result.message)
          } else {
            setPendingProject(null)
            setAssistantPhase(PHASE_WAITING_NAME)
            addAssistantReply(result.message)
          }
          break
        }
        case 'update_project_client_info': {
          result = handleUpdateProjectClientInfo({ planner, entities })
          if (result.error) {
            addAssistantReply(result.message)
          } else {
            setPendingUpdate(result.pendingData)
            setAssistantPhase(PHASE_WAITING_UPDATE_CONFIRM)
            addAssistantReply(result.message)
          }
          break
        }
        case 'add_collaborator_to_project': {
          result = handleAddCollaboratorToProject({ planner, entities, transcript: trimmed })
          if (result.error) {
            addAssistantReply(result.message)
          } else {
            setPendingCollaborator(result.pendingData)
            setAssistantPhase(PHASE_WAITING_COLLABORATOR_CONFIRM)
            addAssistantReply(result.message)
          }
          break
        }
        case 'archive_project': {
          result = handleArchiveProject({ planner, entities })
          if (result.error) {
            addAssistantReply(result.message)
          } else {
            setPendingArchive(result.pendingData)
            setAssistantPhase(PHASE_WAITING_ARCHIVE_CONFIRM)
            addAssistantReply(result.message)
          }
          break
        }
        case 'restore_project': {
          result = handleRestoreProject({ planner, entities })
          if (result.error) {
            addAssistantReply(result.message)
          } else {
            addAssistantReply(result.message)
            setAssistantPhase(PHASE_IDLE)
          }
          break
        }
        case 'create_task': {
          result = handleCreateTask({ planner, entities, transcript: trimmed })
          if (result.error) {
            addAssistantReply(result.message)
          } else if (result.needsConfirmation) {
            setPendingTask(result.pendingData)
            setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
            addAssistantReply(result.message)
          } else {
            setPendingTask(result.pendingData)
            setAssistantPhase(result.nextPhase === 'awaitingTaskAssignee' ? PHASE_WAITING_TASK_ASSIGNEE : result.nextPhase === 'awaitingTaskDate' ? PHASE_WAITING_TASK_DATE : PHASE_WAITING_TASK_NOTES)
            addAssistantReply(result.message)
          }
          break
        }
        case 'update_task': {
          result = handleUpdateTask({ planner, entities })
          addAssistantReply(result.message)
          break
        }
        case 'toggle_task_done': {
          result = handleToggleTaskDone({ planner, entities })
          addAssistantReply(result.message)
          break
        }
        case 'navigate_today': {
          result = handleNavigateToday({ navigate })
          addAssistantReply(result.message)
          break
        }
        case 'navigate_projects': {
          result = handleNavigateProjects({ navigate })
          addAssistantReply(result.message)
          break
        }
        case 'navigate_finance': {
          result = handleNavigateFinance({ navigate })
          addAssistantReply(result.message)
          break
        }
        case 'small_talk': {
          const voiceHint = intentResult.entities?.reason === 'voice_check'
          if (voiceHint) {
            addAssistantReply(
              'بله — همین متن از صدای تو ساخته شده؛ یعنی میکروفون و تبدیل گفتار به نوشتار کار می‌کنند.\n\n' +
                'برای تحلیل دستورهای پیچیده (پروژه، تسک، جلسه) مدل داخل Ollama لازم است: یک بار `ollama pull llama3.2` (یا همان مدلی که در LLM_MODEL نوشتی) را بزن تا دانلود شود؛ بعد جمله را دوباره بگو.'
            )
          } else {
            addAssistantReply(
              'سلام. بگو چی می‌خوای — مثلاً «یک پروژه فلان بساز»، «برو مالی»، یا «تسک تماس را به پروژه X اضافه کن».'
            )
          }
          setAssistantPhase(PHASE_IDLE)
          break
        }
        case 'project_info': {
          const projName = (intentResult.projectName || entities.projectName || '').trim()
          const project = state.projects.find(
            (p) => !p.archived && p.name && (p.name.toLowerCase() === projName.toLowerCase() || p.name.toLowerCase().includes(projName.toLowerCase()) || projName.toLowerCase().includes(p.name.toLowerCase()))
          )
          if (project) {
            const tasksCount = (state.tasks || []).filter((t) => String(t.projectId) === String(project.id) && t.costAmount == null && !t.archived).length
            const meetingsCount = (state.meetings || []).filter((m) => String(m.projectId) === String(project.id)).length
            const collabCount = (project.collaborators && project.collaborators.length) || 0
            const line1 = `پروژه «${project.name}» الان ${tasksCount} تسک، ${collabCount} همکار و ${meetingsCount} جلسه داره.`
            const line2 = 'می‌تونی با صدا: تسک اضافه کنی، همکار به پروژه اضافه کنی، جلسه بذاری، یا اطلاعات پروژه (کارفرما، معرف) رو آپدیت کنی.'
            addAssistantReply(`${line1}\n\n${line2}`)
          } else {
            addAssistantReply(projName ? `پروژه‌ای با نام «${projName}» پیدا نکردم. پروژه‌های موجود: ${(state.projects || []).filter((p) => !p.archived).map((p) => p.name).join('، ') || '—'}.` : 'اسم پروژه رو بگو تا بگم چیکار می‌تونی بهش اضافه کنی.')
          }
          setAssistantPhase(PHASE_IDLE)
          break
        }
        case 'add_transaction': {
          const ti = reasoningResult.transactionInfo || {}
          if (ti.amount != null && ti.type) {
            addAssistantReply(
              `ثبت تراکنش: ${ti.type === 'income' ? 'درآمد' : 'خرج'} ${ti.amount}${ti.category ? `، دسته: ${ti.category}` : ''}. از صفحه Finance یا دکمه + (Quick Add) می‌توانی ثبت نهایی را انجام دهی.`
            )
          } else {
            addAssistantReply(
              'برای ثبت پرداخت یا واریز: مبلغ و نوع (درآمد یا خرج) را بگو؛ یا از صفحه Finance / Quick Add استفاده کن.'
            )
          }
          break
        }
        case 'create_meeting': {
          let meetingEntities = entities
          if (pendingMeeting && (assistantPhase === PHASE_WAITING_MEETING_WHEN || assistantPhase === PHASE_WAITING_MEETING_PROJECT)) {
            meetingEntities = {
              ...entities,
              meetingInfo: {
                title: pendingMeeting.title,
                scheduledAt: entities.meetingInfo?.scheduledAt ?? pendingMeeting.scheduledAt,
                projectId: pendingMeeting.projectId,
                projectName: pendingMeeting.projectName,
                durationMinutes: pendingMeeting.durationMinutes,
                participantNames: pendingMeeting.participants?.map((p) => p.name) || [],
                ...entities.meetingInfo,
              },
            }
          }
          result = handleCreateMeeting({ planner, entities: meetingEntities })
          if (result.error) {
            addAssistantReply(result.message)
            break
          }
          if (result.needsConfirmation) {
            setPendingMeeting(result.pendingData)
            setAssistantPhase(PHASE_WAITING_MEETING_CONFIRM)
            addAssistantReply(result.message)
          } else {
            setPendingMeeting(result.pendingData)
            const phase = result.nextPhase === 'awaitingMeetingProject' ? PHASE_WAITING_MEETING_PROJECT : result.nextPhase === 'awaitingMeetingWhen' ? PHASE_WAITING_MEETING_WHEN : result.nextPhase === 'awaitingMeetingTitle' ? PHASE_WAITING_MEETING_TITLE : PHASE_WAITING_MEETING_TITLE
            setAssistantPhase(phase)
            addAssistantReply(result.message)
          }
          break
        }
        default: {
          const isWhatCanIAdd = /چی\s*می[تط]ونم\s*(اضافه|بکنم|بگم|انجام\s*بدم)|چه\s*کارهایی?\s*می[تط]ونم|چیکار\s*می[تط]ونم|چی\s*بدم\s*بهش|توضیح\s*بده|چی\s*اضافه\s*کنم/i.test(trimmed)
          if (isWhatCanIAdd) {
            addAssistantReply(
              'چیزهایی که می‌تونی با صدا انجام بدی:\n\n' +
              '• پروژه: «یک پروژه [نام] بساز» — بعدش می‌تونی تسک، همکار، جلسه یا آپدیت بهش اضافه کنی.\n' +
              '• تسک: «تسک [عنوان] به پروژه [نام] اضافه کن» — می‌تونی اساین یا تاریخ بدی.\n' +
              '• جلسه: «یک جلسه ست کن» — بعدش پروژه، زمان و عنوان رو می‌پرسم.\n' +
              '• همکار: «همکار [نام] رو به پروژه [نام] اضافه کن».\n' +
              '• آرشیو: «پروژه [نام] رو آرشیو کن» — یا «برگردون» برای restore.\n' +
              '• ناوبری: «برو امروز»، «پروژه‌ها»، «مالی».'
            )
          } else {
            const reason = intentResult.entities?.reason ? `\n(${intentResult.entities.reason})` : ''
            addAssistantReply(
              `شنیدم: «${trimmed}»${reason}\n\n` +
              'نتونستم به یک دستور مشخص وصلش کنم. مثلاً بگو:\n' +
              '• «یک پروژه [نام] بساز» — برای ساخت پروژه\n' +
              '• «یک جلسه ست کن» — برای ثبت جلسه (بعدش می‌پرسم برای چه پروژه، کی، چه عنوانی)\n' +
              '• «تسک [عنوان] به پروژه [نام] اضافه کن» — برای اضافه کردن وظیفه\n' +
              '• «برو امروز» / «پروژه‌ها» / «مالی» — برای رفتن به آن صفحه\n' +
              '• «پروژه [نام] رو آرشیو کن» — برای آرشیو\n\n' +
              'هر چی می‌خوای بگو؛ اگر چیزی کم بود می‌پرسم.'
            )
          }
          break
        }
      }

      setMode('idle')
    } catch (error) {
      console.error('Failed to stop recording', error)
      setErrorMessage('An error occurred while recording.')
    } finally {
      voiceSessionActiveRef.current = false
      voicePressEndHandledRef.current = false
      setMode('idle')
    }
  }, [assistantPhase, isRecording, stopRecording, state, state.projects, state.collaborators, planner, navigate, pendingReasoningContext, addAssistantReply, pendingMeeting, pendingProject, pendingTask, pendingUpdate, pendingCollaborator, pendingArchive, addTask])

  const handleConfirmCreateProject = useCallback(() => {
    if (!pendingProject?.name || isSubmitting) return

    try {
      setIsSubmitting(true)
      const name = pendingProject.name.trim()
      if (!name) return

      addProject({
        name,
        priority: 3,
        notes: '',
        startDate: new Date().toISOString().split('T')[0],
      })

      setAssistantNote(`پروژه «${name}» ساخته شد ✅\n\n${VOICE_NEXT_HINTS.project}`)
      setPendingProject(null)
      setAssistantPhase(PHASE_IDLE)
    } finally {
      setIsSubmitting(false)
    }
  }, [addProject, pendingProject, isSubmitting])

  const handleCancelPending = useCallback(() => {
    setPendingProject(null)
    setPendingUpdate(null)
    setPendingCollaborator(null)
    setPendingArchive(null)
    setPendingTask(null)
    setPendingMeeting(null)
    setPendingReasoningContext(null)
    setAssistantPhase(PHASE_IDLE)
    addAssistantReply('OK, لغو شد. هر دستور جدیدی بگو تا از اول شروع کنیم.')
  }, [addAssistantReply])

  const handleConfirmCreateMeeting = useCallback(async () => {
    if (!pendingMeeting?.title || isSubmitting) return

    try {
      setIsSubmitting(true)
      const scheduledAt = pendingMeeting.scheduledAt
        ? (pendingMeeting.scheduledAt.length <= 10
            ? `${pendingMeeting.scheduledAt}T09:00:00`
            : pendingMeeting.scheduledAt
          ).replace(' ', 'T')
        : new Date().toISOString()
      const participantsForApi = (pendingMeeting.participants || [])
        .filter((p) => p && p.email)
        .map((p) => ({ email: p.email, name: p.name || p.email }))
      await addMeeting({
        projectId: pendingMeeting.projectId || null,
        projectName: pendingMeeting.projectName || null,
        title: pendingMeeting.title.trim(),
        scheduledAt,
        durationMinutes: pendingMeeting.durationMinutes || 30,
        participants: participantsForApi,
        notes: pendingMeeting.notes || '',
      })
      setAssistantNote(`جلسه «${pendingMeeting.title}» ثبت شد ✅\n\n${VOICE_NEXT_HINTS.meeting}`)
      setPendingMeeting(null)
      setAssistantPhase(PHASE_IDLE)
    } catch (err) {
      console.error('Failed to create meeting', err)
      setAssistantNote('Could not create meeting. Try again or add from Quick Add.')
    } finally {
      setIsSubmitting(false)
    }
  }, [addMeeting, pendingMeeting, isSubmitting])

  const handleConfirmUpdate = useCallback(() => {
    if (!pendingUpdate || isSubmitting) return

    try {
      setIsSubmitting(true)
      updateProject(pendingUpdate.projectId, pendingUpdate.updates)
      setAssistantNote(`پروژه «${pendingUpdate.projectName}» آپدیت شد ✅\n\n${VOICE_NEXT_HINTS.projectUpdated}`)
      setPendingUpdate(null)
      setAssistantPhase(PHASE_IDLE)
    } finally {
      setIsSubmitting(false)
    }
  }, [updateProject, pendingUpdate, isSubmitting])

  const handleConfirmAddCollaborator = useCallback(() => {
    if (!pendingCollaborator || isSubmitting) return

    try {
      setIsSubmitting(true)
      const targetProject = state.projects.find((p) => p.id === pendingCollaborator.projectId)
      if (!targetProject) {
        setAssistantNote('Project not found.')
        return
      }

      const existingCollaborators = targetProject.collaborators || []
      const newCollaborator = {
        id: `proj-collab-${Date.now()}`,
        collaboratorId: pendingCollaborator.collaboratorId,
        name: pendingCollaborator.collaboratorName,
        role: pendingCollaborator.collaboratorRole,
        phone: pendingCollaborator.collaboratorPhone,
        email: pendingCollaborator.collaboratorEmail,
        responsibilities: pendingCollaborator.responsibilities || [],
      }

      updateProject(pendingCollaborator.projectId, {
        collaborators: [...existingCollaborators, newCollaborator],
      })

      const respText =
        pendingCollaborator.responsibilities && pendingCollaborator.responsibilities.length > 0
          ? ` with responsibilities: ${pendingCollaborator.responsibilities.join(', ')}`
          : ''
      setAssistantNote(`همکار «${pendingCollaborator.collaboratorName}» به پروژه «${pendingCollaborator.projectName}» اضافه شد${respText} ✅\n\n${VOICE_NEXT_HINTS.collaborator}`)
      setPendingCollaborator(null)
      setAssistantPhase(PHASE_IDLE)
    } finally {
      setIsSubmitting(false)
    }
  }, [updateProject, pendingCollaborator, isSubmitting, state.projects])

  const handleConfirmArchive = useCallback(() => {
    if (!pendingArchive || isSubmitting) return

    try {
      setIsSubmitting(true)
      archiveProject(pendingArchive.projectId)
      setAssistantNote(`پروژه «${pendingArchive.projectName}» آرشیو شد ✅\n\n${VOICE_NEXT_HINTS.archived}`)
      setPendingArchive(null)
      setAssistantPhase(PHASE_IDLE)
    } finally {
      setIsSubmitting(false)
    }
  }, [archiveProject, pendingArchive, isSubmitting])

  const handleConfirmAddTask = useCallback(async () => {
    if (!pendingTask || isSubmitting) return

    setIsSubmitting(true)
    try {
      let dueAt = null
      if (pendingTask.dueDate) {
        try {
          const date = new Date(pendingTask.dueDate)
          if (!isNaN(date.getTime())) {
            dueAt = date.toISOString()
          }
        } catch (e) {
          console.error('Invalid date format', e)
        }
      }

      await addTask({
        projectId: pendingTask.projectId || null,
        projectName: pendingTask.projectName || null,
        title: pendingTask.title,
        description: pendingTask.description || '',
        assigneeId: pendingTask.assigneeId || null,
        dueAt: dueAt,
        notes: pendingTask.notes || null,
        priority: 3,
        status: 'todo',
      })

      const assigneeText = pendingTask.assigneeName ? ` with «${pendingTask.assigneeName}»` : ''
      const dueDateText = pendingTask.dueDate && pendingTask.dueDate !== 'undefined'
        ? ` by ${pendingTask.dueDate}`
        : ''
      setAssistantNote(`تسک «${pendingTask.title}» به پروژه «${pendingTask.projectName}» اضافه شد${assigneeText}${dueDateText} ✅\n\n${VOICE_NEXT_HINTS.task}`)
      setPendingTask(null)
      setAssistantPhase(PHASE_IDLE)
    } catch (err) {
      console.error('Failed to create task:', err)
      const errMsg = err?.message ? ` (${err.message})` : ''
      setAssistantNote(`تسک «${pendingTask.title}» ذخیره نشد.${errMsg} صفحه را رفرش کن و دوباره امتحان کن.`)
    } finally {
      setIsSubmitting(false)
    }
  }, [addTask, pendingTask, isSubmitting])
  confirmTaskRef.current = handleConfirmAddTask

  const visualMode = mode === 'recording' ? 'listening' : mode

  useEffect(() => {
    if (!isRecording) {
      setVoiceLevel(0)
      setVoiceJitter(0)
      if (voiceAnalyserRef.current) {
        voiceAnalyserRef.current.ctx?.close?.()
        voiceAnalyserRef.current = null
      }
      return
    }
    const t = setTimeout(() => {
      const stream = recorderStreamRef?.current
      if (!stream || stream.getTracks().every((tr) => tr.readyState === 'ended')) return
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.6
        src.connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        let rafId
        function loop() {
          analyser.getByteFrequencyData(data)
          const sum = data.reduce((a, b) => a + b, 0)
          const avg = sum / data.length
          let variance = 0
          for (let i = 0; i < data.length; i++) variance += (data[i] - avg) ** 2
          variance = Math.sqrt(variance / data.length) / 255
          setVoiceLevel(Math.min(1, avg / 180))
          setVoiceJitter(Math.min(1, variance * 3))
          rafId = requestAnimationFrame(loop)
        }
        rafId = requestAnimationFrame(loop)
        voiceAnalyserRef.current = { ctx, cancel: () => cancelAnimationFrame(rafId) }
      } catch {}
    }, 80)
    return () => {
      clearTimeout(t)
      if (voiceAnalyserRef.current) {
        voiceAnalyserRef.current.cancel?.()
        voiceAnalyserRef.current.ctx?.close?.()
        voiceAnalyserRef.current = null
      }
    }
  }, [isRecording, recorderStreamRef])

  let label = 'Hold to record'
  if (mode === 'recording') {
    label = 'Release to send'
  } else if (mode === 'processing') {
    label = 'Processing...'
  }

  const showAssistantCard = !!(
    assistantNote ||
    (assistantPhase === PHASE_WAITING_CONFIRM && pendingProject) ||
    (assistantPhase === PHASE_WAITING_UPDATE_CONFIRM && pendingUpdate) ||
    (assistantPhase === PHASE_WAITING_COLLABORATOR_CONFIRM && pendingCollaborator) ||
    (assistantPhase === PHASE_WAITING_ARCHIVE_CONFIRM && pendingArchive) ||
    (assistantPhase === PHASE_WAITING_TASK_ASSIGNEE && pendingTask) ||
    (assistantPhase === PHASE_WAITING_TASK_DATE && pendingTask) ||
    (assistantPhase === PHASE_WAITING_TASK_NOTES && pendingTask) ||
    (assistantPhase === PHASE_WAITING_TASK_CONFIRM && pendingTask) ||
    (assistantPhase === PHASE_WAITING_MEETING_PROJECT && pendingMeeting) ||
    (assistantPhase === PHASE_WAITING_MEETING_WHEN && pendingMeeting) ||
    (assistantPhase === PHASE_WAITING_MEETING_TITLE && pendingMeeting) ||
    (assistantPhase === PHASE_WAITING_MEETING_CONFIRM && pendingMeeting) ||
    (assistantPhase === PHASE_WAITING_CLARIFICATION && pendingReasoningContext)
  )

  return (
    <DSPage title="Jarvis Assistant">
      <div className="assistant-page">
      {llmSetupHint && (
        <div className="assistant-llm-banner" role="status">
          <button
            type="button"
            className="assistant-llm-banner-dismiss"
            aria-label="بستن"
            onClick={() => setLlmSetupHint('')}
          >
            ×
          </button>
          <strong>تحلیل پیشرفتهٔ دستور (LLM): </strong>
          {llmSetupHint}
        </div>
      )}
      <div
        className="assistant-orb-wrapper"
        ref={orbSceneRef}
        style={{
          '--orb-rx': `${orbTilt.rx}deg`,
          '--orb-ry': `${orbTilt.ry}deg`,
          '--orb-dx': `${orbTilt.dx}px`,
          '--orb-dy': `${orbTilt.dy}px`,
          ...(visualMode === 'listening' && {
            '--voice-level': String(voiceLevel),
            '--voice-jitter': String(voiceJitter),
          }),
        }}
        onPointerMove={handleOrbPointerMove}
        onPointerLeave={handleOrbPointerLeave}
      >
        <span className="assistant-orb-aurora assistant-orb-aurora--a" aria-hidden="true" />
        <span className="assistant-orb-aurora assistant-orb-aurora--b" aria-hidden="true" />
        <span
          className={`assistant-orb-ring assistant-orb-ring--${visualMode}`}
          aria-hidden="true"
        />
        <span className={`assistant-orb-halo assistant-orb-halo--${visualMode}`} aria-hidden="true" />
        <button
          type="button"
          className={`assistant-orb assistant-orb--${visualMode}`}
          style={{
            touchAction: 'none',
          }}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            try {
              e.currentTarget.setPointerCapture?.(e.pointerId)
            } catch {}
            handlePressStart(e)
          }}
          onPointerUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handlePressEnd(e)
            try {
              e.currentTarget.releasePointerCapture?.(e.pointerId)
            } catch {}
          }}
          onPointerCancel={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (voiceSessionActiveRef.current || isRecording) handlePressEnd(e)
            try {
              e.currentTarget.releasePointerCapture?.(e.pointerId)
            } catch {}
          }}
          onLostPointerCapture={() => {
            if (voiceSessionActiveRef.current || isRecording) handlePressEnd()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <span className="assistant-orb-sheen" aria-hidden="true" />
          <span className="assistant-orb-label">{label}</span>
        </button>
      </div>

      {(conversationMessages.length > 0 || showAssistantCard || errorMessage) && (
        <div className="assistant-transcript-wrapper">
          <DSSection title="مکالمه" className="ds-assistant-transcript">
            <div className="assistant-conversation-list">
              {conversationMessages.map((msg, i) => (
                <div
                  key={i}
                  className={msg.role === 'user' ? 'assistant-msg assistant-msg--user' : 'assistant-msg assistant-msg--assistant'}
                >
                  <span className="assistant-msg-label">{msg.role === 'user' ? 'شما' : 'Jarvis'}</span>
                  <div className="assistant-transcript-text">{msg.content}</div>
                </div>
              ))}
              {showAssistantCard && assistantNote && (() => {
                const last = conversationMessages[conversationMessages.length - 1]
                const alreadyInList = last?.role === 'assistant' && last?.content === assistantNote
                if (alreadyInList) return null
                return (
                  <div className="assistant-msg assistant-msg--assistant">
                    <span className="assistant-msg-label">Jarvis</span>
                    <div className="assistant-transcript-text">{assistantNote}</div>
                  </div>
                )
              })()}
            </div>
            {showAssistantCard && (
              <>
                {assistantPhase === PHASE_WAITING_CONFIRM && pendingProject?.name && (
                  <div className="assistant-actions">
                    <DSButton onClick={handleConfirmCreateProject} disabled={isSubmitting}>
                      Confirm and create project
                    </DSButton>
                    <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                      Cancel
                    </DSButton>
                  </div>
                )}

                {assistantPhase === PHASE_WAITING_UPDATE_CONFIRM && pendingUpdate && (
                  <div className="assistant-actions">
                    <DSButton onClick={handleConfirmUpdate} disabled={isSubmitting}>
                      Confirm and apply changes
                    </DSButton>
                    <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                      Cancel
                    </DSButton>
                  </div>
                )}

                {assistantPhase === PHASE_WAITING_COLLABORATOR_CONFIRM && pendingCollaborator && (
                  <div className="assistant-actions">
                    <DSButton onClick={handleConfirmAddCollaborator} disabled={isSubmitting}>
                      Confirm and add collaborator
                    </DSButton>
                    <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                      Cancel
                    </DSButton>
                  </div>
                )}

                {assistantPhase === PHASE_WAITING_ARCHIVE_CONFIRM && pendingArchive && (
                  <div className="assistant-actions">
                    <DSButton onClick={handleConfirmArchive} disabled={isSubmitting}>
                      Confirm and archive
                    </DSButton>
                    <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                      Cancel
                    </DSButton>
                  </div>
                )}

                {assistantPhase === PHASE_WAITING_TASK_CONFIRM && pendingTask && (
                  <div className="assistant-actions">
                    <DSButton onClick={handleConfirmAddTask} disabled={isSubmitting}>
                      Confirm and add task
                    </DSButton>
                    <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                      Cancel
                    </DSButton>
                  </div>
                )}

                {(assistantPhase === PHASE_WAITING_MEETING_PROJECT || assistantPhase === PHASE_WAITING_MEETING_WHEN) && pendingMeeting && (
                  <div className="assistant-actions">
                    <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                      Cancel
                    </DSButton>
                  </div>
                )}
                {assistantPhase === PHASE_WAITING_MEETING_CONFIRM && pendingMeeting?.title && (
                  <div className="assistant-actions">
                    <DSButton onClick={handleConfirmCreateMeeting} disabled={isSubmitting}>
                      Confirm and schedule meeting
                    </DSButton>
                    <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                      Cancel
                    </DSButton>
                  </div>
                )}
              </>
            )}
          </DSSection>

          {errorMessage && <div className="assistant-error-text">{errorMessage}</div>}
        </div>
      )}
      </div>
    </DSPage>
  )
}
