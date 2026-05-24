const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(s) {
  return s != null && typeof s === 'string' && UUID_REGEX.test(s.trim())
}

export function handleCreateProject({ planner, entities }) {
  const { state: _state } = planner
  const { projectName, needsProjectName } = entities

  if (projectName && !needsProjectName) {
    return {
      needsConfirmation: true,
      pendingData: { name: projectName },
      message: `Create project «${projectName}»?`,
    }
  } else {
    return {
      needsConfirmation: false,
      pendingData: null,
      message: 'You want to create a new project.\n\n⚠️ Missing: project name. What should the project be called?',
      nextPhase: 'awaitingProjectName',
    }
  }
}

export function handleUpdateProjectClientInfo({ planner, entities }) {
  const { state } = planner
  const { projectId, projectName, updateFields } = entities

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
      message: `Project «${projectName || 'specified'}» not found. Please say the project name more clearly.`,
    }
  }

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
      changes.push(`Client: «${currentData.clientName}» → «${updateFields.clientName}»`)
    } else {
      changes.push(`Client: adding → «${updateFields.clientName}»`)
    }
  }
  if (updateFields?.clientPhone !== null && updateFields?.clientPhone !== undefined) {
    updates.clientPhone = updateFields.clientPhone
    if (currentData.clientPhone) {
      changes.push(`Client phone: «${currentData.clientPhone}» → «${updateFields.clientPhone}»`)
    } else {
      changes.push(`Client phone: adding → «${updateFields.clientPhone}»`)
    }
  }
  if (updateFields?.referredByName !== null && updateFields?.referredByName !== undefined) {
    updates.referredByName = updateFields.referredByName
    if (currentData.referredByName) {
      changes.push(`Referred by: «${currentData.referredByName}» → «${updateFields.referredByName}»`)
    } else {
      changes.push(`Referred by: adding → «${updateFields.referredByName}»`)
    }
  }
  if (updateFields?.referredByPhone !== null && updateFields?.referredByPhone !== undefined) {
    updates.referredByPhone = updateFields.referredByPhone
    if (currentData.referredByPhone) {
      changes.push(`Referred by phone: «${currentData.referredByPhone}» → «${updateFields.referredByPhone}»`)
    } else {
      changes.push(`Referred by phone: adding → «${updateFields.referredByPhone}»`)
    }
  }

  if (Object.keys(updates).length === 0) {
    return {
      error: true,
      message: "I didn't understand what change you want. Please say it more clearly.",
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
    message: `Update project «${targetProject.name}»?\n\nChanges:\n${changesText}`,
  }
}

export function handleAddCollaboratorToProject({ planner, entities, transcript }) {
  const { state } = planner
  const { projectId, projectName, collaboratorInfo } = entities

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
      message: `Project «${projectName || 'specified'}» not found. Please say the project name more clearly.`,
    }
  }

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
      message: `Collaborator «${collaboratorInfo?.collaboratorName || 'specified'}» not found. Add them on the Collaborators page first.`,
    }
  }

  const existingCollaborators = targetProject.collaborators || []
  const alreadyAdded = existingCollaborators.some((c) => (c.collaboratorId || c.id) === targetCollaborator.id)

  if (alreadyAdded) {
    return {
      error: true,
      message: `Collaborator «${targetCollaborator.name}» is already on project «${targetProject.name}».`,
    }
  }

  const responsibilities = collaboratorInfo?.responsibilities || []
  const respText = responsibilities.length > 0 ? ` with responsibilities: ${responsibilities.join(', ')}` : ''

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
    message: `Add collaborator «${targetCollaborator.name}» to project «${targetProject.name}»${respText}?`,
  }
}

export function handleArchiveProject({ planner, entities }) {
  const { state } = planner
  const { projectId, projectName } = entities

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
      message: `Project «${projectName || 'specified'}» not found or already archived. Say the project name more clearly.`,
    }
  }

  if (targetProject.archived) {
    return {
      error: true,
      message: `Project «${targetProject.name}» is already archived.`,
    }
  }

  return {
    needsConfirmation: true,
    pendingData: {
      projectId: targetProject.id,
      projectName: targetProject.name,
    },
    message: `Archive project «${targetProject.name}»? It will move to the archived list.`,
  }
}

