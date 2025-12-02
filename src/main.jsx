
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { MantineProvider } from "@mantine/core"
import "@mantine/core/styles.css"
import "@mantine/dates/styles.css"
import "./index.css"
import App from "./App.jsx"
import { PlannerProvider } from "./state/PlannerContext.jsx"
import { FinanceProvider } from "./features/finance/FinanceContext.jsx"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="light" theme={{ fontFamily: "Inter, sans-serif" }}>
      <BrowserRouter>
        <PlannerProvider>
          <FinanceProvider>
          <App />
          </FinanceProvider>
        </PlannerProvider>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
)

