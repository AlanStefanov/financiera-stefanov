import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000/api';

interface LoginResponse {
  token?: string;
  message?: string;
  user?: {
    username: string;
    role: string;
  };
}

describe('Auth API', () => {
  let authToken: string;

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'Dr@wssap1234k',
        }),
      });

      expect(response.status).toBe(200);
      const data: LoginResponse = await response.json();
      expect(data.token).toBeDefined();
      expect(data.user?.role).toBe('admin');
      authToken = data.token!;
    });

    it('should reject invalid password', async () => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain('inválidas');
    });

    it('should reject missing credentials', async () => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('requeridos');
    });
  });
});

describe('Clients API', () => {
  let authToken: string;

  beforeAll(async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Dr@wssap1234k',
      }),
    });
    const data: LoginResponse = await response.json();
    authToken = data.token!;
  });

  describe('GET /clients', () => {
    it('should return clients list', async () => {
      const response = await fetch(`${API_BASE}/clients`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should reject without token', async () => {
      const response = await fetch(`${API_BASE}/clients`);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /clients', () => {
    it('should create a new client', async () => {
      const response = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Test Client',
          phone: '1234567890',
          address: 'Test Address 123',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.client?.name).toBe('Test Client');
    });

    it('should reject client without name', async () => {
      const response = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          phone: '1234567890',
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});

describe('Loan Types API', () => {
  let authToken: string;

  beforeAll(async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Dr@wssap1234k',
      }),
    });
    const data: LoginResponse = await response.json();
    authToken = data.token!;
  });

  describe('GET /loan-types', () => {
    it('should return loan types list', async () => {
      const response = await fetch(`${API_BASE}/loan-types`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /loan-types', () => {
    it('should create a monthly loan type', async () => {
      const response = await fetch(`${API_BASE}/loan-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Prueba Mensual 1 Mes',
          duration_months: 1,
          modality: 'monthly',
          interest_percentage: 30,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.loanType?.modality).toBe('monthly');
      expect(data.loanType?.duration_months).toBe(1);
    });

    it('should reject invalid modality', async () => {
      const response = await fetch(`${API_BASE}/loan-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Prueba Invalida',
          duration_months: 1,
          modality: 'invalid',
          interest_percentage: 30,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Modalidad');
    });

    it('should reject invalid duration', async () => {
      const response = await fetch(`${API_BASE}/loan-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Prueba Duracion Invalida',
          duration_months: 5,
          modality: 'monthly',
          interest_percentage: 30,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Duración');
    });
  });
});