export function handleRestoreProject({ planner, entities }) {
  const { state, restoreProject } = planner
  const { projectId, projectName } = entities

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
      message: `Archived project «${projectName || 'specified'}» not found. Say the project name more clearly.`,
    }
  }

  if (!targetProject.archived) {
    return {
      error: true,
      message: `Project «${targetProject.name}» is already active.`,
    }
  }

  restoreProject(targetProject.id)
  return {
    success: true,
    message: `Project «${targetProject.name}» restored ✅`,
  }
}

export function handleCreateTask({ planner, entities, transcript }) {
  const { state } = planner
  const { taskInfo, projectId, projectName, collaboratorInfo } = entities

  if (!taskInfo?.title || taskInfo.title.trim().length === 0) {
    return {
      error: true,
      message: 'Task title missing. Say what task you want to create.',
    }
  }

  let targetProject = null
  const nameToMatch = taskInfo?.projectName || projectName
  if (nameToMatch) {
    targetProject = state.projects.find(
      (p) =>
        !p.archived &&
        p.name &&
        (p.name.toLowerCase().includes(nameToMatch.toLowerCase()) ||
          nameToMatch.toLowerCase().includes(p.name.toLowerCase()))
    )
  }
  if (!targetProject && taskInfo?.projectId && isUuid(taskInfo.projectId)) {
    targetProject = state.projects.find((p) => p.id === taskInfo.projectId && !p.archived)
  }
  if (!targetProject && projectId && isUuid(projectId)) {
    targetProject = state.projects.find((p) => p.id === projectId && !p.archived)
  }

  if (!targetProject) {
    return {
      error: true,
      message: `Project «${taskInfo?.projectName || projectName || 'specified'}» not found. Say the project name more clearly.`,
    }
  }

  let assigneeName = taskInfo?.assigneeName || null
  let assigneeId = taskInfo?.assigneeId || null

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

  if (!taskData.assigneeName) {
    taskData.missingFields.push('assignee')
  }
  if (!taskData.dueDate) {
    taskData.missingFields.push('dueDate')
  }
  if (!taskData.notes) {
    taskData.missingFields.push('notes')
  }

  if (taskData.missingFields.includes('assignee')) {
    return {
      needsConfirmation: false,
      pendingData: taskData,
      message: `Task «${taskData.title}» for project «${taskData.projectName}» is ready.\n\n⚠️ Missing: assignee. Assign to a collaborator? Say a name or "no".`,
      nextPhase: 'awaitingTaskAssignee',
    }
  } else if (taskData.missingFields.includes('dueDate')) {
    const assigneeText = taskData.assigneeName ? ` with «${taskData.assigneeName}»` : ''
    return {
      needsConfirmation: false,
      pendingData: taskData,
      message: `Task «${taskData.title}» for project «${taskData.projectName}»${assigneeText} is ready.\n\n⚠️ Missing: due date. Say a date or "no" to skip.`,
      nextPhase: 'awaitingTaskDate',
    }
  } else if (taskData.missingFields.includes('notes')) {
    const assigneeText = taskData.assigneeName ? ` with «${taskData.assigneeName}»` : ''
    const dueDateText = taskData.dueDate ? ` by ${taskData.dueDate}` : ''
    return {
      needsConfirmation: false,
      pendingData: taskData,
      message: `Task «${taskData.title}» for project «${taskData.projectName}»${assigneeText}${dueDateText} is ready.\n\n⚠️ Missing: notes. Say notes or "no" to skip.`,
      nextPhase: 'awaitingTaskNotes',
    }
  } else {
    const assigneeText = taskData.assigneeName ? ` with «${taskData.assigneeName}»` : ''
    const dueDateText = taskData.dueDate ? ` by ${taskData.dueDate}` : ''
    const notesText = taskData.notes ? `\nNotes: ${taskData.notes}` : ''
    return {
      needsConfirmation: true,
      pendingData: taskData,
      message: `Add task «${taskData.title}» to project «${taskData.projectName}»${assigneeText}${dueDateText}${notesText}?`,
    }
  }
}

export function handleUpdateTask({ planner: _planner, entities: _entities }) {
  return {
    error: true,
    message: 'Task update is not implemented yet.',
  }
}

export function handleToggleTaskDone({ planner: _planner, entities: _entities }) {
  return {
    error: true,
    message: 'Task toggle is not implemented yet.',
  }
}

