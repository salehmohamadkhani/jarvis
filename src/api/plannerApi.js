const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || '/api';

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({ error: response.statusText }))
      const msg = errBody.details ? `${errBody.error || response.statusText}: ${errBody.details}` : (errBody.error || `HTTP error! status: ${response.status}`)
      throw new Error(msg)
    }

    return await response.json()
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error)
    throw error
  }
}

function transformProject(row) {
  return {
    id: String(row.id),
    name: row.name,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date ? row.start_date.split('T')[0] : null,
    dueDate: row.due_date ? row.due_date.split('T')[0] : null,
    notes: row.notes || '',
    clientName: row.client_name || '',
    clientPhone: row.client_phone || '',
    referredByName: row.referred_by_name || '',
    referredByPhone: row.referred_by_phone || '',
    archived: row.archived || false,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    collaborators: row.collaborators || [],
  }
}

function transformTask(row) {
  return {
    id: String(row.id),
    projectId: row.project_id ? String(row.project_id) : null,
    title: row.title,
    description: row.description || '',
    dueAt: row.due_at || null,
    priority: row.priority,
    status: row.status,
    isRoutine: row.is_routine || false,
    labels: row.labels || [],
    kind: row.kind || 'task',
    costAmount: row.cost_amount ? parseFloat(row.cost_amount) : null,
    notes: row.notes || '',
    assigneeId: row.assignee_id ? String(row.assignee_id) : null,
    assigneeName: row.assignee_name || null,
    archived: row.archived || false,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: row.labels || [],
  }
}

function transformMeeting(row) {
  return {
    id: String(row.id),
    projectId: row.project_id ? String(row.project_id) : null,
    title: row.title,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes || null,
    participants: row.participants || [],
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    htmlLink: row.html_link || row.htmlLink || null,
  }
}

function transformCollaborator(row) {
  return {
    id: String(row.id),
    name: row.name,
    role: row.role || '',
    email: row.email || '',
    phone: row.phone || '',
    telegramId: row.telegram_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const projectsApi = {
  getAll: async (archived = false) => {
    const params = archived !== undefined ? `?archived=${archived}` : ''
    const rows = await apiCall(`/projects${params}`)
    return rows.map(transformProject)
  },

  getById: async (id) => {
    const row = await apiCall(`/projects/${id}`)
    return transformProject(row)
  },

  create: async (data) => {
    const payload = {
      name: data.name,
      status: data.status || 'active',
      priority: data.priority || 3,
      startDate: data.startDate || null,
      dueDate: data.dueDate || null,
      notes: data.notes || null,
      clientName: data.clientName || null,
      clientPhone: data.clientPhone || null,
      referredByName: data.referredByName || null,
      referredByPhone: data.referredByPhone || null,
    }
    const row = await apiCall('/projects', { method: 'POST', body: payload })
    return transformProject(row)
  },

  update: async (id, updates) => {
    const payload = {
      name: updates.name,
      status: updates.status,
      priority: updates.priority,
      startDate: updates.startDate,
      dueDate: updates.dueDate,
      notes: updates.notes,
      clientName: updates.clientName,
      clientPhone: updates.clientPhone,
      referredByName: updates.referredByName,
      referredByPhone: updates.referredByPhone,
    }
    const row = await apiCall(`/projects/${id}`, { method: 'PUT', body: payload })
    return transformProject(row)
  },

  archive: async (id) => {
    const row = await apiCall(`/projects/${id}/archive`, { method: 'PATCH' })
    return transformProject(row)
  },

  restore: async (id) => {
    const row = await apiCall(`/projects/${id}/restore`, { method: 'PATCH' })
    return transformProject(row)
  },

  delete: async (id) => {
    await apiCall(`/projects/${id}`, { method: 'DELETE' })
  },

  addCollaborator: async (projectId, collaboratorId, responsibilities = []) => {
    await apiCall(`/projects/${projectId}/collaborators`, {
      method: 'POST',
      body: { collaboratorId, responsibilities },
    })
  },

  removeCollaborator: async (projectId, collaboratorId) => {
    await apiCall(`/projects/${projectId}/collaborators/${collaboratorId}`, {
      method: 'DELETE',
    })
  },
}

export const tasksApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.projectId) params.append('projectId', filters.projectId)
    if (filters.status) params.append('status', filters.status)
    if (filters.archived !== undefined) params.append('archived', filters.archived)

    const query = params.toString()
    const rows = await apiCall(`/tasks${query ? `?${query}` : ''}`)
    return rows.map(transformTask)
  },

  getById: async (id) => {
    const row = await apiCall(`/tasks/${id}`)
    return transformTask(row)
  },

  create: async (data) => {
    const payload = {
      projectId: data.projectId != null ? String(data.projectId) : null,
      title: (data.title && String(data.title).trim()) || '',
      description: data.description || null,
      dueAt: data.dueAt || null,
      priority: data.priority ?? 3,
      status: data.status || 'todo',
      isRoutine: data.isRoutine || false,
      labels: data.labels || [],
      kind: data.kind || 'task',
      costAmount: data.costAmount ?? null,
      notes: data.notes || null,
      assigneeId: data.assigneeId != null ? String(data.assigneeId) : null,
    }
    const row = await apiCall('/tasks', { method: 'POST', body: payload })
    return transformTask(row)
  },

  update: async (id, updates) => {
    const payload = {
      title: updates.title,
      description: updates.description,
      dueAt: updates.dueAt,
      priority: updates.priority,
      status: updates.status,
      isRoutine: updates.isRoutine,
      labels: updates.labels,
      kind: updates.kind,
      costAmount: updates.costAmount,
      notes: updates.notes,
      assigneeId: updates.assigneeId != null && updates.assigneeId !== '' ? String(updates.assigneeId) : null,
    }
    const row = await apiCall(`/tasks/${id}`, { method: 'PUT', body: payload })
    return transformTask(row)
  },

  toggle: async (id) => {
    const row = await apiCall(`/tasks/${id}/toggle`, { method: 'PATCH' })
    return transformTask(row)
  },

  archive: async (id) => {
    const row = await apiCall(`/tasks/${id}/archive`, { method: 'PATCH' })
    return transformTask(row)
  },

  delete: async (id) => {
    await apiCall(`/tasks/${id}`, { method: 'DELETE' })
  },
}

