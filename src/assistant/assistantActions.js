// src/assistant/assistantActions.js
// Pure action handlers for Jarvis intents

/**
 * Handle create_project intent
 * Returns an object with:
 * - needsConfirmation: boolean
 * - pendingData: object with project data
 * - message: string to show user
 */
export function handleCreateProject({ planner, entities }) {
  const { state } = planner
  const { projectName, needsProjectName } = entities

  if (projectName && !needsProjectName) {
    return {
      needsConfirmation: true,
      pendingData: { name: projectName },
      message: `می‌خوای پروژه «${projectName}» ساخته بشه؟`,
    }
  } else {
    return {
      needsConfirmation: false,
      pendingData: null,
      message: 'می‌خوای یک پروژه جدید بسازی.\n\n⚠️ اطلاعات ناقص: اسم پروژه رو مشخص نکردی.\n\nاسم پروژه چی باشه؟',
      nextPhase: 'awaitingProjectName',
    }
  }
}

/**
 * Handle update_project_client_info intent
 * Returns confirmation data with changes
 */
export function handleUpdateProjectClientInfo({ planner, entities }) {
  const { state } = planner
  const { projectId, projectName, updateFields } = entities

  // Find project
  let targetProject = null
  if (projectId) {
    targetProject = state.projects.find((p) => p.id === projectId)
  } else if (projectName) {
    targetProject = state.projects.find(
      (p) =>
        p.name.toLowerCase().includes(projectName.toLowerCase()) ||
        projectName.toLowerCase().includes(p.name.toLowerCase())
    )
  }

  if (!targetProject) {
    return {
      error: true,
      message: `پروژه «${projectName || 'مشخص شده'}» پیدا نشد. لطفاً نام پروژه را واضح‌تر بگو.`,
    }
  }

  // Build updates object
  const updates = {}
  const changes = []
  const currentData = {
    clientName: targetProject.clientName || '',
    clientPhone: targetProject.clientPhone || '',
    referredByName: targetProject.referredByName || '',
    referredByPhone: targetProject.referredByPhone || '',
  }

  if (updateFields?.clientName !== null && updateFields?.clientName !== undefined) {
    updates.clientName = updateFields.clientName
    if (currentData.clientName) {
      changes.push(`کارفرما: «${currentData.clientName}» → «${updateFields.clientName}»`)
    } else {
      changes.push(`کارفرما: اضافه می‌شود → «${updateFields.clientName}»`)
    }
  }
  if (updateFields?.clientPhone !== null && updateFields?.clientPhone !== undefined) {
    updates.clientPhone = updateFields.clientPhone
    if (currentData.clientPhone) {
      changes.push(`شماره کارفرما: «${currentData.clientPhone}» → «${updateFields.clientPhone}»`)
    } else {
      changes.push(`شماره کارفرما: اضافه می‌شود → «${updateFields.clientPhone}»`)
    }
  }
  if (updateFields?.referredByName !== null && updateFields?.referredByName !== undefined) {
    updates.referredByName = updateFields.referredByName
    if (currentData.referredByName) {
      changes.push(`معرف: «${currentData.referredByName}» → «${updateFields.referredByName}»`)
    } else {
      changes.push(`معرف: اضافه می‌شود → «${updateFields.referredByName}»`)
    }
  }
  if (updateFields?.referredByPhone !== null && updateFields?.referredByPhone !== undefined) {
    updates.referredByPhone = updateFields.referredByPhone
    if (currentData.referredByPhone) {
      changes.push(`شماره معرف: «${currentData.referredByPhone}» → «${updateFields.referredByPhone}»`)
    } else {
      changes.push(`شماره معرف: اضافه می‌شود → «${updateFields.referredByPhone}»`)
    }
  }

  if (Object.keys(updates).length === 0) {
    return {
      error: true,
      message: 'متوجه نشدم چه تغییری می‌خوای. لطفاً واضح‌تر بگو.',
    }
  }

  const changesText = changes.map((c) => `• ${c}`).join('\n')
  return {
    needsConfirmation: true,
    pendingData: {
      projectId: targetProject.id,
      projectName: targetProject.name,
      updates,
      currentData,
      changes,
    },
    message: `می‌خوای اطلاعات پروژه «${targetProject.name}» رو تغییر بدم؟\n\nتغییرات:\n${changesText}`,
  }
}

/**
 * Handle add_collaborator_to_project intent
 */
