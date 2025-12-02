
import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { usePlanner } from "../state/PlannerContext.jsx"
import { useFinance } from "../features/finance/FinanceContext.jsx"
import ProjectCard from "../components/ProjectCard.jsx"
import ProjectInfoCard from "../components/ProjectInfoCard.jsx"
import ProjectHeader from "../components/project/ProjectHeader.jsx"
import ProjectFinanceMini from "../components/project/ProjectFinanceMini.jsx"
import { DSPage, DSButton, DSCard, DSSection } from "../design-system"

export default function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = usePlanner()
  const { state: financeState } = useFinance()
  const project = useMemo(() => state.projects.find((p) => String(p.id) === String(id)), [state.projects, id])

  const balance = useMemo(() => {
    if (!project) return 0
    const transactions = (financeState.transactions || []).filter(t => t.projectId === project.id)
    const income = transactions.filter(t => t.type === 'income').reduce((a, b) => a + (Number(b.money?.amount || b.amount) || 0), 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + (Number(b.money?.amount || b.amount) || 0), 0)
    return income - expense
  }, [project, financeState.transactions])

  if (!project) {
    return (
      <DSPage title="Project">
        <DSCard className="ds-error-card">
          <div className="ds-error-content">
            <h3>Project not found</h3>
            <p>The project you are looking for does not exist.</p>
            <DSButton onClick={() => navigate(-1)}>
              Back
            </DSButton>
          </div>
        </DSCard>
      </DSPage>
    )
  }

  return (
    <DSPage 
      title="Project"
      actions={<DSButton variant="secondary" onClick={() => navigate(-1)}>← Back to projects</DSButton>}
    >
      <ProjectHeader project={project} balance={balance} />

      <div className="today-grid">
        <ProjectFinanceMini projectId={project.id} />
      </div>

      <div className="ds-page-spacer">
        <ProjectInfoCard project={project} />
        <ProjectCard project={project} />
      </div>
    </DSPage>
  )
}

