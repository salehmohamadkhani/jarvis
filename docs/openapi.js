/**
 * OpenAPI 3.0 spec for Jarvis Planner API.
 * Used by Swagger UI at /api/docs and raw JSON at /api/openapi.json (for mobile/external clients).
 */
export default {
  openapi: '3.0.3',
  info: {
    title: 'Jarvis Planner API',
    description: 'API for the planner app and voice assistant. Get API version from GET /api/version.',
    version: '1.0.0',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'health', description: 'Service health' },
    { name: 'projects', description: 'Projects' },
    { name: 'tasks', description: 'Tasks' },
    { name: 'meetings', description: 'Meetings' },
    { name: 'collaborators', description: 'Collaborators' },
    { name: 'voice', description: 'Voice & Chat (STT/Chat)' },
  ],
  paths: {
    '/api/version': {
      get: {
        tags: ['health'],
        summary: 'API version',
        responses: { 200: { description: 'API version', content: { 'application/json': { schema: { type: 'object', properties: { apiVersion: { type: 'string' } } } } } } },
      },
    },
    '/api/health': {
      get: {
        tags: ['health'],
        summary: 'Health check',
        parameters: [
          {
            name: 'llm',
            in: 'query',
            schema: { type: 'string', enum: ['1'] },
            description: 'If 1, response includes llm (Ollama vs LLM_MODEL)',
          },
        ],
        responses: { 200: { description: 'OK + database status; optional llm' } },
      },
    },
    '/api/projects': {
      get: {
        tags: ['projects'],
        summary: 'List projects',
        parameters: [{ name: 'archived', in: 'query', schema: { type: 'boolean' } }],
        responses: { 200: { description: 'List of projects' } },
      },
      post: {
        tags: ['projects'],
        summary: 'Create project',
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/projects/{id}': {
      get: { tags: ['projects'], summary: 'Get project', parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {}, 404: {} } },
      put: { tags: ['projects'], summary: 'Update project', parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {}, 404: {} } },
      delete: { tags: ['projects'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {}, 404: {} } },
    },
    '/api/projects/{id}/archive': {
      patch: { tags: ['projects'], summary: 'Archive project', parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {} } },
    },
    '/api/projects/{id}/restore': {
      patch: { tags: ['projects'], summary: 'Restore from archive', parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {} } },
    },
    '/api/tasks': {
      get: { tags: ['tasks'], summary: 'List tasks', parameters: [{ name: 'projectId', in: 'query' }, { name: 'archived', in: 'query' }], responses: { 200: {} } },
      post: { tags: ['tasks'], summary: 'Create task', requestBody: {}, responses: { 201: {} } },
    },
    '/api/tasks/{id}': {
      get: { tags: ['tasks'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {}, 404: {} } },
      put: { tags: ['tasks'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {}, 404: {} } },
      delete: { tags: ['tasks'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {} } },
    },
    '/api/tasks/{id}/toggle': {
      patch: { tags: ['tasks'], summary: 'Toggle task done', parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {} } },
    },
    '/api/meetings': {
      get: { tags: ['meetings'], summary: 'List meetings', responses: { 200: {} } },
      post: { tags: ['meetings'], summary: 'Create meeting', requestBody: {}, responses: { 201: {} } },
    },
    '/api/meetings/{id}': {
      get: { tags: ['meetings'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {}, 404: {} } },
      put: { tags: ['meetings'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {} } },
      delete: { tags: ['meetings'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {} } },
    },
    '/api/collaborators': {
      get: { tags: ['collaborators'], summary: 'List collaborators', responses: { 200: {} } },
      post: { tags: ['collaborators'], requestBody: {}, responses: { 201: {} } },
    },
    '/api/collaborators/{id}': {
      get: { tags: ['collaborators'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {}, 404: {} } },
      put: { tags: ['collaborators'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {} } },
      delete: { tags: ['collaborators'], parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: {} } },
    },
    '/api/whisper-proxy': {
      get: {
        tags: ['voice'],
        summary: 'Whisper service status',
        responses: { 200: { description: 'ok, whisper available' } },
      },
      post: {
        tags: ['voice'],
        summary: 'Speech to text (STT)',
        description:
          'Proxies to local Whisper (WHISPER_LOCAL_URL). Run `npm run whisper:up` — builds/runs the small `docker/whisper-jarvis` service (not the multi-GB Hub image).',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['audio'],
                properties: {
                  audio: { type: 'string', description: 'Base64 encoded audio' },
                  mimeType: { type: 'string', default: 'audio/webm' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'text' }, 400: {}, 500: {} },
      },
    },
    '/api/llm-status': {
      get: {
        tags: ['health'],
        summary: 'LLM / Ollama status (installed models vs LLM_MODEL)',
        responses: { 200: { description: 'ok, installedModels, configuredModel, hint' } },
      },
    },
    '/api/chatgpt-proxy': {
      post: {
        tags: ['voice'],
        summary: 'Chat proxy (LLM: Ollama/local or optional OpenAI)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['messages'],
                properties: {
                  messages: { type: 'array' },
                  model: { type: 'string' },
                  temperature: { type: 'number' },
                },
              },
            },
          },
        },
        responses: { 200: {}, 400: {}, 500: {} },
      },
    },
  },
};
