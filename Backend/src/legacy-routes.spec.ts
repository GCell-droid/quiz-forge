import { resolveLegacyRoute } from './legacy-routes';

describe('legacy HTTP route compatibility', () => {
  it.each([
    ['POST', '/auth/register', 'POST', '/v1/auth/accounts'],
    ['POST', '/auth/login', 'POST', '/v1/auth/sessions'],
    ['POST', '/auth/logout', 'DELETE', '/v1/auth/sessions/current'],
    ['PUT', '/user/profile', 'PATCH', '/v1/users/me'],
    ['GET', '/quizzes/bundles/123', 'GET', '/v1/bundles/123'],
    ['PATCH', '/quizzes/bundles/questions/123', 'PATCH', '/v1/bundles/questions/123'],
    ['DELETE', '/quizzes/questions/123', 'DELETE', '/v1/quizzes/questions/123'],
    ['POST', '/sessions/schedule', 'POST', '/v1/sessions'],
    ['GET', '/sessions/hosted', 'GET', '/v1/sessions?view=hosted'],
    ['GET', '/sessions/123/my-results', 'GET', '/v1/sessions/123/results/me'],
    ['POST', '/gemini/generate-quiz', 'POST', '/v1/quiz-generations'],
  ])('%s %s maps to %s %s', (method, path, newMethod, newPath) => {
    expect(resolveLegacyRoute(method, path)).toEqual({
      method: newMethod,
      path: newPath,
    });
  });

  it('leaves versioned routes alone', () => {
    expect(resolveLegacyRoute('GET', '/v1/quizzes')).toBeNull();
  });
});
