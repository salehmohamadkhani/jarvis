# Jarvis — AI Agent Guide

## What is Jarvis?

Jarvis is an AI-powered freelance project and finance operating system. It helps freelancers, small teams, and AI-assisted builders manage projects, tasks, meetings, collaborators, and financial records through a modern web interface with an intelligent assistant.

## Current Phase

**Phase 01 — Foundation Fix, Stabilization, Documentation, and Safe GitHub Presentation**

We are fixing critical bugs, adding essential documentation, and preparing the repository for public presentation. We are NOT building new features in this phase.

## Tech Stack

- **Frontend**: React 19, React Router 7, Vite 7, Mantine UI 8
- **Backend**: Node.js, Express 4 (single server.js, no separate route files)
- **Database**: PostgreSQL (production), PGlite (embedded development)
- **AI/LLM**: Ollama (local) or any OpenAI-compatible API
- **STT**: Whisper (Docker) or Web Speech API
- **Build**: Vite (frontend), single server.js (backend)
- **Package Manager**: npm

## Key Architecture Notes

- Single-page application (SPA) with React Router client-side routing
- Express server serves both the API (under `/api/*`) and the built frontend static files
- State management: React Context (`PlannerContext`) for main data, `useReducer` (`FinanceContext`) for finance (frontend-only, no persistence)
- API client: Custom `apiCall` wrapper in `src/api/plannerApi.js`
- Database queries are inline in `server.js` (no ORM)
- Schema is in `db/schema.sql` — one-time apply to any PostgreSQL-compatible database

## Safe Working Rules

1. **Before every change, inspect related files first** — read the current content, understand the context, then edit.

2. **Never modify `FinanceContext.jsx` or finance persistence** during Phase 01. Finance is frontend-only and known to be a UI prototype. Document the limitation, don't try to fix it yet.

3. **Never commit secrets**: `.env.local`, `.env`, credentials files, or any files containing real API keys must never be committed. The `.gitignore` already excludes `.env.*` except `.env.example`.

4. **Never force push**: Always create branches, push normally.

5. **Never push directly to main**: Work on feature/fix branches.

6. **Build verification is mandatory**: Before any commit, run `npm run build` and confirm it passes. If it fails, fix the issue first.

7. **Lint verification preferred**: Run `npm run lint` before committing. Fix reasonable lint issues. Document any remaining lint noise.

8. **Do NOT redesign the UI in Phase 01**: Fix only obvious typos, broken classes, and accessibility labels. Note larger UI issues for future phases.

9. **Do NOT build new features in Phase 01**: No Finance v2, no Assistant v2, no Dashboard v2, no redesigns. This phase is about stabilization and documentation only.

10. **When in doubt, ask**: If you're unsure whether a change is appropriate for the current phase, leave it for a future phase and document it in ROADMAP.md.

## Verification Before Pushing

1. Run `npm run lint` (document any failures)
2. Run `npm run build` (must pass)
3. Run `node scripts/check-health.mjs` (optional, if server is running)
4. Review git status and diff
5. Confirm no secrets are staged
6. Commit on a non-main branch
7. Push to GitHub

## Build Output

- `npm run build` produces the frontend bundle in `dist/`
- `npm start` (or `node server.js`) serves both API and frontend from the same port
- The server falls back to `dist/index.html` for all non-API routes (SPA support)
