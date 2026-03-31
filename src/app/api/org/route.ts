import { NextRequest } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getNextGithubToken, createOctokit } from '@/lib/tokens';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const org = searchParams.get('org');
  const token = searchParams.get('token') || getNextGithubToken();

  if (!org) {
    return new Response('Missing org parameter', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const octokit = createOctokit(token || undefined);

        send('progress', { phase: 'discovery', message: `Discovering repositories in ${org}...`, percent: 5 });

        // Fetch org repos
        let repos;
        try {
          repos = await octokit.paginate(octokit.repos.listForOrg, {
            org,
            type: 'public',
            sort: 'pushed',
            per_page: 30,
          });
        } catch (e: any) {
          if (e.status === 404) {
            send('error', { message: `Organization "${org}" not found on GitHub. Check the name and try again.` });
            controller.close();
            return;
          }
          throw e;
        }

        if (!repos || repos.length === 0) {
          send('error', { message: `No public repositories found for "${org}". The org may be private or empty.` });
          controller.close();
          return;
        }

        const repoList = repos.slice(0, 20); // Limit to top 20

        send('progress', { phase: 'discovery', message: `Found ${repoList.length} repositories`, percent: 10 });

        const fleetResults: any[] = [];
        let totalFrictionCost = 0;
        let scannedCount = 0;

        for (const repo of repoList) {
          scannedCount++;
          const percent = 10 + Math.round((scannedCount / repoList.length) * 80);

          send('progress', {
            phase: 'scanning',
            message: `Scanning ${repo.full_name} (${scannedCount}/${repoList.length})...`,
            percent,
            repo: repo.full_name,
          });

          try {
            // Quick health assessment per repo
            const [pullsRes, workflowsRes] = await Promise.allSettled([
              octokit.pulls.list({ owner: org, repo: repo.name, state: 'all', per_page: 10 }),
              octokit.actions.listWorkflowRunsForRepo({ owner: org, repo: repo.name, per_page: 10 }),
            ]);

            const pulls = pullsRes.status === 'fulfilled' ? pullsRes.value.data : [];

            // Calculate quick metrics
            const openIssues = repo.open_issues_count || 0;
            const daysSincePush = Math.round((Date.now() - new Date(repo.pushed_at || '').getTime()) / (1000 * 60 * 60 * 24));
            const hasCI = workflowsRes.status === 'fulfilled' && (workflowsRes.value.data.total_count || 0) > 0;
            
            // Calculate CI success rate
            let ciSuccessRate = 0;
            if (workflowsRes.status === 'fulfilled' && workflowsRes.value.data.workflow_runs) {
              const runs = workflowsRes.value.data.workflow_runs;
              const successRuns = runs.filter((r: any) => r.conclusion === 'success').length;
              ciSuccessRate = runs.length > 0 ? Math.round((successRuns / runs.length) * 100) : 0;
            }

            // Quick PR metrics
            const avgPRAge = pulls.length > 0
              ? Math.round(pulls.reduce((sum: number, pr: any) => {
                  const created = new Date(pr.created_at).getTime();
                  const closed = pr.closed_at ? new Date(pr.closed_at).getTime() : Date.now();
                  return sum + (closed - created) / (1000 * 60 * 60);
                }, 0) / pulls.length)
              : 0;

            // Compute a quick DX Score (0-100)
            let dxScore = 50;
            if (hasCI) dxScore += 15;
            if (ciSuccessRate > 80) dxScore += 10;
            if (daysSincePush < 7) dxScore += 10;
            if (openIssues < 50) dxScore += 5;
            if (avgPRAge < 24) dxScore += 10;
            if (repo.license) dxScore += 5;
            dxScore = Math.min(100, Math.max(0, dxScore));

            const grade = dxScore >= 90 ? 'A' : dxScore >= 75 ? 'B' : dxScore >= 60 ? 'C' : dxScore >= 40 ? 'D' : 'F';

            // Estimate friction cost
            const frictionCost = Math.round(
              (daysSincePush > 30 ? 500 : 0) +
              (openIssues * 15) +
              (!hasCI ? 2000 : 0) +
              (ciSuccessRate < 80 ? 1500 : 0) +
              (avgPRAge > 48 ? 800 : 0)
            );
            totalFrictionCost += frictionCost;

            const repoResult = {
              name: repo.name,
              fullName: repo.full_name,
              language: repo.language,
              stars: repo.stargazers_count,
              dxScore,
              grade,
              frictionCost,
              hasCI,
              ciSuccessRate,
              openIssues,
              daysSincePush,
              avgPRAge,
              health: dxScore >= 75 ? 'healthy' : dxScore >= 50 ? 'warning' : 'necrosis',
            };

            fleetResults.push(repoResult);

            send('repo_scanned', repoResult);
          } catch (err: any) {
            // Skip repos that fail
            send('repo_error', { repo: repo.full_name, error: err.message });
          }

          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 200));
        }

        // Sort by DX Score for leaderboard
        fleetResults.sort((a, b) => b.dxScore - a.dxScore);

        // Calculate org-wide metrics
        const avgDxScore = Math.round(fleetResults.reduce((sum, r) => sum + r.dxScore, 0) / (fleetResults.length || 1));
        const healthyCount = fleetResults.filter(r => r.health === 'healthy').length;
        const warningCount = fleetResults.filter(r => r.health === 'warning').length;
        const necrosisCount = fleetResults.filter(r => r.health === 'necrosis').length;

        // Estimate annual cost: hourly rate * 8h/day * 22d/month * 12 months
        const annualFrictionCost = totalFrictionCost * 12;

        send('fleet_complete', {
          org,
          totalRepos: fleetResults.length,
          avgDxScore,
          orgGrade: avgDxScore >= 90 ? 'A' : avgDxScore >= 75 ? 'B' : avgDxScore >= 60 ? 'C' : avgDxScore >= 40 ? 'D' : 'F',
          totalFrictionCost,
          annualFrictionCost,
          healthyCount,
          warningCount,
          necrosisCount,
          leaderboard: fleetResults,
          topPerformers: fleetResults.slice(0, 3),
          worstPerformers: fleetResults.slice(-3).reverse(),
        });
      } catch (error: any) {
        send('error', { message: error.message || 'Fleet scan failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
