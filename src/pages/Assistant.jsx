import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useVoiceRecorder from '../hooks/useVoiceRecorder.js'
import { transcribeAudioWithGemini, analyzePlannerIntent } from '../api/geminiClient.js'
import { usePlanner } from '../state/PlannerContext.jsx'
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

export default function Assistant() {
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder()
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
  } = usePlanner()
  const navigate = useNavigate()

  // Build planner object for action handlers
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
  }

  const [mode, setMode] = useState('idle') // idle | recording | processing
  const [assistantPhase, setAssistantPhase] = useState(PHASE_IDLE)
  const [lastTranscript, setLastTranscript] = useState('')
  const [assistantNote, setAssistantNote] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [pendingProject, setPendingProject] = useState(null)
  const [pendingUpdate, setPendingUpdate] = useState(null) // { projectId, projectName, updates, currentData }
  const [pendingCollaborator, setPendingCollaborator] = useState(null) // { projectId, projectName, collaboratorId, collaboratorName, responsibilities }
  const [pendingArchive, setPendingArchive] = useState(null) // { projectId, projectName }
  const [pendingTask, setPendingTask] = useState(null) // { title, projectId, projectName, assigneeName, assigneeId, dueDate, notes, missingFields: [] }
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePressStart = useCallback(async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (isRecording) return

    setErrorMessage('')

    try {
      setMode('recording')
      await startRecording()
    } catch (error) {
      console.error('Failed to start recording', error)
      setMode('idle')
      setErrorMessage('دسترسی به میکروفن انجام نشد. تنظیمات مرورگر را چک کن.')
    }
  }, [isRecording, startRecording])

  const handlePressEnd = useCallback(async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!isRecording) {
      setMode('idle')
      return
    }

    try {
      setMode('processing')
      const blob = await stopRecording()

      if (!blob) {
        setMode('idle')
        return
      }

      // مرحله ۱: تبدیل صوت به متن
      let transcript = ''
      try {
        transcript = await transcribeAudioWithGemini(blob)
        setLastTranscript(transcript)
        setErrorMessage('')
      } catch (aiError) {
        console.error('Transcription failed', aiError)
        setErrorMessage('تبدیل صوت به متن با خطا مواجه شد.')
        setMode('idle')
        return
      }

      const trimmed = transcript.trim()
      if (!trimmed) {
        setAssistantNote('صدایی تشخیص ندادم، یک بار دیگر امتحان کن.')
        setMode('idle')
        return
      }

      // اگر در فاز پرسیدن اسم پروژه هستیم، ویس فعلی را به‌عنوان نام پروژه بگیر
      if (assistantPhase === PHASE_WAITING_NAME) {
        if (trimmed.length < 2) {
          setAssistantNote('⚠️ اسم پروژه رو واضح‌تر بگو. حداقل ۲ کاراکتر لازمه.')
        } else {
          setPendingProject({ name: trimmed })
          setAssistantPhase(PHASE_WAITING_CONFIRM)
          setAssistantNote(`اسم پروژه را «${trimmed}» در نظر گرفتم.\n\nتایید می‌کنی ساخته شود؟`)
        }
        setMode('idle')
        return
      }

      // اگر در فاز پرسیدن assignee هستیم، ویس فعلی را به‌عنوان assignee بگیر
      if (assistantPhase === PHASE_WAITING_TASK_ASSIGNEE) {
        if (!pendingTask) {
          setAssistantPhase(PHASE_IDLE)
          setMode('idle')
          return
        }
        
        // بررسی کن که آیا کاربر گفته "نه" یا "خیر" یا "نیاز نداره"
        const isNegative = trimmed.toLowerCase().includes('نه') || 
                           trimmed.toLowerCase().includes('خیر') || 
                           trimmed.toLowerCase().includes('نیاز نداره') || 
                           trimmed.toLowerCase().includes('نیازی نیست')
        
        // تلاش برای استخراج assignee و notes از ویس (در صورت وجود)
        let extractedAssignee = null
        let extractedNotes = null
        
        // پیدا کردن نام همکار در متن (قبل از پردازش notes)
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
        
        // استخراج notes - بررسی اینکه آیا کاربر notes داده یا نه
        const notesKeywords = ['توضیحات', 'توضیح', 'notes', 'گزارش', 'پیگیری', 'یادداشت', 'گفتم', 'بگو', 'بنویس', 'توضیحاتش']
        const hasNotesKeyword = notesKeywords.some(keyword => trimmed.toLowerCase().includes(keyword.toLowerCase()))
        
        // اگر متن طولانی است یا کلمات کلیدی notes دارد، notes را استخراج کن
        if (hasNotesKeyword || trimmed.length > 30) {
          let notesText = trimmed
          
          // حذف نام assignee از متن
          if (extractedAssignee) {
            notesText = notesText.replace(new RegExp(extractedAssignee.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim()
          }
          
          // پیدا کردن کلمات کلیدی notes و استخراج متن بعد از آن
          for (const keyword of notesKeywords) {
            const keywordIndex = notesText.toLowerCase().indexOf(keyword.toLowerCase())
            if (keywordIndex !== -1) {
              notesText = notesText.substring(keywordIndex + keyword.length).trim()
              // حذف کلمات اضافی رایج
              notesText = notesText.replace(/^(را|رو|و|هم|این|تسک|برای|به|این|را|رو|اساین|assign)\s+/gi, '').trim()
              break
            }
          }
          
          // حذف کلمات اضافی از ابتدای متن (اگر هنوز notes استخراج نشده)
          if (!notesText || notesText === trimmed) {
            const prefixWords = ['اساین', 'assign', 'به', 'برای', 'این', 'تسک', 'رو', 'این', 'را', 'و', 'هم']
            for (const prefix of prefixWords) {
              const regex = new RegExp(`^${prefix}\\s+`, 'gi')
              notesText = notesText.replace(regex, '').trim()
            }
          }
          
          // اگر notesText معنا دارد و خالی نیست، آن را در نظر بگیر
          if (notesText && notesText.length > 3 && notesText.length < 500 && notesText !== trimmed) {
            extractedNotes = notesText
          } else if (trimmed.length > 30 && !extractedAssignee) {
            // اگر متن طولانی است و assignee پیدا نشد، احتمالاً کل متن notes است
            extractedNotes = trimmed
          }
        }
        
        if (isNegative && !extractedAssignee) {
          // کاربر نمی‌خواد assignee
          const updatedTask = {
            ...pendingTask,
            assigneeName: null,
            assigneeId: null,
          }
          
          // اگر تاریخ ناقص است، بپرس
          if (updatedTask.missingFields?.includes('dueDate')) {
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_DATE)
            setAssistantNote(
              `تسک «${updatedTask.title}» برای پروژه «${updatedTask.projectName}» بدون assignee آماده است.\n\n⚠️ اطلاعات ناقص: تاریخ پیگیری (due date) تسک رو مشخص نکردی.\n\nآیا برای این تسک تاریخ مشخص کنی؟\n• اگر بله، تاریخ رو بگو:\n  - تاریخ دقیق: «۱۵ بهمن»، «۲۰/۱۱/۱۴۰۳»، «2025-02-15»\n  - تاریخ نسبی: «دو روز دیگه»، «هفته دیگه سه شنبه»، «فردا»، «پس فردا»\n• اگر نه، بگو «نیاز نداره» یا «نه»`
            )
          } else if (updatedTask.missingFields?.includes('notes')) {
            // اگر notes هم ناقص است، بپرس
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_NOTES)
            const dueDateText = updatedTask.dueDate ? ` با تاریخ ${updatedTask.dueDate}` : ''
            setAssistantNote(
              `تسک «${updatedTask.title}» برای پروژه «${updatedTask.projectName}»${dueDateText} آماده است. آیا نیاز به توضیحات (notes) داره؟ اگر بله، بگو؛ وگرنه بگو «نه» یا «خیر».`
            )
          } else {
            // همه اطلاعات کامل است، به تایید برو
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
            const dueDateText = updatedTask.dueDate ? ` تا تاریخ ${updatedTask.dueDate}` : ''
            const notesText = updatedTask.notes ? `\nتوضیحات: ${updatedTask.notes}` : ''
            setAssistantNote(
              `می‌خوای تسک «${updatedTask.title}» رو برای پروژه «${updatedTask.projectName}»${dueDateText}${notesText} اضافه کنم؟`
            )
          }
        } else {
          // استفاده از extractedAssignee اگر پیدا شد
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
            
            // اگر تاریخ ناقص است، بپرس
            if (!updatedTask.dueDate && updatedTask.missingFields?.includes('dueDate')) {
              setPendingTask(updatedTask)
              setAssistantPhase(PHASE_WAITING_TASK_DATE)
              const assigneeText = foundCollaborator ? ` با همکار «${foundCollaborator.name}»` : ''
            setAssistantNote(
              `تسک «${updatedTask.title}» برای پروژه «${updatedTask.projectName}»${assigneeText} آماده است.\n\n⚠️ اطلاعات ناقص: تاریخ پیگیری (due date) تسک رو مشخص نکردی.\n\nآیا برای این تسک تاریخ مشخص کنی؟\n• اگر بله، تاریخ رو بگو:\n  - تاریخ دقیق: «۱۵ بهمن»، «۲۰/۱۱/۱۴۰۳»، «2025-02-15»\n  - تاریخ نسبی: «دو روز دیگه»، «هفته دیگه سه شنبه»، «فردا»، «پس فردا»\n• اگر نه، بگو «نیاز نداره» یا «نه»`
            )
            } else if (!updatedTask.notes && updatedTask.missingFields?.includes('notes')) {
              // اگر هنوز notes ناقص است و استخراج نشده، بپرس
              setPendingTask(updatedTask)
              setAssistantPhase(PHASE_WAITING_TASK_NOTES)
              const assigneeText = foundCollaborator ? ` با همکار «${foundCollaborator.name}»` : ''
              const dueDateText = updatedTask.dueDate ? ` با تاریخ ${updatedTask.dueDate}` : ''
            setAssistantNote(
              `تسک «${updatedTask.title}» برای پروژه «${updatedTask.projectName}»${assigneeText}${dueDateText} آماده است.\n\n⚠️ اطلاعات ناقص: توضیحات (notes) تسک رو ندادی.\n\nآیا نیاز به توضیحات داره؟\n• اگر بله، توضیحات رو بگو\n• اگر نه، بگو «نه» یا «خیر» یا «نیاز نداره»`
            )
            } else {
              // همه اطلاعات کامل است، به تایید برو
              setPendingTask(updatedTask)
              setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
              const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
              const dueDateText = updatedTask.dueDate ? ` تا تاریخ ${updatedTask.dueDate}` : ''
              const notesText = updatedTask.notes ? `\nتوضیحات: ${updatedTask.notes}` : ''
              setAssistantNote(
                `می‌خوای تسک «${updatedTask.title}» رو برای پروژه «${updatedTask.projectName}»${assigneeText}${dueDateText}${notesText} اضافه کنم؟`
              )
            }
          } else {
            setAssistantNote(
              `همکار «${trimmed}» پیدا نشد. لطفاً نام همکاری که در لیست موجوده رو بگو، یا بگو «نیاز نداره» تا بدون assignee ادامه بدم.`
            )
          }
        }
        setMode('idle')
        return
      }

      // بررسی اینکه آیا کاربر می‌خواهد pending task را اصلاح کند (قبل از فاز تاریخ)
      if (pendingTask && (
        assistantPhase === PHASE_WAITING_TASK_ASSIGNEE ||
        assistantPhase === PHASE_WAITING_TASK_DATE ||
        assistantPhase === PHASE_WAITING_TASK_NOTES ||
        assistantPhase === PHASE_WAITING_TASK_CONFIRM
      )) {
        // بررسی کلمات کلیدی اصلاح
        const correctionKeywords = [
          'اسم تسک', 'عنوان تسک', 'اسم', 'عنوان', 'نام تسک',
          'تغییر بده', 'درست کن', 'اصلاح کن', 'تغییر', 'درست', 'اصلاح',
          'عوض کن', 'عوض بکن', 'عوض', 'بذار', 'بذارش', 'قرار بده',
          'نه', 'اشتباه', 'غلط', 'نذار', 'نکن', 'نباشه'
        ]
        const hasCorrectionKeyword = correctionKeywords.some(keyword => 
          trimmed.toLowerCase().includes(keyword.toLowerCase())
        )
        
        // بررسی اینکه آیا کاربر می‌خواهد title را تغییر دهد
        const titleKeywords = ['اسم تسک', 'عنوان تسک', 'اسم', 'عنوان', 'نام تسک', 'بذار', 'عوض', 'تغییر']
        const wantsTitleChange = titleKeywords.some(keyword => 
          trimmed.toLowerCase().includes(keyword.toLowerCase())
        ) && (
          trimmed.toLowerCase().includes('اسم') || 
          trimmed.toLowerCase().includes('عنوان') || 
          trimmed.toLowerCase().includes('تسک')
        )
        
        if (hasCorrectionKeyword && wantsTitleChange) {
          // الگوهای رایج: "اسم تسک رو بذار X", "عنوان تسک X", "اسم تسک X نذار"
          const titlePattern1 = /(?:اسم|عنوان|نام)\s+تسک\s+(?:رو|را)?\s*بذار\s+(.+?)(?:\s+(?:نذار|نکن|نباشه))?$/i
          const titlePattern2 = /(?:اسم|عنوان|نام)\s+تسک\s+(?:رو|را)?\s*(.+?)(?:\s+(?:نذار|نکن|نباشه))?$/i
          const titlePattern3 = /(?:اسم|عنوان|نام)\s+(?:تسک\s+)?(?:رو|را)?\s*بذار\s+(.+?)(?:\s+(?:نذار|نکن|نباشه))?$/i
          
          let newTitle = null
          
          // تلاش برای استخراج با الگوها
          const match1 = trimmed.match(titlePattern1)
          const match2 = trimmed.match(titlePattern2)
          const match3 = trimmed.match(titlePattern3)
          
          const extractedTitle = match1?.[1] || match2?.[1] || match3?.[1]
          
          if (extractedTitle) {
            let tempTitle = extractedTitle.trim()
            
            // حذف کلمات اضافی
            const removeWords = ['رو', 'را', 'و', 'هم', 'این', 'تسک', 'برای', 'به', 'با', 'باشه', 'نیست']
            for (const word of removeWords) {
              const regex = new RegExp(`^${word}\\s+`, 'gi')
              tempTitle = tempTitle.replace(regex, '').trim()
              const regexEnd = new RegExp(`\\s+${word}$`, 'gi')
              tempTitle = tempTitle.replace(regexEnd, '').trim()
            }
            
            // حذف علائم اضافی
            tempTitle = tempTitle.replace(/[،,.]$/, '').trim()
            
            if (tempTitle && tempTitle.length > 2) {
              newTitle = tempTitle
            }
          } else {
            // اگر الگو پیدا نشد، سعی کن از انتهای جمله استخراج کن
            // بررسی اینکه آیا جمله چند بخشی است (مثلاً: "نه، اسم تسک رو X نذار. اسم تسک رو بذار Y")
            const sentences = trimmed.split(/[،,.]/).map(s => s.trim()).filter(s => s.length > 0)
            
            // اگر جمله چند بخشی است، بخش آخر را بررسی کن
            let tempTitle = sentences.length > 1 ? sentences[sentences.length - 1] : trimmed
            
            // اگر بخش آخر شامل "بذار" است، احتمالاً عنوان جدید است
            if (tempTitle.toLowerCase().includes('بذار')) {
              // حذف بخش اول (کلمات کلیدی)
              for (const keyword of ['اسم تسک', 'عنوان تسک', 'اسم', 'عنوان', 'نام تسک']) {
                const keywordIndex = tempTitle.toLowerCase().indexOf(keyword.toLowerCase())
                if (keywordIndex !== -1) {
                  tempTitle = tempTitle.substring(keywordIndex + keyword.length).trim()
                  break
                }
              }
              
              // حذف کلمات اضافی از ابتدا
              tempTitle = tempTitle.replace(/^(رو|را|و|هم|این|تسک|برای|به|با|بذار)\s+/gi, '').trim()
              
              // حذف کلمات اضافی از انتها
              tempTitle = tempTitle.replace(/\s+(نذار|نکن|نباشه|نیست|باشه)$/gi, '').trim()
              tempTitle = tempTitle.replace(/[،,.]$/, '').trim()
              
              if (tempTitle && tempTitle.length > 2 && tempTitle.length < 100) {
                newTitle = tempTitle
              }
            } else {
              // اگر جمله ساده‌تر است، همان روش قبلی
              for (const keyword of ['اسم تسک', 'عنوان تسک', 'اسم', 'عنوان', 'نام تسک']) {
                const keywordIndex = tempTitle.toLowerCase().indexOf(keyword.toLowerCase())
                if (keywordIndex !== -1) {
                  tempTitle = tempTitle.substring(keywordIndex + keyword.length).trim()
                  break
                }
              }
              
              // حذف کلمات اضافی از ابتدا
              tempTitle = tempTitle.replace(/^(رو|را|و|هم|این|تسک|برای|به|با|بذار)\s+/gi, '').trim()
              
              // حذف کلمات اضافی از انتها
              tempTitle = tempTitle.replace(/\s+(نذار|نکن|نباشه|نیست|باشه)$/gi, '').trim()
              tempTitle = tempTitle.replace(/[،,.]$/, '').trim()
              
              // اگر متن باقی‌مانده معنا دارد
              if (tempTitle && tempTitle.length > 2 && tempTitle.length < 100) {
                newTitle = tempTitle
              }
            }
          }
          
          if (newTitle) {
            // به‌روزرسانی pendingTask با عنوان جدید
            const updatedTask = {
              ...pendingTask,
              title: newTitle,
            }
            
            setPendingTask(updatedTask)
            
            // برگشت به فاز مناسب (اگر title فقط تغییر داده، به confirm برو)
            setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
            const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
            const dueDateText = updatedTask.dueDate ? ` تا تاریخ ${updatedTask.dueDate}` : ''
            const notesText = updatedTask.notes ? `\nتوضیحات: ${updatedTask.notes}` : ''
            setAssistantNote(
              `تسک با عنوان جدید «${newTitle}» برای پروژه «${updatedTask.projectName}»${assigneeText}${dueDateText}${notesText} آماده است. تایید می‌کنی؟`
            )
            setMode('idle')
            return
          }
        }
      }

      // اگر در فاز پرسیدن تاریخ هستیم، ویس فعلی را به‌عنوان تاریخ بگیر
      if (assistantPhase === PHASE_WAITING_TASK_DATE) {
        if (!pendingTask) {
          setAssistantPhase(PHASE_IDLE)
          setMode('idle')
          return
        }
        
        // بررسی کن که آیا کاربر گفته "نه" یا "خیر"
        const isNegative = trimmed.toLowerCase().includes('نه') || 
                           trimmed.toLowerCase().includes('خیر') || 
                           trimmed.toLowerCase().includes('نیاز نداره') || 
                           trimmed.toLowerCase().includes('نیازی نیست')
        
        if (isNegative) {
          // کاربر نمی‌خواد تاریخ
          const updatedTask = {
            ...pendingTask,
            dueDate: null,
          }
          
          // اگر notes هم ناقص است، بپرس
          if (updatedTask.missingFields?.includes('notes')) {
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_NOTES)
            const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
            setAssistantNote(
              `تسک «${updatedTask.title}» برای پروژه «${updatedTask.projectName}»${assigneeText} بدون تاریخ آماده است.\n\n⚠️ اطلاعات ناقص: توضیحات (notes) تسک رو ندادی.\n\nآیا نیاز به توضیحات داره؟\n• اگر بله، توضیحات رو بگو\n• اگر نه، بگو «نه» یا «خیر» یا «نیاز نداره»`
            )
          } else {
            // همه اطلاعات کامل است، به تایید برو
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
            const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
            const notesText = updatedTask.notes ? `\nتوضیحات: ${updatedTask.notes}` : ''
            setAssistantNote(
              `می‌خوای تسک «${updatedTask.title}» رو برای پروژه «${updatedTask.projectName}»${assigneeText}${notesText} اضافه کنم؟`
            )
          }
        } else {
          // استخراج تاریخ از متن
          // تلاش برای استخراج تاریخ فارسی یا شمسی (مثلاً: ۱۵ بهمن، ۲۰/۱۱/۱۴۰۳)
          let extractedDate = null
          
          // الگوهای تاریخ: "15 بهمن", "20/11/1403", "2025-02-15", "15-02-2025"
          const datePatterns = [
            /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
            /(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})/, // DD/MM/YYYY or DD-MM-YYYY
          ]
          
          for (const pattern of datePatterns) {
            const match = trimmed.match(pattern)
            if (match) {
              try {
                let year, month, day
                if (pattern.source.includes('YYYY')) {
                  // YYYY-MM-DD format
                  year = parseInt(match[1])
                  month = parseInt(match[2])
                  day = parseInt(match[3])
                } else {
                  // DD/MM/YYYY or DD-MM-YYYY
                  day = parseInt(match[1])
                  month = parseInt(match[2])
                  year = parseInt(match[3])
                }
                
                // تبدیل به میلادی اگر شمسی باشد (برای سادگی، فرض می‌کنیم سال 1400+ شمسی است)
                if (year >= 1400 && year < 1500) {
                  // این یک تاریخ شمسی است - تبدیل تقریبی (برای MVP)
                  // سال شمسی 1403 ≈ سال میلادی 2024-2025
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
          
          // اگر تاریخ استخراج نشد، سعی کن عبارات نسبی را تشخیص بده
          if (!extractedDate) {
            const today = new Date()
            let daysToAdd = 0
            
            // الگوهای نسبی بهبود یافته
            const relativePatterns = [
              // روزها - الگوهای جدید و بهبود یافته
              { pattern: /(?:دو|2)\s*روز\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 2 },
              { pattern: /(?:دوروز|دو\s*روز)\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 2 },
              { pattern: /(?:(\d+)\s*روز|(\d+)\s*روزه)\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, multiplier: 1 },
              { pattern: /(?:(\d+)\s*روز|(\d+)\s*روزه)\s*(?:روز|از امروز)/i, multiplier: 1 },
              { pattern: /(?:فردا|پس فردا|پسفردا)/i, days: 1 },
              { pattern: /(?:پس|بعد)\s*فردا/i, days: 2 },
              { pattern: /(?:سه|3)\s*روز\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 3 },
              { pattern: /(?:چهار|4)\s*روز\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 4 },
              { pattern: /(?:پنج|5)\s*روز\s*(?:دیگه|دیگر|بعد|آینده)/i, days: 5 },
              
              // هفته‌ها - الگوهای جدید برای روزهای هفته
              { pattern: /(?:هفته\s*دیگه|هفته\s*دیگر|هفته\s*بعد|هفته\s*آینده)\s*(?:سه\s*شنبه|سه\u200cشنبه|چهارشنبه|پنج\s*شنبه|پنج\u200cشنبه|جمعه|شنبه|یکشنبه|دوشنبه)/i, getDayOfWeek: true },
              { pattern: /(?:سه\s*شنبه|سه\u200cشنبه|چهارشنبه|پنج\s*شنبه|پنج\u200cشنبه|جمعه|شنبه|یکشنبه|دوشنبه)\s*(?:هفته\s*دیگه|هفته\s*دیگر|هفته\s*بعد|هفته\s*آینده)/i, getDayOfWeek: true },
              { pattern: /(?:بذار|بزار)\s*(?:برای|به)\s*(?:هفته\s*دیگه|هفته\s*دیگر|هفته\s*بعد)\s*(?:سه\s*شنبه|سه\u200cشنبه|چهارشنبه|پنج\s*شنبه|پنج\u200cشنبه|جمعه|شنبه|یکشنبه|دوشنبه)/i, getDayOfWeek: true },
              { pattern: /(?:(\d+)\s*هفته|(\d+)\s*هفته‌ای)\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, multiplier: 7 },
              { pattern: /(?:(\d+)\s*هفته|(\d+)\s*هفته‌ای)\s*(?:هفته|از امروز)/i, multiplier: 7 },
              { pattern: /(?:یک|یه)\s*هفته\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 7 },
              { pattern: /(?:دو)\s*هفته\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 14 },
              { pattern: /(?:سه)\s*هفته\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 21 },
              
              // ماه‌ها
              { pattern: /(?:(\d+)\s*ماه|(\d+)\s*ماهه)\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, multiplier: 30 },
              
              // عبارات خاص فارسی
              { pattern: /(?:سه)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 3 },
              { pattern: /(?:چهار)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 4 },
              { pattern: /(?:پنج)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 5 },
              { pattern: /(?:شش)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 6 },
              { pattern: /(?:هفت)\s*روز\s*(?:آینده|دیگه|بعد|دیگر|بعدی)/i, days: 7 },
            ]
            
            // تابع برای پیدا کردن روز هفته
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
            
            // تابع برای پیدا کردن روز هفته بعدی
            const getNextDayOfWeek = (targetDay) => {
              const todayDay = today.getDay()
              let daysToAdd = targetDay - todayDay
              if (daysToAdd <= 0) {
                daysToAdd += 7 // هفته بعد
              }
              return daysToAdd
            }
            
            for (const patternInfo of relativePatterns) {
              const match = trimmed.match(patternInfo.pattern)
              if (match) {
                if (patternInfo.getDayOfWeek) {
                  // پیدا کردن نام روز هفته در متن
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
          
          // اگر تاریخ استخراج نشد، سعی کن از متن، اعداد را بگیر
          if (!extractedDate) {
            // الگوی ساده: اگر فقط اعداد گفت، به عنوان روز ماه فعلی در نظر بگیر
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
          
          // اگر تاریخ استخراج نشد، دوباره بپرس
          if (!extractedDate) {
            setAssistantNote(
              `تاریخ «${trimmed}» رو متوجه نشدم. لطفاً تاریخ رو واضح‌تر بگو. می‌تونی بگی:\n• تاریخ دقیق: مثل «۱۵ بهمن»، «۲۰/۱۱/۱۴۰۳»، یا «2025-02-15»\n• تاریخ نسبی: مثل «دو روز دیگه»، «هفته دیگه سه شنبه»، «فردا»، «پس فردا»\n• یا بگو «نیاز نداره» اگر نمی‌خوای تاریخ بذاری`
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
              `تسک «${updatedTask.title}» برای پروژه «${updatedTask.projectName}»${assigneeText} با تاریخ ${extractedDate} آماده است.\n\n⚠️ اطلاعات ناقص: توضیحات (notes) تسک رو ندادی.\n\nآیا نیاز به توضیحات داره؟\n• اگر بله، توضیحات رو بگو\n• اگر نه، بگو «نه» یا «خیر» یا «نیاز نداره»`
            )
          } else {
            // همه اطلاعات کامل است، به تایید برو
            setPendingTask(updatedTask)
            setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
            const assigneeText = updatedTask.assigneeName ? ` با همکار «${updatedTask.assigneeName}»` : ''
            const notesText = updatedTask.notes ? `\nتوضیحات: ${updatedTask.notes}` : ''
            setAssistantNote(
              `می‌خوای تسک «${updatedTask.title}» رو برای پروژه «${updatedTask.projectName}»${assigneeText} تا تاریخ ${extractedDate}${notesText} اضافه کنم؟`
            )
          }
        }
        setMode('idle')
        return
      }

      // اگر در فاز پرسیدن notes هستیم، ویس فعلی را به‌عنوان notes بگیر
      if (assistantPhase === PHASE_WAITING_TASK_NOTES) {
        if (!pendingTask) {
          setAssistantPhase(PHASE_IDLE)
          setMode('idle')
          return
        }
        
        // بررسی کن که آیا کاربر گفته "نه" یا "خیر"
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
          `می‌خوای تسک «${pendingTask.title}» رو برای پروژه «${pendingTask.projectName}»${assigneeText}${dueDateText}${notesText} اضافه کنم؟`
        )
        setMode('idle')
        return
      }

      // در بقیه حالات، intent را از روی متن تشخیص بده
      const intentResult = await analyzePlannerIntent(trimmed, state.projects, state.collaborators || [])

      const entities = {
        projectId: intentResult.projectId,
        projectName: intentResult.projectName,
        needsProjectName: intentResult.needsProjectName,
        updateFields: intentResult.updateFields,
        collaboratorInfo: intentResult.collaboratorInfo,
        taskInfo: intentResult.taskInfo,
      }

      let result = null

      switch (intentResult.intent) {
        case 'create_project': {
          result = handleCreateProject({ planner, entities })
          if (result.needsConfirmation) {
            setPendingProject(result.pendingData)
            setAssistantPhase(PHASE_WAITING_CONFIRM)
            setAssistantNote(result.message)
          } else {
            setPendingProject(null)
            setAssistantPhase(PHASE_WAITING_NAME)
            setAssistantNote(result.message)
          }
          break
        }
        case 'update_project_client_info': {
          result = handleUpdateProjectClientInfo({ planner, entities })
          if (result.error) {
            setAssistantNote(result.message)
          } else {
            setPendingUpdate(result.pendingData)
            setAssistantPhase(PHASE_WAITING_UPDATE_CONFIRM)
            setAssistantNote(result.message)
          }
          break
        }
        case 'add_collaborator_to_project': {
          result = handleAddCollaboratorToProject({ planner, entities, transcript: trimmed })
          if (result.error) {
            setAssistantNote(result.message)
          } else {
            setPendingCollaborator(result.pendingData)
            setAssistantPhase(PHASE_WAITING_COLLABORATOR_CONFIRM)
            setAssistantNote(result.message)
          }
          break
        }
        case 'archive_project': {
          result = handleArchiveProject({ planner, entities })
          if (result.error) {
            setAssistantNote(result.message)
          } else {
            setPendingArchive(result.pendingData)
            setAssistantPhase(PHASE_WAITING_ARCHIVE_CONFIRM)
            setAssistantNote(result.message)
          }
          break
        }
        case 'restore_project': {
          result = handleRestoreProject({ planner, entities })
          if (result.error) {
            setAssistantNote(result.message)
          } else {
            setAssistantNote(result.message)
            setAssistantPhase(PHASE_IDLE)
          }
          break
        }
        case 'create_task': {
          result = handleCreateTask({ planner, entities, transcript: trimmed })
          if (result.error) {
            setAssistantNote(result.message)
          } else if (result.needsConfirmation) {
            setPendingTask(result.pendingData)
            setAssistantPhase(PHASE_WAITING_TASK_CONFIRM)
            setAssistantNote(result.message)
          } else {
            setPendingTask(result.pendingData)
            setAssistantPhase(result.nextPhase === 'awaitingTaskAssignee' ? PHASE_WAITING_TASK_ASSIGNEE : result.nextPhase === 'awaitingTaskDate' ? PHASE_WAITING_TASK_DATE : PHASE_WAITING_TASK_NOTES)
            setAssistantNote(result.message)
          }
          break
        }
        case 'update_task': {
          result = handleUpdateTask({ planner, entities })
          setAssistantNote(result.message)
          break
        }
        case 'toggle_task_done': {
          result = handleToggleTaskDone({ planner, entities })
          setAssistantNote(result.message)
          break
        }
        case 'navigate_today': {
          result = handleNavigateToday({ navigate })
          setAssistantNote(result.message)
          break
        }
        case 'navigate_projects': {
          result = handleNavigateProjects({ navigate })
          setAssistantNote(result.message)
          break
        }
        case 'navigate_finance': {
          result = handleNavigateFinance({ navigate })
          setAssistantNote(result.message)
          break
        }
        default: {
          // Fallback for small_talk, unknown, or other intents
          setAssistantNote('')
          break
        }
      }

      setMode('idle')
    } catch (error) {
      console.error('Failed to stop recording', error)
      setErrorMessage('خطایی در ضبط صدا رخ داد.')
    } finally {
      setMode('idle')
    }
  }, [assistantPhase, isRecording, stopRecording, state.projects, state.collaborators, planner, navigate])

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

      setAssistantNote(`پروژه «${name}» ساخته شد ✅`)
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
    setAssistantPhase(PHASE_IDLE)
    setAssistantNote('باشه، تغییرات اعمال نمی‌شود.')
  }, [])

  const handleConfirmUpdate = useCallback(() => {
    if (!pendingUpdate || isSubmitting) return

    try {
      setIsSubmitting(true)
      updateProject(pendingUpdate.projectId, pendingUpdate.updates)
      setAssistantNote(`اطلاعات پروژه «${pendingUpdate.projectName}» به‌روزرسانی شد ✅`)
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
        setAssistantNote('پروژه پیدا نشد.')
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
          ? ` با مسئولیت‌های: ${pendingCollaborator.responsibilities.join('، ')}`
          : ''
      setAssistantNote(`همکار «${pendingCollaborator.collaboratorName}» به پروژه «${pendingCollaborator.projectName}» اضافه شد${respText} ✅`)
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
      setAssistantNote(`پروژه «${pendingArchive.projectName}» archive شد و به لیست پروژه‌های بایگانی شده منتقل شد ✅`)
      setPendingArchive(null)
      setAssistantPhase(PHASE_IDLE)
    } finally {
      setIsSubmitting(false)
    }
  }, [archiveProject, pendingArchive, isSubmitting])

  const handleConfirmAddTask = useCallback(() => {
    if (!pendingTask || isSubmitting) return

    try {
      setIsSubmitting(true)
      
      // تبدیل dueDate به ISO string اگر وجود دارد
      let dueAt = null
      if (pendingTask.dueDate) {
        try {
          // اگر به صورت YYYY-MM-DD است، به datetime تبدیل کن
          const date = new Date(pendingTask.dueDate)
          if (!isNaN(date.getTime())) {
            dueAt = date.toISOString()
          }
        } catch (e) {
          console.error('Invalid date format', e)
        }
      }
      
      addTask({
        projectId: pendingTask.projectId,
        title: pendingTask.title,
        assignedTo: pendingTask.assigneeName || null,
        dueAt: dueAt,
        notes: pendingTask.notes || null,
        priority: 3, // پیش‌فرض
        status: 'todo',
      })

      const assigneeText = pendingTask.assigneeName ? ` با همکار «${pendingTask.assigneeName}»` : ''
      const dueDateText = pendingTask.dueDate && pendingTask.dueDate !== 'undefined' 
        ? ` تا تاریخ ${pendingTask.dueDate}` 
        : ''
      setAssistantNote(`تسک «${pendingTask.title}» برای پروژه «${pendingTask.projectName}»${assigneeText}${dueDateText} اضافه شد ✅`)
      setPendingTask(null)
      setAssistantPhase(PHASE_IDLE)
    } finally {
      setIsSubmitting(false)
    }
  }, [addTask, pendingTask, isSubmitting])

  const visualMode = mode === 'recording' ? 'listening' : mode

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
    (assistantPhase === PHASE_WAITING_TASK_CONFIRM && pendingTask)
  )

  return (
    <DSPage title="Jarvis Assistant">
      <div className="assistant-page">
      <div className="assistant-orb-wrapper">
        <button
          type="button"
          className={`assistant-orb assistant-orb--${visualMode}`}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handlePressStart(e)
          }}
          onPointerUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handlePressEnd(e)
          }}
          onPointerCancel={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (isRecording) {
              handlePressEnd(e)
            }
          }}
          onPointerLeave={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (isRecording) {
              handlePressEnd(e)
            }
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
          onMouseUp={(e) => {
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <span className="assistant-orb-glow" />
          <span className="assistant-orb-label">{label}</span>
        </button>
      </div>

      {(lastTranscript || showAssistantCard || errorMessage) && (
        <div className="assistant-transcript-wrapper">
          {lastTranscript && (
            <DSSection title="آخرین چیزی که گفتی:" className="ds-assistant-transcript">
              <div className="assistant-transcript-text">{lastTranscript}</div>
            </DSSection>
          )}

          {showAssistantCard && (
            <DSSection title="Jarvis" className="ds-assistant-transcript ds-assistant-transcript--assistant">
              <div className="assistant-transcript-text">{assistantNote}</div>

              {assistantPhase === PHASE_WAITING_CONFIRM && pendingProject?.name && (
                <div className="assistant-actions">
                  <DSButton onClick={handleConfirmCreateProject} disabled={isSubmitting}>
                    تایید و ساخت پروژه
                  </DSButton>
                  <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                    لغو
                  </DSButton>
                </div>
              )}

              {assistantPhase === PHASE_WAITING_UPDATE_CONFIRM && pendingUpdate && (
                <div className="assistant-actions">
                  <DSButton onClick={handleConfirmUpdate} disabled={isSubmitting}>
                    تایید و اعمال تغییرات
                  </DSButton>
                  <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                    لغو
                  </DSButton>
                </div>
              )}

              {assistantPhase === PHASE_WAITING_COLLABORATOR_CONFIRM && pendingCollaborator && (
                <div className="assistant-actions">
                  <DSButton onClick={handleConfirmAddCollaborator} disabled={isSubmitting}>
                    تایید و اضافه کردن همکار
                  </DSButton>
                  <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                    لغو
                  </DSButton>
                </div>
              )}

              {assistantPhase === PHASE_WAITING_ARCHIVE_CONFIRM && pendingArchive && (
                <div className="assistant-actions">
                  <DSButton onClick={handleConfirmArchive} disabled={isSubmitting}>
                    تایید و Archive کردن
                  </DSButton>
                  <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                    لغو
                  </DSButton>
                </div>
              )}

              {assistantPhase === PHASE_WAITING_TASK_CONFIRM && pendingTask && (
                <div className="assistant-actions">
                  <DSButton onClick={handleConfirmAddTask} disabled={isSubmitting}>
                    تایید و اضافه کردن تسک
                  </DSButton>
                  <DSButton variant="secondary" onClick={handleCancelPending} disabled={isSubmitting}>
                    لغو
                  </DSButton>
                </div>
              )}
            </DSSection>
          )}

          {errorMessage && <div className="assistant-error-text">{errorMessage}</div>}
        </div>
      )}
      </div>
    </DSPage>
  )
}