export function handleAddCollaboratorToProject({ planner, entities, transcript }) {
  const { state } = planner
  const { projectId, projectName, collaboratorInfo } = entities

  // Find project
  let targetProject = null
  if (projectId) {
    targetProject = state.projects.find((p) => p.id === projectId && !p.archived)
  } else if (projectName) {
    targetProject = state.projects.find(
      (p) =>
        !p.archived &&
        (p.name.toLowerCase().includes(projectName.toLowerCase()) ||
          projectName.toLowerCase().includes(p.name.toLowerCase()))
    )
  }

  if (!targetProject) {
    return {
      error: true,
      message: `پروژه «${projectName || 'مشخص شده'}» پیدا نشد. لطفاً نام پروژه را واضح‌تر بگو.`,
    }
  }

  // Find collaborator
  let targetCollaborator = null
  if (collaboratorInfo?.collaboratorId) {
    targetCollaborator = (state.collaborators || []).find((c) => c.id === collaboratorInfo.collaboratorId)
  } else if (collaboratorInfo?.collaboratorName) {
    targetCollaborator = (state.collaborators || []).find(
      (c) =>
        c.name.toLowerCase().includes(collaboratorInfo.collaboratorName.toLowerCase()) ||
        collaboratorInfo.collaboratorName.toLowerCase().includes(c.name.toLowerCase())
    )
  }

  // Try to extract from transcript if not found
  if (!targetCollaborator && transcript) {
    for (const collaborator of state.collaborators || []) {
      const collaboratorNameLower = collaborator.name.toLowerCase()
      if (
        transcript.includes(collaboratorNameLower) ||
        collaboratorNameLower.includes(transcript.split(' ').filter((w) => w.length > 2)[0])
      ) {
        targetCollaborator = collaborator
        break
      }
    }
  }

  if (!targetCollaborator) {
    return {
      error: true,
      message: `همکار «${collaboratorInfo?.collaboratorName || 'مشخص شده'}» پیدا نشد. لطفاً ابتدا همکار را در صفحه Collaborators اضافه کنید.`,
    }
  }

  // Check if already added
  const existingCollaborators = targetProject.collaborators || []
  const alreadyAdded = existingCollaborators.some((c) => (c.collaboratorId || c.id) === targetCollaborator.id)

  if (alreadyAdded) {
    return {
      error: true,
      message: `همکار «${targetCollaborator.name}» قبلاً به پروژه «${targetProject.name}» اضافه شده است.`,
    }
  }

  const responsibilities = collaboratorInfo?.responsibilities || []
  const respText = responsibilities.length > 0 ? ` با مسئولیت‌های: ${responsibilities.join('، ')}` : ''

  return {
    needsConfirmation: true,
    pendingData: {
      projectId: targetProject.id,
      projectName: targetProject.name,
      collaboratorId: targetCollaborator.id,
      collaboratorName: targetCollaborator.name,
      collaboratorRole: targetCollaborator.role || '',
      collaboratorPhone: targetCollaborator.phone || '',
      collaboratorEmail: targetCollaborator.email || '',
      responsibilities,
    },
    message: `می‌خوای همکار «${targetCollaborator.name}» رو به پروژه «${targetProject.name}» اضافه کنم${respText}؟`,
  }
}

/**
 * Handle archive_project intent
 */
export function handleArchiveProject({ planner, entities }) {
  const { state } = planner
  const { projectId, projectName } = entities

  // Find project
  let targetProject = null
  if (projectId) {
    targetProject = state.projects.find((p) => p.id === projectId && !p.archived)
  } else if (projectName) {
    targetProject = state.projects.find(
      (p) =>
        !p.archived &&
        (p.name.toLowerCase().includes(projectName.toLowerCase()) ||
          projectName.toLowerCase().includes(p.name.toLowerCase()))
    )
  }

  if (!targetProject) {
    return {
      error: true,
      message: `پروژه «${projectName || 'مشخص شده'}» پیدا نشد یا قبلاً archive شده است. لطفاً نام پروژه را واضح‌تر بگو.`,
    }
  }

  if (targetProject.archived) {
    return {
      error: true,
      message: `پروژه «${targetProject.name}» قبلاً archive شده است.`,
    }
  }

  return {
    needsConfirmation: true,
    pendingData: {
      projectId: targetProject.id,
      projectName: targetProject.name,
    },
    message: `می‌خوای پروژه «${targetProject.name}» رو archive (بایگانی) کنم؟ پروژه به لیست پروژه‌های archived منتقل می‌شود.`,
  }
}

/**
 * Handle restore_project intent
 */
