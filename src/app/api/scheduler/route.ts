import { NextRequest } from 'next/server';

/**
 * Auto-Rescan Scheduler API
 * 
 * Manages scheduled periodic scans for repositories.
 * In production, this would connect to a task queue (e.g., Bull, Trigger.dev).
 * For the hackathon, it stores schedules in memory and returns the next scan time.
 */

const schedules = new Map<string, { 
  repo: string; 
  interval: string; 
  createdAt: string; 
  nextRun: string;
  enabled: boolean;
}>();

function getNextRunTime(interval: string): string {
  const now = new Date();
  switch (interval) {
    case 'hourly': now.setHours(now.getHours() + 1); break;
    case 'daily': now.setDate(now.getDate() + 1); break;
    case 'weekly': now.setDate(now.getDate() + 7); break;
    case 'monthly': now.setMonth(now.getMonth() + 1); break;
    default: now.setDate(now.getDate() + 1);
  }
  return now.toISOString();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, repo, interval } = body;

  if (action === 'create') {
    if (!repo || !interval) {
      return Response.json({ error: 'Missing repo or interval' }, { status: 400 });
    }

    const schedule = {
      repo,
      interval,
      createdAt: new Date().toISOString(),
      nextRun: getNextRunTime(interval),
      enabled: true,
    };

    schedules.set(repo, schedule);

    return Response.json({
      success: true,
      schedule,
      message: `✅ Auto-rescan scheduled for ${repo} every ${interval}`,
    });
  }

  if (action === 'delete') {
    schedules.delete(repo);
    return Response.json({ success: true, message: `Schedule removed for ${repo}` });
  }

  if (action === 'toggle') {
    const existing = schedules.get(repo);
    if (existing) {
      existing.enabled = !existing.enabled;
      if (existing.enabled) existing.nextRun = getNextRunTime(existing.interval);
      schedules.set(repo, existing);
      return Response.json({ success: true, schedule: existing });
    }
    return Response.json({ error: 'No schedule found' }, { status: 404 });
  }

  if (action === 'list') {
    return Response.json({
      schedules: Array.from(schedules.values()),
      total: schedules.size,
    });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

export async function GET() {
  return Response.json({
    schedules: Array.from(schedules.values()),
    total: schedules.size,
  });
}
