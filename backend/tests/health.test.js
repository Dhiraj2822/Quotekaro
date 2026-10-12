const request = require('supertest');
const app = require('../src/app');

describe('Health Check API', () => {
  it('GET /health returns 200 with status ok and service name', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'quotekaro-backend');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/v1/health returns 200 with version v1', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('version', 'v1');
  });

  it('GET /unknown-route returns standard 404 error shape', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
  });
});
