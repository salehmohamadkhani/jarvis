import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Group, Paper, Stack, Text } from '@mantine/core'
import { usePlanner } from '../state/PlannerContext.jsx'

export default function SwipeableProjectCard({ project, tasksTotal, done, balance, tasks = [], onNavigate }) {
  const { archiveProject, restoreProject, deleteProject, toggleTask } = usePlanner()
  const navigate = useNavigate()
  const isArchived = project.archived
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const cardRef = useRef(null)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)

  const SWIPE_THRESHOLD = 100
  const MAX_SWIPE = 180 // Enough space for both buttons (56px each + 12px gap + padding)

  const getClientX = (e) => {
    if (e.touches && e.touches.length > 0) return e.touches[0].clientX
    if (e.clientX !== undefined) return e.clientX
    return 0
  }

  const handleStart = (e) => {
    setIsSwiping(true)
    const x = getClientX(e)
    startXRef.current = x
    currentXRef.current = x
  }

  const handleMove = (e) => {
    if (!isSwiping) return
    e.preventDefault()
    const x = getClientX(e)
    currentXRef.current = x
    const diff = startXRef.current - x
    
    if (diff > 0) {
      // Swiping left
      setSwipeOffset(Math.min(diff, MAX_SWIPE))
    } else {
      // Swiping right
      setSwipeOffset(Math.max(diff, -MAX_SWIPE))
    }
  }

  const handleEnd = () => {
    setIsSwiping(false)
    if (swipeOffset > SWIPE_THRESHOLD) {
      // Keep it open
      setSwipeOffset(MAX_SWIPE)
    } else {
      // Snap back
      setSwipeOffset(0)
    }
  }

  const handleArchive = (e) => {
    e.stopPropagation()
    if (isArchived) {
      restoreProject(project.id)
      // Navigate back to projects page after restore
      navigate('/projects')
    } else {
      archiveProject(project.id)
      // Navigate to archived projects page after archive
      navigate('/projects/archived')
    }
    setSwipeOffset(0)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      deleteProject(project.id)
    }
    setSwipeOffset(0)
  }

  const handleCardClick = (e) => {
    // Don't navigate if we just swiped
    if (Math.abs(swipeOffset) > 10) {
      setSwipeOffset(0)
      return
    }
    // Check if click was on a button or interactive element
    if (e.target.closest('button')) {
      return
    }
    onNavigate()
  }

  // Handle mouse move globally when swiping
  useEffect(() => {
    if (!isSwiping) return

    let currentOffset = swipeOffset

    const handleGlobalMouseMove = (e) => {
      e.preventDefault()
      const x = e.clientX
      const diff = startXRef.current - x
      
      if (diff > 0) {
        currentOffset = Math.min(diff, MAX_SWIPE)
      } else {
        currentOffset = Math.max(diff, -MAX_SWIPE)
      }
      setSwipeOffset(currentOffset)
    }

    const handleGlobalMouseUp = () => {
      setIsSwiping(false)
      if (currentOffset > SWIPE_THRESHOLD) {
        setSwipeOffset(MAX_SWIPE)
      } else {
        setSwipeOffset(0)
      }
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isSwiping])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target) && swipeOffset > 0) {
        setSwipeOffset(0)
      }
    }
    if (swipeOffset > 0) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [swipeOffset])

  return (
    <div
      ref={cardRef}
      className="swipeable-card-wrapper"
      style={{ position: 'relative', overflow: 'hidden' }}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
    >
      {/* Action buttons behind */}
      <div className="swipeable-actions">
        <button
          className="swipe-action-btn swipe-action-archive"
          onClick={handleArchive}
          aria-label={isArchived ? "Restore project" : "Archive project"}
        >
          <div className="swipe-action-icon-wrapper">
            {isArchived ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <path d="M5 8h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z" />
                <path d="M9 12h6" />
              </svg>
            )}
          </div>
        </button>
        <button
          className="swipe-action-btn swipe-action-delete"
          onClick={handleDelete}
          aria-label="Delete project"
        >
          <div className="swipe-action-icon-wrapper">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
        </button>
      </div>

      {/* Main card */}
      <Paper
        className="project-summary-card"
        onClick={handleCardClick}
        radius="xl"
        withBorder
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          zIndex: 2,
          willChange: 'transform',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <Stack gap={4}>
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text fw={700}>{project.name}</Text>
              <Group gap={8}>
                <Badge size="sm" radius="xl" variant="light">
                  {project.status}
                </Badge>
                <Text size="sm" c="dimmed">
                  اولویت {project.priority}
                </Text>
              </Group>
            </Stack>
            <Stack gap={0} align="flex-end">
              <Text size="sm" c="dimmed">
                تسک‌ها
              </Text>
              <Text fw={600}>
                {done}/{tasksTotal}
              </Text>
            </Stack>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              موجودی
            </Text>
            <Text fw={600} c={balance >= 0 ? "teal" : "red"}>
              {balance >= 0 ? "+" : "-"}
              {Math.abs(balance).toLocaleString()} تومان
            </Text>
          </Group>
          
          {/* نمایش تسک‌ها */}
          {tasks && tasks.length > 0 && (
            <Stack gap={8} mt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)', paddingTop: '12px' }}>
              <Text size="sm" fw={600} c="dimmed">
                تسک‌ها ({done}/{tasksTotal})
              </Text>
              <Stack gap={6}>
                {tasks.slice(0, 3).map((task) => (
                  <Group key={task.id} gap="xs" align="flex-start" wrap="nowrap">
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleTask(task.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} style={{ wordBreak: 'break-word' }}>
                        {task.title}
                      </Text>
                      <Group gap={8} wrap="wrap">
                        <Badge size="xs" variant="light" color={task.status === 'done' ? 'green' : task.status === 'doing' ? 'blue' : 'gray'}>
                          {task.status === 'done' ? 'انجام شده' : task.status === 'doing' ? 'در حال انجام' : 'در انتظار'}
                        </Badge>
                        {task.priority && (
                          <Badge size="xs" variant="light" color="orange">
                            اولویت {task.priority}
                          </Badge>
                        )}
                        {task.assignedTo && (
                          <Text size="xs" c="dimmed">
                            مسئول: {task.assignedTo}
                          </Text>
                        )}
                        {task.dueAt && (
                          <Text size="xs" c="dimmed">
                            {new Date(task.dueAt).toLocaleDateString('fa-IR')}
                          </Text>
                        )}
                      </Group>
                    </Stack>
                  </Group>
                ))}
                {tasks.length > 3 && (
                  <Text size="xs" c="dimmed" style={{ textAlign: 'center', paddingTop: '4px' }}>
                    و {tasks.length - 3} تسک دیگر...
                  </Text>
                )}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Paper>
    </div>
  )
}

