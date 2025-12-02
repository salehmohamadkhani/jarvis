import { Navigate, Route, Routes } from "react-router-dom"
import { usePlanner } from "./state/PlannerContext.jsx"
import Layout from "./components/Layout.jsx"
import LoadingScreen from "./components/LoadingScreen.jsx"
import ErrorScreen from "./components/ErrorScreen.jsx"
import Assistant from "./pages/Assistant.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Today from "./pages/Today.jsx"
import Projects from "./pages/Projects.jsx"
import ArchivedProjects from "./pages/ArchivedProjects.jsx"
import Finance from "./pages/Finance.jsx"
import Settings from "./pages/Settings.jsx"
import Collaborators from "./pages/Collaborators.jsx"
import ProjectDetails from "./pages/ProjectDetails.jsx"
import More from "./pages/More.jsx"

function App() {
  const { state, loadData } = usePlanner()

  // Show loading screen while data is loading
  if (state.loading) {
    return <LoadingScreen />
  }

  // Show error screen if there's an error
  if (state.error) {
    return <ErrorScreen error={state.error} onRetry={loadData} />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Assistant />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/today" element={<Today />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/archived" element={<ArchivedProjects />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/collaborators" element={<Collaborators />} />
        <Route path="/more" element={<More />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App

