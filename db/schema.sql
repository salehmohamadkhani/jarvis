-- db/schema.sql
-- Run this file once in the Neon SQL editor to initialize the schema.
-- This creates all tables needed for the planner application.

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 3,
  start_date DATE,
  due_date DATE,
  notes TEXT,
  client_name TEXT,
  client_phone TEXT,
  referred_by_name TEXT,
  referred_by_phone TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  collaborators JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'todo',
  is_routine BOOLEAN NOT NULL DEFAULT FALSE,
  labels JSONB DEFAULT '[]'::jsonb,
  kind TEXT NOT NULL DEFAULT 'task',
  cost_amount DECIMAL(12, 2),
  notes TEXT,
  assignee_id UUID,
  assignee_name TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  participants JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Collaborators table
CREATE TABLE IF NOT EXISTS collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);