export function handleRestoreProject({ planner, entities }) {
  const { state, restoreProject } = planner
  const { projectId, projectName } = entities

  // Find archived project
  let targetProject = null
  if (projectId) {
    targetProject = state.projects.find((p) => p.id === projectId && p.archived)
  } else if (projectName) {
    targetProject = state.projects.find(
      (p) =>
        p.archived &&
        (p.name.toLowerCase().includes(projectName.toLowerCase()) ||
          projectName.toLowerCase().includes(p.name.toLowerCase()))
    )
  }

  if (!targetProject) {
    return {
      error: true,
      message: `پروژه آرشیو شده «${projectName || 'مشخص شده'}» پیدا نشد. لطفاً نام پروژه را واضح‌تر بگو.`,
    }
  }

  if (!targetProject.archived) {
    return {
      error: true,
      message: `پروژه «${targetProject.name}» در حال حاضر فعال است و نیازی به restore ندارد.`,
    }
  }

  // Execute immediately (no confirmation needed for restore)
  restoreProject(targetProject.id)
  return {
    success: true,
    message: `پروژه «${targetProject.name}» از آرشیو خارج شد و به حالت فعال برگشت ✅`,
  }
}

/**
 * Handle create_task intent
 * Returns task data and next phase if needed
 */
export function handleCreateTask({ planner, entities, transcript }) {
  const { state } = planner
  const { taskInfo, projectId, projectName, collaboratorInfo } = entities

  // Check required fields
  if (!taskInfo?.title || taskInfo.title.trim().length === 0) {
    return {
      error: true,
      message: 'عنوان تسک رو مشخص نکردی. لطفاً بگو چه تسکی می‌خوای بسازی.',
    }
  }

  // Find project
  let targetProject = null
  if (taskInfo?.projectId) {
    targetProject = state.projects.find((p) => p.id === taskInfo.projectId && !p.archived)
  } else if (taskInfo?.projectName) {
    targetProject = state.projects.find(
      (p) =>
        !p.archived &&
        (p.name.toLowerCase().includes(taskInfo.projectName.toLowerCase()) ||
          taskInfo.projectName.toLowerCase().includes(p.name.toLowerCase()))
    )
  } else if (projectId) {
    targetProject = state.projects.find((p) => p.id === projectId && !p.archived)
  } else if (projectName) {
    targetProject = state.projects.find(
      (p) =>
        !p.archived &&
        (p.name.toLowerCase().includes(projectName.toLowerCase()) ||
          projectName.toLowerCase().includes(p.name.toLowerCase()))
    )
  }

  if (!targetProject) {
    return {
      error: true,
      message: `پروژه «${taskInfo?.projectName || projectName || 'مشخص شده'}» پیدا نشد. لطفاً نام پروژه را واضح‌تر بگو.`,
    }
  }

  // Find assignee
  let assigneeName = taskInfo?.assigneeName || null
  let assigneeId = taskInfo?.assigneeId || null

  // Try collaboratorInfo if not in taskInfo
  if (!assigneeName && collaboratorInfo?.collaboratorName) {
    const foundCollaborator = (state.collaborators || []).find(
      (c) =>
        c.id === collaboratorInfo.collaboratorId ||
        c.name.toLowerCase().includes(collaboratorInfo.collaboratorName.toLowerCase()) ||
        collaboratorInfo.collaboratorName.toLowerCase().includes(c.name.toLowerCase())
    )
    if (foundCollaborator) {
      assigneeName = foundCollaborator.name
      assigneeId = foundCollaborator.id
    }
  }

  // Try extracting from transcript
  if (!assigneeName && transcript) {
    const assignKeywords = ['اساین', 'assign', 'مسئول', 'به', 'برای']
    const hasAssignKeyword = assignKeywords.some((keyword) => transcript.toLowerCase().includes(keyword.toLowerCase()))

    if (hasAssignKeyword) {
      for (const collaborator of state.collaborators || []) {
        const collaboratorNameLower = collaborator.name.toLowerCase()
        const transcriptLower = transcript.toLowerCase()
        const nameIndex = transcriptLower.indexOf(collaboratorNameLower)
        if (nameIndex !== -1) {
          const beforeName = transcriptLower.substring(0, nameIndex)
          const assignBeforeName = assignKeywords.some((keyword) => beforeName.includes(keyword.toLowerCase()))
          if (assignBeforeName || transcriptLower.includes('اساین') || transcriptLower.includes('assign')) {
            assigneeName = collaborator.name
            assigneeId = collaborator.id
            break
          }
        }
      }
    }
  }

  // Build task data
  const taskData = {
    title: taskInfo.title,
    projectId: targetProject.id,
    projectName: targetProject.name,
    assigneeName: assigneeName,
    assigneeId: assigneeId,
    dueDate: taskInfo?.dueDate || null,
    notes: taskInfo?.notes || null,
    missingFields: [],
  }

  // Check missing fields
  if (!taskData.assigneeName) {
    taskData.missingFields.push('assignee')
  }
  if (!taskData.dueDate) {
    taskData.missingFields.push('dueDate')
  }
  if (!taskData.notes) {
    taskData.missingFields.push('notes')
  }

  // Determine next phase - با پیام‌های واضح‌تر
  if (taskData.missingFields.includes('assignee')) {
    return {
      needsConfirmation: false,
      pendingData: taskData,
      message: `تسک «${taskData.title}» برای پروژه «${taskData.projectName}» آماده است.\n\n⚠️ اطلاعات ناقص: مسئول (assignee) تسک رو مشخص نکردی.\n\nآیا این تسک رو به یک همکار assign کنی؟\n• اگر بله، نام همکار رو بگو (مثلاً: «علی زارعی»)\n• اگر نه، بگو «نیاز نداره» یا «نه»`,
      nextPhase: 'awaitingTaskAssignee',
    }
  } else if (taskData.missingFields.includes('dueDate')) {
    const assigneeText = taskData.assigneeName ? ` با همکار «${taskData.assigneeName}»` : ''
    return {
      needsConfirmation: false,
      pendingData: taskData,
      message: `تسک «${taskData.title}» برای پروژه «${taskData.projectName}»${assigneeText} آماده است.\n\n⚠️ اطلاعات ناقص: تاریخ پیگیری (due date) تسک رو مشخص نکردی.\n\nآیا برای این تسک تاریخ مشخص کنی؟\n• اگر بله، تاریخ رو بگو:\n  - تاریخ دقیق: «۱۵ بهمن»، «۲۰/۱۱/۱۴۰۳»، «2025-02-15»\n  - تاریخ نسبی: «دو روز دیگه»، «هفته دیگه سه شنبه»، «فردا»، «پس فردا»\n• اگر نه، بگو «نیاز نداره» یا «نه»`,
      nextPhase: 'awaitingTaskDate',
    }
  } else if (taskData.missingFields.includes('notes')) {
    const assigneeText = taskData.assigneeName ? ` با همکار «${taskData.assigneeName}»` : ''
    const dueDateText = taskData.dueDate ? ` با تاریخ ${taskData.dueDate}` : ''
    return {
      needsConfirmation: false,
      pendingData: taskData,
      message: `تسک «${taskData.title}» برای پروژه «${taskData.projectName}»${assigneeText}${dueDateText} آماده است.\n\n⚠️ اطلاعات ناقص: توضیحات (notes) تسک رو ندادی.\n\nآیا نیاز به توضیحات داره؟\n• اگر بله، توضیحات رو بگو\n• اگر نه، بگو «نه» یا «خیر» یا «نیاز نداره»`,
      nextPhase: 'awaitingTaskNotes',
    }
  } else {
    // All complete, ready for confirmation
    const assigneeText = taskData.assigneeName ? ` با همکار «${taskData.assigneeName}»` : ''
    const dueDateText = taskData.dueDate ? ` تا تاریخ ${taskData.dueDate}` : ''
    const notesText = taskData.notes ? `\nتوضیحات: ${taskData.notes}` : ''
    return {
      needsConfirmation: true,
      pendingData: taskData,
      message: `می‌خوای تسک «${taskData.title}» رو برای پروژه «${taskData.projectName}»${assigneeText}${dueDateText}${notesText} اضافه کنم؟`,
    }
  }
}

