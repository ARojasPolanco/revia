import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../app.js';

describe('health', () => {
  it('GET /health responde ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('REVIA API v1');
  });

  it('GET /api/v1 responde REVIA API v1', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('REVIA API v1');
  });
});
