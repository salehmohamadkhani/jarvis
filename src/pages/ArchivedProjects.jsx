import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { usePlanner } from "../state/PlannerContext.jsx"
import SwipeableProjectCard from "../components/SwipeableProjectCard.jsx"
import { DSPage, DSButton, DSCard } from "../design-system"

export default function ArchivedProjects() {
  const { state } = usePlanner()
  const navigate = useNavigate()

  const summaries = useMemo(() => {
    return state.projects
      .filter((p) => p.archived)
      .map((project) => {
        const tasks = state.tasks.filter((t) => t.projectId === project.id && t.costAmount === null && !t.archived)
        const done = tasks.filter((t) => t.status === 'done').length
        const finances = state.tasks.filter((t) => t.projectId === project.id && t.costAmount !== null)
        const balance = finances.reduce((acc, entry) => acc + (entry.costAmount ?? 0), 0)
        return { project, tasksTotal: tasks.length, done, balance }
      })
  }, [state.projects, state.tasks])

  return (
    <DSPage
      title="Archived Projects"
      actions={
        <DSButton variant="secondary" onClick={() => navigate('/projects')}>
          Back to Projects
        </DSButton>
      }
    >
      <div className="projects-grid">
        {summaries.length === 0 ? (
          <DSCard className="ds-empty-state">
            <div className="ds-empty-state-content">
              <p className="ds-empty-state-text">No archived projects yet.</p>
              <DSButton onClick={() => navigate('/projects')}>
                Back to Projects
              </DSButton>
            </div>
          </DSCard>
        ) : (
          summaries.map(({ project, tasksTotal, done, balance }) => (
            <SwipeableProjectCard
              key={project.id}
              project={project}
              tasksTotal={tasksTotal}
              done={done}
              balance={balance}
              onNavigate={() => navigate(`/projects/${project.id}`)}
            />
          ))
        )}
      </div>
    </DSPage>
  )
}

