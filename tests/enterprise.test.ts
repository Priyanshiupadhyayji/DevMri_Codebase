import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('API: /api/sbom', () => {
  it('returns valid CycloneDX JSON for demo repo', async () => {
    const res = await fetch(`${BASE_URL}/api/sbom?repo=demo/playground`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.bomFormat).toBe('CycloneDX');
    expect(data.specVersion).toBe('1.5');
    expect(data.metadata.component.name).toBe('demo/playground');
    expect(Array.isArray(data.components)).toBe(true);
    expect(data.components.length).toBeGreaterThan(0);
  });
});

describe('API: /api/scheduler', () => {
  it('returns current scheduler settings', async () => {
    const res = await fetch(`${BASE_URL}/api/scheduler`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('schedules');
    expect(data).toHaveProperty('total');
  });

  it('updates scheduler settings', async () => {
    const res = await fetch(`${BASE_URL}/api/scheduler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', repo: 'test/repo', interval: 'weekly' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.schedule.interval).toBe('weekly');
    expect(data.success).toBe(true);
  });
});
