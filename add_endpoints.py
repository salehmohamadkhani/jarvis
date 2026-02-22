#!/usr/bin/env python3
# Script to add API endpoints to server.js

import sys

# Read server.js
with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace simple GET endpoint with full implementation
old = """app.get('/api/projects', (req, res) => {
  res.json([]);
});"""

new = """app.get('/api/projects', async (req, res) => {
  try {
    const archived = req.query.archived === 'true';
    const result = await pool.query(
      'SELECT * FROM projects WHERE archived = $1 ORDER BY created_at DESC',
      [archived]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
app.post('/api/projects', async (req, res) => {
  try {
    const {
      name,
      status = 'active',
      priority = 3,
      startDate,
      dueDate,
      notes,
      clientName,
      clientPhone,
      referredByName,
      referredByPhone,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO projects (name, status, priority, start_date, due_date, notes, client_name, client_phone, referred_by_name, referred_by_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, status, priority, startDate || null, dueDate || null, notes || null, clientName || null, clientPhone || null, referredByName || null, referredByPhone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const {
      name,
      status,
      priority,
      startDate,
      dueDate,
      notes,
      clientName,
      clientPhone,
      referredByName,
      referredByPhone,
    } = req.body;

    const result = await pool.query(
      `UPDATE projects 
       SET name = $1, status = $2, priority = $3, start_date = $4, due_date = $5, notes = $6, 
           client_name = $7, client_phone = $8, referred_by_name = $9, referred_by_phone = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [name, status, priority, startDate || null, dueDate || null, notes || null, clientName || null, clientPhone || null, referredByName || null, referredByPhone || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Archive project
app.patch('/api/projects/:id/archive', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE projects SET archived = true, archived_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({ error: 'Failed to archive project' });
  }
});

// Restore project
app.patch('/api/projects/:id/restore', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE projects SET archived = false, archived_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error restoring project:', error);
    res.status(500).json({ error: 'Failed to restore project' });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});"""

content = content.replace(old, new)

# Write back
with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Projects endpoints added')
