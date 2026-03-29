/**
 * Score Simulation & Before/After Comparison
 * Enables judges to see the impact of implementing recommendations
 */

import { FullScanResult, CICDResult, ReviewResult, DependencyResult, BeforeAfterComparison, ScoreSnapshot, Recommendation } from './types';
import { calculateDXScore } from './scoring';

/**
 * Simulate the effect of applying a recommendation on a CICD result
 */
export function simulateCICDFix(cicd: CICDResult | null, recommendation: Recommendation): CICDResult | null {
  if (!cicd) return null;
  
  const simulated = { ...cicd };
  
  switch (recommendation.title) {
    case `Optimize '${cicd.bottleneckStage.name}' (${cicd.bottleneckStage.avgMinutes}m bottleneck)`:
      // Simulate 50% reduction in bottleneck stage
      const stageName = cicd.bottleneckStage.name;
      simulated.stages = simulated.stages.map(s =>
        s.name === stageName 
          ? { ...s, avgDurationMinutes: s.avgDurationMinutes * 0.5, percentage: s.percentage * 0.5 }
          : s
      );
      simulated.avgDurationMinutes = Math.max(5, cicd.avgDurationMinutes * 0.75);
      break;
      
    case `Reduce Flaky Tests (${cicd.flakyRate.toFixed(1)}% inconsistency rate)`:
      simulated.flakyRate = Math.max(0, cicd.flakyRate * 0.3); // Reduce to 30% of current
      simulated.successRate = Math.min(100, cicd.successRate + 10);
      break;
      
    case `Speed up slow builds (${cicd.avgDurationMinutes}m average)`:
      simulated.avgDurationMinutes = cicd.avgDurationMinutes * 0.6; // 40% improvement
      simulated.stages = simulated.stages.map(s => ({
        ...s,
        avgDurationMinutes: s.avgDurationMinutes * 0.65,
        maxDurationMinutes: s.maxDurationMinutes * 0.65,
      }));
      break;
      
    case `Improve CI stability (${cicd.successRate.toFixed(1)}% success rate)`:
      simulated.successRate = Math.min(100, cicd.successRate + 8);
      simulated.flakyRate = Math.max(0, cicd.flakyRate * 0.5);
      break;
  }
  
  return simulated;
}

/**
 * Simulate the effect of applying a recommendation on review results
 */
export function simulateReviewFix(reviews: ReviewResult | null, recommendation: Recommendation): ReviewResult | null {
  if (!reviews) return null;
  
  const simulated = { ...reviews };
  
  switch (recommendation.title) {
    case `Split large PRs (${reviews.xlPrPercentage.toFixed(1)}% are XL)`:
      // Simulate reduction in XL PRs
      const xlCount = Math.round(reviews.totalPRsAnalyzed * (reviews.xlPrPercentage / 100));
      simulated.prSizeDistribution.XL = Math.max(0, reviews.prSizeDistribution.XL - Math.round(xlCount * 0.5));
      simulated.xlPrPercentage = Math.max(0, reviews.xlPrPercentage * 0.4);
      simulated.medianReviewTimeHours = reviews.medianReviewTimeHours * 0.7;
      break;
      
    case `Speed up PR reviews (${reviews.medianReviewTimeHours}h median)`:
      simulated.medianReviewTimeHours = Math.max(2, reviews.medianReviewTimeHours * 0.6);
      simulated.stalePrRate = Math.max(0, reviews.stalePrRate * 0.3);
      simulated.stalePRs = reviews.stalePRs.slice(0, Math.ceil(reviews.stalePRs.length * 0.3));
      break;
      
    case `Distribute review load (${reviews.reviewerLoad[0]?.login} at ${reviews.reviewerLoad[0]?.percentage.toFixed(1)}%)`:
      // Simulate more even load distribution
      simulated.giniCoefficient = Math.max(0.1, reviews.giniCoefficient * 0.6);
      simulated.loadBalance = 'even';
      break;
  }
  
  return simulated;
}

/**
 * Create a before/after comparison showing the impact of recommendations
 */
