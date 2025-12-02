import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePlanner } from "../state/PlannerContext.jsx"
import AddProjectModal from "../components/AddProjectModal.jsx"
import SwipeableProjectCard from "../components/SwipeableProjectCard.jsx"
import { DSPage, DSButton, DSCard } from "../design-system"

export default function Projects() {
  const { state } = usePlanner()
  const navigate = useNavigate()
  const [isAddProjectOpen, setAddProjectOpen] = useState(false)

  const summaries = useMemo(() => {
    return state.projects
      .filter((p) => !p.archived)
      .map((project) => {
        const tasks = state.tasks.filter((t) => t.projectId === project.id && t.costAmount === null && !t.archived)
        const done = tasks.filter((t) => t.status === 'done').length
        const finances = state.tasks.filter((t) => t.projectId === project.id && t.costAmount !== null)
        const balance = finances.reduce((acc, entry) => acc + (entry.costAmount ?? 0), 0)
        return { project, tasksTotal: tasks.length, done, balance, tasks }
      })
  }, [state.projects, state.tasks])

  return (
    <DSPage
      title="پروژه‌ها"
      actions={
        <>
          <DSButton variant="secondary" onClick={() => navigate('/projects/archived')}>
            بایگانی شده
          </DSButton>
          <DSButton onClick={() => setAddProjectOpen(true)}>
            افزودن پروژه
          </DSButton>
        </>
      }
    >

      <div className="projects-grid">
        {summaries.length === 0 ? (
          <DSCard className="ds-empty-state">
            <div className="ds-empty-state-content">
              <p className="ds-empty-state-text">هنوز پروژه‌ای وجود ندارد. اولین پروژه خود را بسازید!</p>
              <DSButton onClick={() => setAddProjectOpen(true)}>
                افزودن پروژه
              </DSButton>
            </div>
          </DSCard>
        ) : (
          summaries.map(({ project, tasksTotal, done, balance, tasks }) => (
            <SwipeableProjectCard
              key={project.id}
              project={project}
              tasksTotal={tasksTotal}
              done={done}
              balance={balance}
              tasks={tasks}
              onNavigate={() => navigate(`/projects/${project.id}`)}
            />
          ))
        )}
      </div>

      <AddProjectModal opened={isAddProjectOpen} onClose={() => setAddProjectOpen(false)} />
    </DSPage>
  )
}