/**
 * Handle update_task intent
 */
export function handleUpdateTask({ planner, entities }) {
  const { state, updateTask } = planner
  const { taskInfo } = entities

  // This is a placeholder - full implementation would find the task and update it
  // For now, return error as it's not fully implemented in Assistant.jsx
  return {
    error: true,
    message: 'به‌روزرسانی تسک هنوز پیاده‌سازی نشده است.',
  }
}

/**
 * Handle toggle_task_done intent
 */
export function handleToggleTaskDone({ planner, entities }) {
  const { state, toggleTask } = planner
  const { taskInfo } = entities

  // This is a placeholder - full implementation would find the task and toggle it
  // For now, return error as it's not fully implemented in Assistant.jsx
  return {
    error: true,
    message: 'تغییر وضعیت تسک هنوز پیاده‌سازی نشده است.',
  }
}

/**
 * Handle navigate_today intent
 */
export function handleNavigateToday({ navigate }) {
  navigate('/today')
  return {
    success: true,
    message: 'در حال انتقال به صفحه Today...',
  }
}

/**
 * Handle navigate_projects intent
 */
export function handleNavigateProjects({ navigate }) {
  navigate('/projects')
  return {
    success: true,
    message: 'در حال انتقال به صفحه Projects...',
  }
}

/**
 * Handle navigate_finance intent
 */
export function handleNavigateFinance({ navigate }) {
  navigate('/finance')
  return {
    success: true,
    message: 'در حال انتقال به صفحه Finance...',
  }
}

