import express, { NextFunction, Request, Response } from 'express';
import supertest from 'supertest';
import { authRateLimit } from '../../interfaces/http/middlewares/auth-rate-limit.middleware';
import { TooManyRequestsError } from '../../domain/errors/too-many-requests.error';

function anApp(maxRequests: number) {
  const app = express();
  app.post('/login', authRateLimit(maxRequests), (_req, res) => {
    res.status(200).send();
  });
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof TooManyRequestsError ? 429 : 500;
    res.status(status).json({ code: (err as TooManyRequestsError).code });
  });
  return app;
}

describe('When a client hits the login endpoint too often', () => {
  it('should answer 429 AUTH_RATE_LIMITED after the limit', async () => {
    const app = anApp(1);

    const first = await supertest(app).post('/login');
    const second = await supertest(app).post('/login');

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    expect(second.body.code).toBe('AUTH_RATE_LIMITED');
  });
});
