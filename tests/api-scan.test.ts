import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('API: /api/demo', () => {
  it('returns valid demo data structure', async () => {
    const res = await fetch(`${BASE_URL}/api/demo`);
    expect(res.status).toBe(200);

    const data = await res.json();

    // Core structure
    expect(data).toHaveProperty('repo');
    expect(data).toHaveProperty('dxScore');
    expect(data).toHaveProperty('grade');
    expect(data).toHaveProperty('scores');
    expect(data).toHaveProperty('cicd');
    expect(data).toHaveProperty('reviews');
    expect(data).toHaveProperty('deps');

    // Validate types
    expect(typeof data.dxScore).toBe('number');
    expect(typeof data.grade).toBe('string');
    expect(data.dxScore).toBeGreaterThanOrEqual(0);
    expect(data.dxScore).toBeLessThanOrEqual(100);
  });

  it('returns all 7 module scores', async () => {
    const res = await fetch(`${BASE_URL}/api/demo`);
    const data = await res.json();

    const expectedModules = ['cicd', 'reviews', 'deps', 'security', 'necrosis', 'heatmap', 'doc'];
    expectedModules.forEach(mod => {
      expect(data.scores).toHaveProperty(mod);
      expect(typeof data.scores[mod]).toBe('number');
    });
  });

  it('returns valid CI/CD data', async () => {
    const res = await fetch(`${BASE_URL}/api/demo`);
    const data = await res.json();

    expect(data.cicd.totalRuns).toBeGreaterThan(0);
    expect(data.cicd.successRate).toBeLessThanOrEqual(100);
    expect(data.cicd.stages).toBeInstanceOf(Array);
    expect(data.cicd.stages.length).toBeGreaterThan(0);
  });

  it('returns valid vulnerability data', async () => {
    const res = await fetch(`${BASE_URL}/api/demo`);
    const data = await res.json();

    expect(data.deps.vulnerabilities).toHaveProperty('critical');
    expect(data.deps.vulnerabilities).toHaveProperty('high');
    expect(data.deps.vulnerabilities).toHaveProperty('total');
    expect(data.deps.vulnerabilities.total).toBe(
      data.deps.vulnerabilities.critical + 
      data.deps.vulnerabilities.high + 
      data.deps.vulnerabilities.medium + 
      data.deps.vulnerabilities.low
    );
  });

  it('returns AI diagnosis recommendations', async () => {
    const res = await fetch(`${BASE_URL}/api/demo`);
    const data = await res.json();

    expect(data.aiDiagnosis).toHaveProperty('recommendations');
    expect(data.aiDiagnosis.recommendations.length).toBeGreaterThan(0);
    
    const firstRec = data.aiDiagnosis.recommendations[0];
    expect(firstRec).toHaveProperty('title');
    expect(firstRec).toHaveProperty('severity');
    expect(firstRec).toHaveProperty('description');
  });
});

describe('API: /api/email', () => {
  it('returns success for valid email dispatch', async () => {
    const res = await fetch(`${BASE_URL}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        repoName: 'test/repo',
        dxScore: 75,
        grade: 'B',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('dispatchId');
  });
});

describe('API: /api/badge', () => {
  it('returns SVG badge', async () => {
    const res = await fetch(`${BASE_URL}/api/badge?repo=demo/playground&score=85&grade=A`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<svg');
  });
});
