
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
    <MantineProvider
      defaultColorScheme="dark"
      theme={{
        fontFamily: "Inter, sans-serif",
        dir: "rtl",
        primaryColor: "violet",
        colors: {
          dark: [
            "#0a0a0f",
            "#0f0f18",
            "#12121c",
            "#161625",
            "#1a1a2a",
            "#1a1a2e",
            "#555770",
            "#8b8fa3",
            "#eef0f6",
            "#ffffff",
          ],
        },
      }}
    >
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

