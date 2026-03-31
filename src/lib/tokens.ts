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
 * Retries an async function on network or authorization errors.
 * On 401 (Unauthorized) or 403 (Forbidden/Rate Limit), creates a fresh Octokit
 * with the next rotated token and passes it to the retry. If all tokens fail,
 * falls back to unauthenticated mode for public repos.
 */
export async function withRetry<T>(
  fn: (octokit: Octokit) => Promise<T>,
  maxAttempts = 3,
  label = 'GitHub API call'
): Promise<T> {
  let lastError: any;
  let currentOctokit = createOctokit();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(currentOctokit);
    } catch (e: any) {
      lastError = e;

      const isUnauthorized = e?.status === 401;
      const isRateLimited = e?.status === 403 || e?.status === 429;
      const isTransient =
        e?.code === 'ECONNRESET' ||
        e?.code === 'ECONNREFUSED' ||
        e?.code === 'ETIMEDOUT' ||
        e?.status === 500 ||
        e?.status === 502 ||
        e?.status === 503 ||
        String(e?.message).includes('ECONNRESET') ||
        String(e?.message).includes('fetch failed');

      if (isUnauthorized) {
        console.error(`[DevMRI] ❌ Token Unauthorized (401) during ${label}. Rotating to next token...`);
        // Rotate to next token and create a fresh Octokit instance
        getNextGithubToken();
        currentOctokit = createOctokit();
      } else if (isRateLimited) {
        console.warn(`[DevMRI] ⏳ Rate Limit/Forbidden (403/429) on ${label}. Rotating token pool...`);
        getNextGithubToken();
        currentOctokit = createOctokit();
      }

      if ((!isTransient && !isUnauthorized && !isRateLimited) || attempt === maxAttempts) break;

      const backoffMs = isUnauthorized || isRateLimited ? 100 : Math.pow(2, attempt - 1) * 1000;
      console.warn(`[DevMRI] ⚡ ${label} failed (${e?.status || e?.code}), attempt ${attempt}/${maxAttempts}. Retrying...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }

  // If all token-authenticated attempts failed with 401, fall back to unauthenticated
  if (lastError?.status === 401) {
    console.warn(`[DevMRI] ⚠️  All tokens unauthorized. Falling back to unauthenticated mode (${label}).`);
    try {
      const unauthOctokit = new Octokit({
        userAgent: 'DevMRI-App',
        request: { timeout: 15000 },
      });
      return await fn(unauthOctokit);
    } catch (fallbackErr: any) {
      console.error(`[DevMRI] ❌ Unauthenticated fallback also failed for ${label}:`, fallbackErr?.message);
      throw fallbackErr;
    }
  }

  throw lastError;
}
