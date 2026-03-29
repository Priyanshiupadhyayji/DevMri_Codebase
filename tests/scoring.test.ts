import { describe, it, expect } from 'vitest';
import { getScoreColor, getGradeColor, calculateFrictionCost } from '@/lib/scoring';

describe('Scoring Module', () => {
  describe('getScoreColor', () => {
    it('returns green for A-grade scores (80-100)', () => {
      expect(getScoreColor(95)).toBe('#00e676');
      expect(getScoreColor(80)).toBe('#00e5ff');
    });

    it('returns cyan for B-grade scores (75-89)', () => {
      expect(getScoreColor(75)).toBe('#00e5ff');
    });

    it('returns amber for C-grade scores (60-74)', () => {
      expect(getScoreColor(60)).toBe('#ffab00');
    });

    it('returns orange for D-grade scores (40-59)', () => {
      expect(getScoreColor(40)).toBe('#ff6d00');
    });

    it('returns red for F-grade scores (0-39)', () => {
      expect(getScoreColor(20)).toBe('#ff1744');
      expect(getScoreColor(0)).toBe('#ff1744');
    });

    it('handles edge cases at boundaries', () => {
      expect(getScoreColor(100)).toBe('#00e676');
      expect(getScoreColor(90)).toBe('#00e676');
    });
  });

  describe('getGradeColor', () => {
    it('maps each grade to a color', () => {
      const gradeColors: Record<string, string> = {
        A: '#00e676',
        B: '#00e5ff',
        C: '#ffab00',
        D: '#ff6d00',
        F: '#ff1744',
      };
      (Object.keys(gradeColors) as string[]).forEach(grade => {
        const color = getGradeColor(grade as any);
        expect(color).toBe(gradeColors[grade]);
      });
    });
  });

  describe('calculateFrictionCost', () => {
    it('calculates friction costs with valid data', () => {
      const result = calculateFrictionCost(
        { avgDurationMinutes: 12, successRate: 80, flakyRate: 10, totalRuns: 100, avgDailyRuns: 8 } as any,
        { medianReviewTimeHours: 24, stalePrRate: 15, stalePRs: [1,2,3], totalPRsAnalyzed: 50 } as any,
        { vulnerabilities: { critical: 1, high: 3, medium: 5, low: 2, total: 11 }, outdatedPercentage: 30, outdatedCount: 12 } as any,
        75
      );
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(typeof result.total).toBe('number');
      expect(isNaN(result.total)).toBe(false);
    });

    it('handles null inputs gracefully', () => {
      const result = calculateFrictionCost(null, null, null, 75);
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(isNaN(result.total)).toBe(false);
    });

    it('scales with hourly rate', () => {
      const mockCicd = { avgDurationMinutes: 12, successRate: 80, flakyRate: 10, totalRuns: 100, avgDailyRuns: 8 } as any;
      const mockReviews = { medianReviewTimeHours: 24, stalePrRate: 15, stalePRs: [1,2,3], totalPRsAnalyzed: 50 } as any;
      const mockDeps = { vulnerabilities: { critical: 1, high: 3, medium: 5, low: 2, total: 11 }, outdatedPercentage: 30, outdatedCount: 12 } as any;
      
      const low = calculateFrictionCost(mockCicd, mockReviews, mockDeps, 50);
      const high = calculateFrictionCost(mockCicd, mockReviews, mockDeps, 150);
      expect(high.total).toBeGreaterThan(low.total);
    });

    it('returns breakdown categories', () => {
      const result = calculateFrictionCost(null, null, null, 75);
      expect(result).toHaveProperty('ciBottleneck');
      expect(result).toHaveProperty('reviewDelay');
      expect(result).toHaveProperty('stalePRs');
      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('annualProjection');
    });
  });
});
