type Route = { method: string; path: string };

// Keep existing clients working while endpoints move to the versioned API.
// Remove aliases individually after their clients have migrated.
const exactRoutes: Record<string, Route> = {
  'GET /server/heartbeat': { method: 'GET', path: '/v1/health' },
  'GET /auth/test': { method: 'GET', path: '/v1/health' },
  'GET /auth/google': { method: 'GET', path: '/v1/auth/google' },
  'GET /auth/google/callback': {
    method: 'GET',
    path: '/v1/auth/google/callback',
  },
  'POST /auth/login': { method: 'POST', path: '/v1/auth/sessions' },
  'POST /auth/register': { method: 'POST', path: '/v1/auth/accounts' },
  'POST /auth/logout': {
    method: 'DELETE',
    path: '/v1/auth/sessions/current',
  },
  'POST /auth/refresh': { method: 'POST', path: '/v1/auth/tokens' },
  'GET /auth/me': { method: 'GET', path: '/v1/auth/sessions/current' },
  'PATCH /auth/role': {
    method: 'PATCH',
    path: '/v1/auth/accounts/me/role',
  },
  'GET /user/profile': { method: 'GET', path: '/v1/users/me' },
  'PUT /user/profile': { method: 'PATCH', path: '/v1/users/me' },
  'PUT /user/password': { method: 'PUT', path: '/v1/users/me/password' },
  'POST /sessions/schedule': { method: 'POST', path: '/v1/sessions' },
  'GET /sessions/hosted': {
    method: 'GET',
    path: '/v1/sessions?view=hosted',
  },
  'GET /sessions/history': {
    method: 'GET',
    path: '/v1/sessions?view=history',
  },
  'POST /gemini/generate-quiz': {
    method: 'POST',
    path: '/v1/quiz-generations',
  },
};

export function resolveLegacyRoute(method: string, path: string): Route | null {
  const exact = exactRoutes[`${method} ${path}`];
  if (exact) return exact;

  if (/^\/quizzes\/bundles(?:\/|$)/.test(path)) {
    return {
      method,
      path: `/v1/bundles${path.slice('/quizzes/bundles'.length)}`,
    };
  }
  if (/^\/quizzes(?:\/|$)/.test(path)) {
    return { method, path: `/v1${path}` };
  }
  if (method === 'GET') {
    const results = /^\/sessions\/([^/]+)\/my-results$/.exec(path);
    if (results) {
      return { method, path: `/v1/sessions/${results[1]}/results/me` };
    }
    if (/^\/sessions\/[^/]+$/.test(path)) {
      return { method, path: `/v1${path}` };
    }
  }
  return null;
}
