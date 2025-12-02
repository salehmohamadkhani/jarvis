import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  projectsApi,
  tasksApi,
  meetingsApi,
  collaboratorsApi,
  healthCheck,
} from '../api/plannerApi'

const PlannerContext = createContext()

// State management with API integration
export function PlannerProvider({ children }) {
  const [state, setState] = useState({
    projects: [],
    tasks: [],
    meetings: [],
    collaborators: [],
    loading: true,
    error: null,
  })

  // Load all data from API on mount
  const loadData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      // Check API health first
      const health = await healthCheck()
      if (!health.ok || health.database !== 'connected') {
        throw new Error('Database connection failed')
      }

      // Load all data in parallel
      const [projects, tasks, meetings, collaborators] = await Promise.all([
        projectsApi.getAll(false), // Only active projects initially
        tasksApi.getAll({ archived: false }),
        meetingsApi.getAll(),
        collaboratorsApi.getAll(),
      ])

      setState({
        projects,
        tasks,
        meetings,
        collaborators,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Failed to load data:', error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load data',
      }))
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const value = useMemo(() => {
    // Projects
    const addProject = async (input) => {
      try {
        const newProject = await projectsApi.create({
          name: input.name,
          status: input.status || 'active',
          priority: input.priority || 3,
          startDate: input.startDate || new Date().toISOString().split('T')[0],
          dueDate: input.dueDate || null,
          notes: input.notes || '',
          clientName: input.clientName || '',
          clientPhone: input.clientPhone || '',
          referredByName: input.referredByName || '',
          referredByPhone: input.referredByPhone || '',
        })
        setState((prev) => ({
          ...prev,
          projects: [...prev.projects, newProject],
        }))
        return newProject
      } catch (error) {
        console.error('Failed to create project:', error)
        throw error
      }
    }

    const updateProject = async (id, updates) => {
      try {
        const updated = await projectsApi.update(id, updates)
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((p) => (p.id === id ? updated : p)),
        }))
        return updated
      } catch (error) {
        console.error('Failed to update project:', error)
        throw error
      }
    }

    const archiveProject = async (id) => {
      try {
        const updated = await projectsApi.archive(id)
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((p) => (p.id === id ? updated : p)),
        }))
        return updated
      } catch (error) {
        console.error('Failed to archive project:', error)
        throw error
      }
    }

    const restoreProject = async (id) => {
      try {
        const updated = await projectsApi.restore(id)
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((p) => (p.id === id ? updated : p)),
        }))
        return updated
      } catch (error) {
        console.error('Failed to restore project:', error)
        throw error
      }
    }

    const deleteProject = async (id) => {
      try {
        await projectsApi.delete(id)
        setState((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p.id !== id),
          tasks: prev.tasks.filter((t) => t.projectId !== id),
          meetings: prev.meetings.filter((m) => m.projectId !== id),
        }))
      } catch (error) {
        console.error('Failed to delete project:', error)
        throw error
      }
    }

    // Tasks
    const addTask = async (input) => {
      try {
        const newTask = await tasksApi.create({
          projectId: input.projectId || null,
          title: input.title,
          description: input.description || '',
          dueAt: input.dueAt || null,
          priority: input.priority || 3,
          status: input.status || 'todo',
          isRoutine: input.isRoutine || false,
          labels: input.labels || input.tags || [],
          kind: input.kind || 'task',
          costAmount: input.costAmount || null,
          notes: input.notes || '',
          assigneeId: input.assigneeId || null,
        })
        setState((prev) => ({
          ...prev,
          tasks: [...prev.tasks, newTask],
        }))
        return newTask
      } catch (error) {
        console.error('Failed to create task:', error)
        throw error
      }
    }

    const updateTask = async (id, updates) => {
      try {
        const updated = await tasksApi.update(id, updates)
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? updated : t)),
        }))
        return updated
      } catch (error) {
        console.error('Failed to update task:', error)
        throw error
      }
    }

    const toggleTask = async (id) => {
      try {
        const updated = await tasksApi.toggle(id)
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? updated : t)),
        }))
        return updated
      } catch (error) {
        console.error('Failed to toggle task:', error)
        throw error
      }
    }

    const archiveTask = async (id) => {
      try {
        const updated = await tasksApi.archive(id)
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? updated : t)),
        }))
        return updated
      } catch (error) {
        console.error('Failed to archive task:', error)
        throw error
      }
    }

    const unarchiveTask = async (id) => {
      try {
        const updated = await tasksApi.update(id, { archived: false })
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? { ...t, archived: false } : t)),
        }))
        return updated
      } catch (error) {
        console.error('Failed to unarchive task:', error)
        throw error
      }
    }

    // Meetings
    const addMeeting = async (input) => {
      try {
        const newMeeting = await meetingsApi.create({
          projectId: input.projectId || null,
          title: input.title,
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes || null,
          participants: input.participants || [],
          notes: input.notes || '',
        })
        setState((prev) => ({
          ...prev,
          meetings: [...prev.meetings, newMeeting],
        }))
        return newMeeting
      } catch (error) {
        console.error('Failed to create meeting:', error)
        throw error
      }
    }

    // Collaborators
    const addCollaborator = async (input) => {
      try {
        const newCollaborator = await collaboratorsApi.create({
          name: input.name,
          role: input.role || '',
          email: input.email || '',
          phone: input.phone || '',
        })
        setState((prev) => ({
          ...prev,
          collaborators: [...prev.collaborators, newCollaborator],
        }))
        return newCollaborator
      } catch (error) {
        console.error('Failed to create collaborator:', error)
        throw error
      }
    }

    const updateCollaborator = async (id, updates) => {
      try {
        const updated = await collaboratorsApi.update(id, updates)
        setState((prev) => ({
          ...prev,
          collaborators: prev.collaborators.map((c) => (c.id === id ? updated : c)),
        }))
        return updated
      } catch (error) {
        console.error('Failed to update collaborator:', error)
        throw error
      }
    }

    const deleteCollaborator = async (id) => {
      try {
        await collaboratorsApi.delete(id)
        setState((prev) => ({
          ...prev,
          collaborators: prev.collaborators.filter((c) => c.id !== id),
        }))
      } catch (error) {
        console.error('Failed to delete collaborator:', error)
        throw error
      }
    }

    return {
      state,
      loadData,
      // Projects
      addProject,
      updateProject,
      archiveProject,
      restoreProject,
      deleteProject,
      // Tasks
      addTask,
      updateTask,
      toggleTask,
      archiveTask,
      unarchiveTask,
      // Meetings
      addMeeting,
      // Collaborators
      addCollaborator,
      updateCollaborator,
      deleteCollaborator,
    }
  }, [state, loadData])

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}

export function usePlanner() {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be used inside PlannerProvider')
  return ctx
}