function resolveMeetingParticipants(state, participantNames) {
  const participants = []
  if (!Array.isArray(participantNames) || participantNames.length === 0) return { participants, missingEmail: null }
  const list = state.collaborators || []
  for (const name of participantNames) {
    if (!name || typeof name !== 'string') continue
    const found = list.find(
      (c) =>
        c.name && (c.name.toLowerCase().includes(name.trim().toLowerCase()) || name.trim().toLowerCase().includes(c.name.toLowerCase()))
    )
    if (found) {
      participants.push({ id: found.id, name: found.name, email: found.email || null })
    }
  }
  const withoutEmail = participants.find((p) => !p.email || !p.email.trim())
  return { participants, missingEmail: withoutEmail ? withoutEmail.name : null }
}

export function handleCreateMeeting({ planner, entities }) {
  const { state } = planner
  const { meetingInfo = {} } = entities
  const title = meetingInfo.title || null
  const scheduledAt = meetingInfo.scheduledAt || null
  const projectName = meetingInfo.projectName || null
  const projectId = meetingInfo.projectId || null
  const durationMinutes = meetingInfo.durationMinutes != null ? Number(meetingInfo.durationMinutes) : 30
  const participantNames = meetingInfo.participantNames || null

  let resolvedProjectId = null
  if (projectName) {
    const found = state.projects.find(
      (p) =>
        p.name && p.name.toLowerCase().includes(projectName.toLowerCase())
    )
    if (found) resolvedProjectId = found.id
  }
  if (!resolvedProjectId && projectId && isUuid(projectId)) {
    const found = state.projects.find((p) => p.id === projectId)
    if (found) resolvedProjectId = found.id
  }
  const projectDisplay = projectName || (resolvedProjectId ? state.projects.find((p) => p.id === resolvedProjectId)?.name : null) || null

  const basePending = {
    projectId: resolvedProjectId || null,
    projectName: projectDisplay || null,
    scheduledAt: scheduledAt || new Date().toISOString().slice(0, 16),
    durationMinutes,
    participants: [],
  }

  const { participants, missingEmail } = resolveMeetingParticipants(state, participantNames)
  if (missingEmail) {
    return {
      error: true,
      message: `برای دعوت این همکار به جلسه در تقویم، لطفاً ایمیل «${missingEmail}» را در صفحه همکاران (Collaborators) ثبت کنید.`,
    }
  }
  basePending.participants = participants

  if (!resolvedProjectId && !projectName) {
    return {
      needsConfirmation: false,
      pendingData: { ...basePending, title: null },
      message: 'برای چه پروژه‌ای جلسه می‌خواهی؟ نام پروژه را بگو.',
      nextPhase: 'awaitingMeetingProject',
    }
  }

  if (!scheduledAt) {
    return {
      needsConfirmation: false,
      pendingData: { ...basePending, title: title && title.length >= 2 ? title.trim() : null },
      message: 'چه زمانی؟ مثلاً فردا ساعت ۱۰، یا یک تاریخ و ساعت.',
      nextPhase: 'awaitingMeetingWhen',
    }
  }

  if (!title || title.length < 2) {
    return {
      needsConfirmation: false,
      pendingData: { ...basePending, title: null },
      message: 'عنوان جلسه چیست؟',
      nextPhase: 'awaitingMeetingTitle',
    }
  }

  const scheduledAtIso = scheduledAt.length <= 10 ? `${scheduledAt}T09:00:00` : scheduledAt.replace(' ', 'T')
  const participantText = participants.length > 0 ? ` با دعوت: ${participants.map((p) => p.name).join(', ')}` : ''

  return {
    needsConfirmation: true,
    pendingData: {
      ...basePending,
      title: title.trim(),
      scheduledAt: scheduledAtIso,
      participants,
    },
    message: `جلسه «${title.trim()}»${projectDisplay ? ` برای پروژه «${projectDisplay}»` : ''} در ${scheduledAtIso.slice(0, 16)} (${durationMinutes} دقیقه)${participantText}. در تقویم اپ ذخیره می‌شود و اگر تقویم گوگل وصل باشد، برای شرکت‌کنندگان هم دعوتنامه ارسال می‌شود. تأیید می‌کنی؟`,
  }
}

export function handleNavigateToday({ navigate }) {
  navigate('/today')
  return {
    success: true,
    message: 'Going to Today...',
  }
}

export function handleNavigateProjects({ navigate }) {
  navigate('/projects')
  return {
    success: true,
    message: 'Going to Projects...',
  }
}

export function handleNavigateFinance({ navigate }) {
  navigate('/finance')
  return {
    success: true,
    message: 'Going to Finance...',
  }
}

