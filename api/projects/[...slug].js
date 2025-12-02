// api/projects/[...slug].js
// Catch-all route for all project operations with IDs
// Handles: /api/projects/:id, /api/projects/:id/archive, /api/projects/:id/collaborators, etc.
import { query } from '../db.js';

export default async function handler(req, res) {
  const slug = req.query.slug || [];
  const id = slug[0] || null;
  const action = slug[1] || null;
  const subId = slug[2] || null;

  try {
    // GET /api/projects/:id - Get single project
    if (req.method === 'GET' && id && !action) {
      const { rows } = await query('SELECT * FROM projects WHERE id = $1', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // PUT /api/projects/:id - Update project
    if (req.method === 'PUT' && id && !action) {
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
      } = req.body || {};

      const updateSql = `
        UPDATE projects 
        SET name = $1, status = $2, priority = $3, start_date = $4, due_date = $5, notes = $6, 
            client_name = $7, client_phone = $8, referred_by_name = $9, referred_by_phone = $10, updated_at = NOW()
        WHERE id = $11
        RETURNING *;
      `;
      const { rows } = await query(updateSql, [
        name,
        status,
        priority,
        startDate || null,
        dueDate || null,
        notes || null,
        clientName || null,
        clientPhone || null,
        referredByName || null,
        referredByPhone || null,
        id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // PATCH /api/projects/:id/archive - Archive project
    if (req.method === 'PATCH' && id && action === 'archive') {
      const { rows } = await query(
        'UPDATE projects SET archived = true, archived_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.status(200).json(rows[0]);
    }

    // PATCH /api/projects/:id/restore - Restore project
    if (req.method === 'PATCH' && id && action === 'restore') {
      const { rows } = await query(
        'UPDATE projects SET archived = false, archived_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.status(200).json(rows[0]);
    }

    // POST /api/projects/:id/collaborators - Add collaborator to project
    if (req.method === 'POST' && id && action === 'collaborators' && !subId) {
      const { rows: projectRows } = await query('SELECT * FROM projects WHERE id = $1', [id]);
      if (projectRows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projectRows[0];
      const { collaboratorId, responsibilities = [] } = req.body || {};

      if (!collaboratorId) {
        return res.status(400).json({ error: 'collaboratorId is required' });
      }

      const { rows: collaboratorRows } = await query('SELECT * FROM collaborators WHERE id = $1', [collaboratorId]);
      if (collaboratorRows.length === 0) {
        return res.status(404).json({ error: 'Collaborator not found' });
      }

      const collaborator = collaboratorRows[0];

      let collaborators = [];
      try {
        collaborators = Array.isArray(project.collaborators) 
          ? project.collaborators 
          : (project.collaborators ? JSON.parse(project.collaborators) : []);
      } catch (e) {
        collaborators = [];
      }

      const exists = collaborators.some(c => (c.collaboratorId || c.id) === collaboratorId);
      if (exists) {
        return res.status(400).json({ error: 'Collaborator already added to this project' });
      }

      const newCollaborator = {
        id: `proj-collab-${Date.now()}`,
        collaboratorId: collaborator.id,
        name: collaborator.name,
        role: collaborator.role || '',
        email: collaborator.email || '',
        phone: collaborator.phone || '',
        responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      };

      collaborators.push(newCollaborator);

      const { rows } = await query(
        'UPDATE projects SET collaborators = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [JSON.stringify(collaborators), id]
      );

      return res.status(200).json(rows[0]);
    }

    // DELETE /api/projects/:id/collaborators/:collaboratorId - Remove collaborator from project
    if (req.method === 'DELETE' && id && action === 'collaborators' && subId) {
      const { rows: projectRows } = await query('SELECT * FROM projects WHERE id = $1', [id]);
      if (projectRows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projectRows[0];

      let collaborators = [];
      try {
        collaborators = Array.isArray(project.collaborators) 
          ? project.collaborators 
          : (project.collaborators ? JSON.parse(project.collaborators) : []);
      } catch (e) {
        collaborators = [];
      }

      const filtered = collaborators.filter(c => (c.collaboratorId || c.id) !== subId);
      
      if (filtered.length === collaborators.length) {
        return res.status(404).json({ error: 'Collaborator not found in project' });
      }

      const { rows } = await query(
        'UPDATE projects SET collaborators = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [JSON.stringify(filtered), id]
      );

      return res.status(200).json(rows[0]);
    }

    // DELETE /api/projects/:id - Delete project
    if (req.method === 'DELETE' && id && !action) {
      const { rowCount } = await query('DELETE FROM projects WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.status(204).send();
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/projects/:id:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
