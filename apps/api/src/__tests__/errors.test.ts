import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../app.js';

describe('manejo de errores', () => {
  it('devuelve 404 comprensible para una ruta inexistente', async () => {
    const response = await request(app).get('/api/v1/no-existe');

    expect(response.status).toBe(404);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toBe('No encontramos lo que buscabas.');
  });

  it('devuelve 400 cuando el JSON es inválido', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toBe('No pudimos procesar la solicitud. Probá de nuevo.');
  });

  it('devuelve 422 con campos obligatorios en español', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({});

    expect(response.status).toBe(422);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toContain('Faltan completar');
    expect(response.body.message).toContain('aceptar los términos y condiciones');
  });

  it('devuelve 422 con email inválido en español', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'no-es-un-email',
      password: 'password12345',
      fullName: 'Usuario Test',
      birthDate: '1990-01-01',
      acceptTerms: true,
    });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Ingresá un email válido.');
  });

  it('devuelve 422 con longitud mínima comprensible', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'test@revia.test',
      password: 'corta',
      fullName: 'Usuario Test',
      birthDate: '1990-01-01',
      acceptTerms: true,
    });

    expect(response.status).toBe(422);
    expect(response.body.message).toContain('debe tener al menos 10 caracteres');
  });

  it('devuelve 401 comprensible sin sesión', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toBe('Iniciá sesión para continuar.');
  });
});
