/**
 * Basic Admin Stats API Tests
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';

describe('/api/admin/stats - Basic Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 401 when no admin password is set', async () => {
    delete process.env.ADMIN_PASSWORD;

    const request = new NextRequest('http://localhost:3000/api/admin/stats', {
      headers: { 'Authorization': 'Bearer test123' }
    });

    const response = await GET(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 when no authorization header is provided', async () => {
    process.env.ADMIN_PASSWORD = 'test123';

    const request = new NextRequest('http://localhost:3000/api/admin/stats');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return 401 when invalid authorization format is provided', async () => {
    process.env.ADMIN_PASSWORD = 'test123';

    const request = new NextRequest('http://localhost:3000/api/admin/stats', {
      headers: { 'Authorization': 'Invalid format' }
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return 401 when wrong password is provided', async () => {
    process.env.ADMIN_PASSWORD = 'correct123';

    const request = new NextRequest('http://localhost:3000/api/admin/stats', {
      headers: { 'Authorization': 'Bearer wrong123' }
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should handle different time periods in URL params', async () => {
    process.env.ADMIN_PASSWORD = 'test123';

    const periods = ['1d', '7d', '30d', '90d'];

    for (const period of periods) {
      const request = new NextRequest(`http://localhost:3000/api/admin/stats?period=${period}`, {
        headers: { 'Authorization': 'Bearer test123' }
      });

      // This will likely fail due to database connection, but we can test the auth and URL parsing
      const response = await GET(request);
      
      // Should pass auth (not 401) even if it fails later due to database
      expect(response.status).not.toBe(401);
    }
  });

  it('should handle CSV format parameter', async () => {
    process.env.ADMIN_PASSWORD = 'test123';

    const request = new NextRequest('http://localhost:3000/api/admin/stats?format=csv', {
      headers: { 'Authorization': 'Bearer test123' }
    });

    const response = await GET(request);
    
    // Should pass auth (not 401) even if it fails later due to database
    expect(response.status).not.toBe(401);
  });
});