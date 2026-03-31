import { Octokit } from '@octokit/rest';

/**
 * GitHub Token Rotation Utility
 * Automatically cycles through available GitHub tokens to maximize rate limits
 * and bypass individual token restrictions.
 */

let currentTokenIndex = 0;
let _lastLoggedIndex = -1; // Track to avoid duplicate logs per scan

/**
 * Returns the next available GitHub token in a round-robin fashion.
 * Prioritizes GITHUB_TOKEN, then GITHUB_TOKEN1, GITHUB_TOKEN2, GITHUB_TOKEN3.
 */
export function getNextGithubToken(): string | undefined {
  const tokens = [
    process.env.GITHUB_TOKEN,
    process.env.GITHUB_TOKEN1,
    process.env.GITHUB_TOKEN2,
    process.env.GITHUB_TOKEN3,
  ].filter(Boolean) as string[];

  if (tokens.length === 0) return undefined;

  const token = tokens[currentTokenIndex];
  currentTokenIndex = (currentTokenIndex + 1) % tokens.length;
  return token;
}

let _lastLogTime = 0;

/**
 * Log the active token pool once at scan start (debounced to 2s to avoid duplicate logs
 * when two concurrent requests both trigger a scan simultaneously).
 */
export function logTokenPoolStatus(): void {
  const now = Date.now();
  if (now - _lastLogTime < 2000) return; // Debounce: only log once per 2 seconds
  _lastLogTime = now;

  const tokens = getGithubTokenPool();
  if (tokens.length === 0) {
    console.warn('[DevMRI] ⚠️  No GitHub tokens configured — API rate limits will apply (60 req/hr)');
  } else {
    const masked = tokens.map((t, i) => `[${i}] ${t.substring(0, 8)}...${t.substring(t.length - 4)}`);
    console.log(`[DevMRI] 🔑 Token pool: ${tokens.length} token(s) active → ${masked.join(', ')}`);
  }
}


/**
 * Returns the current pool of tokens
 */
export function getGithubTokenPool(): string[] {
  return [
    process.env.GITHUB_TOKEN,
    process.env.GITHUB_TOKEN1,
    process.env.GITHUB_TOKEN2,
    process.env.GITHUB_TOKEN3,
  ].filter(Boolean) as string[];
}

/**
 * Creates an Octokit instance using the token rotation pool.
 * If a specific token is provided, it takes priority.
 * On 403/429 errors, callers should create a new instance via createOctokit()
 * which will automatically rotate to the next token in the pool.
 */
export function createOctokit(token?: string): Octokit {
  const resolvedToken = token || getNextGithubToken();

  return new Octokit({
    auth: resolvedToken || undefined,
    userAgent: 'DevMRI-App',
    request: {
      // Set a reasonable timeout for all requests
      timeout: 15000,
    },
  });
}

/**
 * Retries an async function on transient network errors (ECONNRESET, 500, 502, 503).
 * Uses exponential backoff: 1s → 2s → 4s.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  label = 'GitHub API call'
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const isTransient =
        e?.code === 'ECONNRESET' ||
        e?.code === 'ECONNREFUSED' ||
        e?.code === 'ETIMEDOUT' ||
        e?.status === 500 ||
        e?.status === 502 ||
        e?.status === 503 ||
        String(e?.message).includes('ECONNRESET') ||
        String(e?.message).includes('fetch failed');

      if (!isTransient || attempt === maxAttempts) break;
      const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.warn(`[DevMRI] ⚡ ${label} failed (${e?.code || e?.status}), retry ${attempt}/${maxAttempts - 1} in ${backoffMs}ms`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  throw lastError;
}
