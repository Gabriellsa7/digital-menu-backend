import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';

export function as(accessToken: string) {
  const bearer = (request: supertest.Test) =>
    request.set('Authorization', `Bearer ${accessToken}`);
  return {
    get: (path: string) => bearer(supertest(app.app).get(path)),
    post: (path: string) => bearer(supertest(app.app).post(path)),
    put: (path: string) => bearer(supertest(app.app).put(path)),
    patch: (path: string) => bearer(supertest(app.app).patch(path)),
    delete: (path: string) => bearer(supertest(app.app).delete(path)),
  };
}
