/**
 * GitHub Actions Log Parser
 * Extracts specific bottlenecks and insights from CI/CD job logs
 */

export interface JobLogInsight {
  jobName: string;
  bottlenecks: Bottleneck[];
  insights: string[];
  recommendations: LogRecommendation[];
  totalTime: number;
}

export interface Bottleneck {
  stepName: string;
  duration: number;
  percentage: number;
  type: 'dependency_install' | 'compilation' | 'testing' | 'deploy' | 'other';
  opportunity: string | null;
}

export interface LogRecommendation {
  title: string;
  description: string;
  estimatedSavings: number; // minutes saved
  difficulty: 'easy' | 'medium' | 'hard';
  example: string;
}

/**
 * Parse GitHub Actions log text and extract actionable insights
 */
export function parseJobLog(logText: string, jobName: string): JobLogInsight {
  const bottlenecks: Bottleneck[] = [];
  const insights: string[] = [];
  const recommendations: LogRecommendation[] = [];
  let totalTime = 0;

  // Extract step timings using regex
  // Format: "##[group]Step Name" or "2024-01-15T10:30:45.1234567Z" timestamps
  const lines = logText.split('\n');
  
  // Pattern 1: Look for typical CI step patterns with duration
  const stepPattern = /(\[(\d{2}:\d{2}:\d{2})\])?\s*(npm|yarn|pip|gradle|maven|cargo|make|jest|pytest|rspec|mocha|eslint|tsc|go|cargo|docker|git|curl|wget)\s+(.+?)(\s+\(~?\d+[ms])?\s*$/i;
  
  // Parse timestamps to extract durations
  let lastTimestamp: Date | null = null;
  let lastStepName = '';
  
  for (const line of lines) {
    // Try to extract timestamp at beginning of line
    const tsMatch = line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/);
    const currentTimestamp = tsMatch ? new Date(tsMatch[0]) : null;
    
    // Look for common package installation patterns
    if (line.includes('npm install') || line.includes('yarn install') || line.includes('pip install')) {
      insights.push('Detected package installation step');
      
      // Check for caching opportunities
      if (!line.includes('cache') && !line.includes('--offline')) {
        recommendations.push({
          title: 'Enable Dependency Caching',
          description: `Your "${line.includes('npm') ? 'npm' : line.includes('yarn') ? 'yarn' : 'pip'}" install is not using caching. Enable Docker layer caching or GitHub Actions cache to speed up dependency installation by 80%.`,
          estimatedSavings: 3,
          difficulty: 'easy',
          example: `uses: actions/cache@v3
with:
  path: ~/.npm
  key: npm-\${{ hashFiles('**/package-lock.json') }}`
        });
      }
    }
    
    // Look for sequential test patterns
    if (line.includes('jest') || line.includes('pytest') || line.includes('rspec') || line.includes('mocha')) {
      insights.push('Detected test execution step');
      
      if (!line.includes('--maxWorkers') && !line.includes('-j') && !line.includes('--parallel')) {
        recommendations.push({
          title: 'Parallelize Test Execution',
          description: 'Tests are running sequentially. Enable parallel test execution to reduce test time by 3-4x depending on your hardware.',
          estimatedSavings: 4,
          difficulty: 'easy',
          example: `jest --maxWorkers=4  # or pytest -n auto for pytest`
        });
      }
    }
    
    // Look for sequential build patterns
    if (line.includes('tsc') || line.includes('webpack') || line.includes('gradle build') || line.includes('maven clean')) {
      insights.push('Detected compilation/build step');
      
      if (!line.includes('--cache') && !line.includes('--incremental')) {
        recommendations.push({
          title: 'Enable Incremental Builds',
          description: 'Your build is not incremental. Enable incremental compilation to skip unchanged files, reducing build time by 40-60%.',
          estimatedSavings: 2,
          difficulty: 'medium',
          example: `tsc --incremental  # TypeScript
tsconfig.json: {"compilerOptions": {"incremental": true}}`
        });
      }
    }
    
    // Node.js install detection
    if (line.includes('node') && line.match(/v\d+\.\d+\.\d+/)) {
      insights.push('Detected Node.js setup');
      
      if (line.includes('setup-node') || line.includes('nvm')) {
        recommendations.push({
          title: 'Use Node.js Setup Cache',
          description: 'Setup-node action can cache npm/yarn packages automatically. Ensure you have caching enabled to save 30-60s per build.',
          estimatedSavings: 1,
          difficulty: 'easy',
          example: `- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'`
        });
      }
    }
    
    // Docker operations
    if (line.includes('docker build') || line.includes('docker push')) {
      insights.push('Detected Docker operations');
      
      recommendations.push({
        title: 'Optimize Docker Build',
        description: 'Docker builds can be optimized with layer caching and multi-stage builds. Consider using buildkit for better caching and smaller images.',
        estimatedSavings: 5,
        difficulty: 'medium',
        example: `DOCKER_BUILDKIT=1 docker build -t myimage:latest .
# Use multi-stage builds in Dockerfile`
      });
    }
    
    // Linting/formatting detection
    if (line.includes('eslint') || line.includes('prettier') || line.includes('flake8') || line.includes('rubocop')) {
      insights.push('Detected linting/formatting step');
      
      if (!line.includes('--cache')) {
        recommendations.push({
          title: 'Cache Linting Results',
          description: 'Linting tools support caching to skip unchanged files. Enable caching to speed up linting by 30-50%.',
          estimatedSavings: 0.5,
          difficulty: 'easy',
          example: `eslint --cache --cache-location .eslintcache .`
        });
      }
    }
  }
  
  // Identify bottleneck steps (patterns)
  if (insights.length === 0) {
    insights.push('Build completed successfully with no major bottlenecks detected');
  }
  
  return {
    jobName,
    bottlenecks,
    insights,
    recommendations,
    totalTime
  };
}