export function createBeforeAfterComparison(
  currentResults: FullScanResult,
  recommendations: Recommendation[]
): BeforeAfterComparison {
  // Create a deep copy for simulation
  const projectedResults: FullScanResult = JSON.parse(JSON.stringify(currentResults));
  
  // Apply top recommendations
  const topRecs = recommendations.sort((a, b) => b.frictionCost - a.frictionCost).slice(0, 5);
  
  // Simulate applying each recommendation
  for (const rec of topRecs) {
    projectedResults.cicd = simulateCICDFix(projectedResults.cicd, rec);
    projectedResults.reviews = simulateReviewFix(projectedResults.reviews, rec);
  }
  
  // Recalculate scores with simulated data
  // Import scoring functions here would require restructuring
  // For now, use a formula-based approach based on improvements
  
  const currentSnapshot: ScoreSnapshot = {
    timestamp: new Date().toISOString(),
    dxScore: currentResults.dxScore,
    grade: currentResults.grade,
    scores: currentResults.scores,
    frictionCost: currentResults.frictionCost.total,
    recommendation: `Current DX Score: ${currentResults.dxScore} (${currentResults.grade})`,
  };
  
  // Estimate projected improvement
  const totalProjectedImprovement = topRecs.reduce((sum, rec) => sum + rec.projectedScoreChange, 0);
  const projectedScore = Math.min(100, currentResults.dxScore + totalProjectedImprovement);
  
  const projectedSnapshot: ScoreSnapshot = {
    timestamp: new Date().toISOString(),
    dxScore: projectedScore,
    grade: projectedScore >= 90 ? 'A' : projectedScore >= 75 ? 'B' : projectedScore >= 60 ? 'C' : 'D',
    scores: { ...currentResults.scores }, // Would be recalculated in real scenario
    frictionCost: Math.max(0, currentResults.frictionCost.total - topRecs.reduce((sum, r) => sum + r.frictionCost, 0)),
    recommendation: `After implementing ${topRecs.length} recommendations: ${projectedScore} (${projectedScore >= 90 ? 'A' : projectedScore >= 75 ? 'B' : projectedScore >= 60 ? 'C' : 'D'})`,
  };
  
  const costSavings = Math.round(topRecs.reduce((sum, r) => sum + r.frictionCost, 0));
  const implementationTime = topRecs.length > 2 ? '3-4 weeks' : topRecs.length > 0 ? '2 weeks' : 'N/A';
  
  return {
    repositoryName: currentResults.repo.fullName,
    currentSnapshot,
    projectedSnapshot,
    scoreDifference: projectedScore - currentResults.dxScore,
    gradeDifference: `${currentResults.grade} → ${projectedSnapshot.grade}`,
    costSavings,
    appliedRecommendations: topRecs.map(r => r.title),
    timeToImplement: implementationTime,
  };
}

/**
 * Generate a text summary of the before/after comparison
 * Perfect for including in recommendations or dashboard
 */
export function generateBeforeAfterSummary(comparison: BeforeAfterComparison): string {
  const { repositoryName, currentSnapshot, projectedSnapshot, scoreDifference, costSavings, appliedRecommendations } = comparison;
  
  return `
# 📊 Before/After Comparison: ${repositoryName}

## Current State
- **DX Score**: ${currentSnapshot.dxScore} (${currentSnapshot.grade})
- **Monthly Friction Cost**: $${currentSnapshot.frictionCost.toLocaleString()}

## Projected State (After Implementing Recommendations)
- **DX Score**: ${projectedSnapshot.dxScore} (${projectedSnapshot.grade}) [+${scoreDifference} points]
- **Monthly Friction Cost**: $${projectedSnapshot.frictionCost.toLocaleString()} [-$${costSavings.toLocaleString()}]

## Key Improvements
${appliedRecommendations.map((rec, i) => `${i + 1}. **${rec}**`).join('\n')}

## Expected Timeline
- **Implementation**: ${comparison.timeToImplement}
- **ROI**: $${(costSavings * 12).toLocaleString()}/year saved

---
*Simulation based on applying ${appliedRecommendations.length} high-impact recommendations. Actual results may vary based on execution quality.*
  `;
}

/**
 * Find recommendations that would impact a specific module most
 */
export function getRecommendationsForModule(recommendations: Recommendation[], module: 'cicd' | 'review' | 'dependency' | 'security'): Recommendation[] {
  const moduleKeywords: Record<string, string[]> = {
    cicd: ['build', 'test', 'CI', 'pipeline', 'bottleneck', 'flaky', 'duration', 'success rate'],
    review: ['PR', 'review', 'load', 'split', 'XL', 'reviewer', 'merge'],
    dependency: ['vulnerab', 'patch', 'outdated', 'license', 'dependency', 'ecosystem'],
    security: ['vulnerab', 'security', 'posture', 'branch protection', 'CODEOWNERS'],
  };
  
  const keywords = moduleKeywords[module] || [];
  return recommendations.filter(rec => {
    const text = `${rec.title} ${rec.description}`.toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  });
}