export const meetingsApi = {
  getAll: async (projectId = null) => {
    const params = projectId ? `?projectId=${projectId}` : ''
    const rows = await apiCall(`/meetings${params}`)
    return rows.map(transformMeeting)
  },

  getById: async (id) => {
    const row = await apiCall(`/meetings/${id}`)
    return transformMeeting(row)
  },

  create: async (data) => {
    const payload = {
      projectId: data.projectId != null && data.projectId !== '' ? String(data.projectId) : null,
      title: data.title,
      scheduledAt: data.scheduledAt,
      durationMinutes: data.durationMinutes || null,
      participants: data.participants || [],
      notes: data.notes || null,
    }
    const row = await apiCall('/meetings', { method: 'POST', body: payload })
    return transformMeeting(row)
  },

  update: async (id, updates) => {
    const payload = {
      title: updates.title,
      scheduledAt: updates.scheduledAt,
      durationMinutes: updates.durationMinutes,
      participants: updates.participants,
      notes: updates.notes,
    }
    const row = await apiCall(`/meetings/${id}`, { method: 'PUT', body: payload })
    return transformMeeting(row)
  },

  delete: async (id) => {
    await apiCall(`/meetings/${id}`, { method: 'DELETE' })
  },
}

export const collaboratorsApi = {
  getAll: async () => {
    const rows = await apiCall('/collaborators')
    return rows.map(transformCollaborator)
  },

  getById: async (id) => {
    const row = await apiCall(`/collaborators/${id}`)
    return transformCollaborator(row)
  },

  create: async (data) => {
    const payload = {
      name: data.name,
      role: data.role || null,
      email: data.email || null,
      phone: data.phone || null,
      telegramId: data.telegramId || null,
    }
    const row = await apiCall('/collaborators', { method: 'POST', body: payload })
    return transformCollaborator(row)
  },

  update: async (id, updates) => {
    const payload = {
      name: updates.name,
      role: updates.role,
      email: updates.email,
      phone: updates.phone,
      telegramId: updates.telegramId,
    }
    const row = await apiCall(`/collaborators/${id}`, { method: 'PUT', body: payload })
    return transformCollaborator(row)
  },

  delete: async (id) => {
    await apiCall(`/collaborators/${id}`, { method: 'DELETE' })
  },
}

export async function healthCheck() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);

    if (!res.ok) {
      throw new Error('Database connection failed');
    }

    const data = await res.json();
    // Accept multiple response shapes for resilience
    const isHealthy = data.ok === true || data.status === 'ok' || data.database === 'connected';
    if (!isHealthy) {
      throw new Error('Database connection failed');
    }

    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    throw new Error('Database connection failed');
  }
}