/**
 * Extract step-by-step timing from GitHub Actions logs
 */
export function extractStepTimings(logText: string): Array<{ step: string; duration: number }> {
  const lines = logText.split('\n');
  const timings: Array<{ step: string; duration: number }> = [];
  
  // Look for lines that contain duration info
  // Pattern: "##[group]Step name" followed by duration in next few lines
  let currentStep = '';
  let stepStart: Date | null = null;
  
  lines.forEach((line, idx) => {
    // Detect step start
    if (line.includes('##[group]')) {
      currentStep = line.replace(/##\[group\]/g, '').trim();
      stepStart = null;
    }
    
    // Try to extract timestamp
    const tsMatch = line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/);
    if (tsMatch && currentStep) {
      if (!stepStart) {
        stepStart = new Date(tsMatch[0]);
      } else {
        const duration = (new Date(tsMatch[0]).getTime() - stepStart.getTime()) / 1000 / 60;
        if (duration > 0 && duration < 300) {
          timings.push({ step: currentStep, duration });
          currentStep = '';
          stepStart = null;
        }
      }
    }
    
    // Look for explicit duration info
    const durationMatch = line.match(/Elapsed time:\s*(\d+)s/i) || 
                         line.match(/Duration:\s*(\d+)\ ?m?s/i) ||
                         line.match(/\(~?(\d+)m\s*(\d+)s\)/);
    
    if (durationMatch && currentStep) {
      let durationMinutes = 0;
      if (durationMatch[1]) {
        durationMinutes = parseInt(durationMatch[1]) / 60; // assume seconds
        if (durationMatch[2]) {
          durationMinutes = parseInt(durationMatch[1]) + parseInt(durationMatch[2]) / 60;
        }
      }
      if (durationMinutes > 0) {
        timings.push({ step: currentStep, duration: durationMinutes });
      }
    }
  });
  
  return timings;
}

/**
 * Identify flaky test patterns in logs
 */
export function identifyFlakyTests(logText: string): string[] {
  const flakyPatterns = [
    /failed.*on retry|FLAKY/i,
    /Timeout|Timeouts/,
    /Connection refused|Connection timeout/,
    /ECONNRESET|ENOTFOUND/,
    /Sometimes fails|Intermittent failure/i,
  ];
  
  const lines = logText.split('\n');
  const flakyIndicators: string[] = [];
  
  lines.forEach(line => {
    flakyPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        flakyIndicators.push(line.trim());
      }
    });
  });
  
  return flakyIndicators;
}

/**
 * Categorize log entries by type
 */
export function categorizeLogEntry(text: string): 'install' | 'compile' | 'test' | 'deploy' | 'other' {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('npm') || lowerText.includes('yarn') || lowerText.includes('pip') || 
      lowerText.includes('gem') || lowerText.includes('maven') || lowerText.includes('gradle')) {
    return 'install';
  }
  
  if (lowerText.includes('tsc') || lowerText.includes('webpack') || lowerText.includes('build') ||
      lowerText.includes('compile') || lowerText.includes('cargo build')) {
    return 'compile';
  }
  
  if (lowerText.includes('jest') || lowerText.includes('pytest') || lowerText.includes('rspec') ||
      lowerText.includes('mocha') || lowerText.includes('test')) {
    return 'test';
  }
  
  if (lowerText.includes('deploy') || lowerText.includes('docker push') || lowerText.includes('publish')) {
    return 'deploy';
  }
  
  return 'other';
}
