// api/projects/[id]/collaborators/[collaboratorId].js
// Remove a collaborator from a project (updates the project's collaborators JSONB array)
import { query } from '../../../../db.js';

export default async function handler(req, res) {
  const { id: projectId, collaboratorId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  if (!collaboratorId) {
    return res.status(400).json({ error: 'Collaborator ID is required' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Get current project
    const { rows: projectRows } = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectRows[0];

    // Parse existing collaborators array
    let collaborators = [];
    try {
      collaborators = Array.isArray(project.collaborators) 
        ? project.collaborators 
        : (project.collaborators ? JSON.parse(project.collaborators) : []);
    } catch (e) {
      collaborators = [];
    }

    // Remove collaborator
    const filtered = collaborators.filter(c => (c.collaboratorId || c.id) !== collaboratorId);
    
    if (filtered.length === collaborators.length) {
      return res.status(404).json({ error: 'Collaborator not found in project' });
    }

    // Update project
    const { rows } = await query(
      'UPDATE projects SET collaborators = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(filtered), projectId]
    );

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error removing collaborator from project:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

