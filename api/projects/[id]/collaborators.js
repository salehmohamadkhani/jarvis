// api/projects/[id]/collaborators.js
// Add a collaborator to a project (updates the project's collaborators JSONB array)
import { query } from '../../../db.js';

export default async function handler(req, res) {
  const { id: projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Get current project
    const { rows: projectRows } = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectRows[0];
    const { collaboratorId, responsibilities = [] } = req.body || {};

    if (!collaboratorId) {
      return res.status(400).json({ error: 'collaboratorId is required' });
    }

    // Get collaborator details
    const { rows: collaboratorRows } = await query('SELECT * FROM collaborators WHERE id = $1', [collaboratorId]);
    if (collaboratorRows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }

    const collaborator = collaboratorRows[0];

    // Parse existing collaborators array
    let collaborators = [];
    try {
      collaborators = Array.isArray(project.collaborators) 
        ? project.collaborators 
        : (project.collaborators ? JSON.parse(project.collaborators) : []);
    } catch (e) {
      collaborators = [];
    }

    // Check if collaborator already exists
    const exists = collaborators.some(c => (c.collaboratorId || c.id) === collaboratorId);
    if (exists) {
      return res.status(400).json({ error: 'Collaborator already added to this project' });
    }

    // Add new collaborator
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

    // Update project
    const { rows } = await query(
      'UPDATE projects SET collaborators = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(collaborators), projectId]
    );

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error adding collaborator to project:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

