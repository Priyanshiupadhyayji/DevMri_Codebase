import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';

// ═══════════════════════════════════════════════════════════════════
// RAG ENGINE — "Chat with your Codebase"
// Retrieval-Augmented Generation for DevMRI
// ═══════════════════════════════════════════════════════════════════

// MegaLLM for reasoning (Chat + RAG Generation)
const megallm = new OpenAI({
  baseURL: 'https://ai.megallm.io/v1',
  apiKey: process.env.MEGALLM_API_KEY || '',
});

const MEGALLM_MODEL = 'openai-gpt-oss-20b';

// ─── TYPES ───────────────────────────────────────────────────────

export interface CodeChunk {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string;
  embedding?: number[];
}

export interface VectorStore {
  repoKey: string;
  chunks: CodeChunk[];
  indexedAt: string;
  fileCount: number;
  totalChunks: number;
  vocabulary?: string[];
}

export interface RAGResult {
  answer: string;
  sources: {
    filePath: string;
    startLine: number;
    endLine: number;
    snippet: string;
    relevanceScore: number;
  }[];
}

// ─── IN-MEMORY VECTOR STORE ──────────────────────────────────────
const vectorStores = new Map<string, VectorStore>();

// ─── LOCAL TF-IDF EMBEDDING ENGINE ──────────────────────────────
// Zero-dependency, runs entirely on-device. No API keys needed.

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase split
    .replace(/_/g, ' ')                    // snake_case split
    .replace(/[^a-z0-9\s]/g, ' ')          // remove special chars
    .split(/\s+/)
    .filter(t => t.length > 1 && t.length < 40);
}

function buildVocabulary(documents: string[], maxTerms: number = 512): string[] {
  const df = new Map<string, number>();
  const totalDocs = documents.length;

  for (const doc of documents) {
    const uniqueTokens = new Set(tokenize(doc));
    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }

  return [...df.entries()]
    .filter(([, count]) => count >= 2 && count < totalDocs * 0.8)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([term]) => term);
}

function textToVector(text: string, vocabulary: string[]): number[] {
  const tokens = tokenize(text);
  const tf = new Map<string, number>();

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  const maxTf = Math.max(...tf.values(), 1);

  return vocabulary.map(term => {
    const raw = tf.get(term) || 0;
    return raw / maxTf;
  });
}

function generateLocalEmbedding(text: string, vocabulary: string[]): number[] {
  return textToVector(text, vocabulary);
}

function batchEmbedLocal(texts: string[], vocabulary: string[]): number[][] {
  return texts.map(t => generateLocalEmbedding(t, vocabulary));
}

// ─── LANGUAGE DETECTION ──────────────────────────────────────────

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java',
  '.rb': 'ruby', '.php': 'php', '.css': 'css', '.scss': 'scss',
  '.html': 'html', '.vue': 'vue', '.svelte': 'svelte',
  '.yaml': 'yaml', '.yml': 'yaml', '.json': 'json',
  '.md': 'markdown', '.sql': 'sql', '.sh': 'shell',
  '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
  '.swift': 'swift', '.kt': 'kotlin', '.dart': 'dart',
};

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  'vendor', '.vscode', '.idea', 'coverage', '.cache', 'target',
]);

const SKIP_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.gitignore', '.eslintignore', '.prettierignore',
]);

function getLanguage(filePath: string): string | null {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return LANGUAGE_MAP[ext] || null;
}

function shouldIndex(filePath: string): boolean {
  const parts = filePath.split('/');
  if (parts.some(p => SKIP_DIRS.has(p))) return false;
  const fileName = parts[parts.length - 1];
  if (SKIP_FILES.has(fileName)) return false;
  return getLanguage(filePath) !== null;
}

// ─── CODE CHUNKING ───────────────────────────────────────────────

function chunkCode(content: string, filePath: string, maxChunkLines: number = 60): CodeChunk[] {
  const lines = content.split('\n');
  const language = getLanguage(filePath) || 'text';
  const chunks: CodeChunk[] = [];

  if (lines.length <= maxChunkLines) {
    chunks.push({
      id: `${filePath}:1-${lines.length}`,
      filePath,
      content: `// FILE: ${filePath}\n${content}`,
      startLine: 1,
      endLine: lines.length,
      language,
    });
    return chunks;
  }

  const breakPoints: number[] = [0];
  const functionPatterns = [
    /^(export\s+)?(async\s+)?function\s+/,
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
    /^(export\s+)?class\s+/,
    /^(export\s+)?interface\s+/,
    /^(export\s+)?type\s+/,
    /^(export\s+)?enum\s+/,
    /^def\s+/,
    /^class\s+/,
    /^func\s+/,
    /^(pub\s+)?fn\s+/,
    /^(public|private|protected)\s+(static\s+)?\w+/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (functionPatterns.some(p => p.test(trimmed))) {
      const lastBreak = breakPoints[breakPoints.length - 1];
      if (i - lastBreak >= 10) {
        breakPoints.push(i);
      }
    }
  }
  breakPoints.push(lines.length);

  let currentStart = 0;
  for (let i = 1; i < breakPoints.length; i++) {
    const segmentEnd = breakPoints[i];
    const segmentLength = segmentEnd - currentStart;

    if (segmentLength >= maxChunkLines || i === breakPoints.length - 1) {
      const chunkContent = lines.slice(currentStart, segmentEnd).join('\n');
      chunks.push({
        id: `${filePath}:${currentStart + 1}-${segmentEnd}`,
        filePath,
        content: `// FILE: ${filePath} (lines ${currentStart + 1}-${segmentEnd})\n${chunkContent}`,
        startLine: currentStart + 1,
        endLine: segmentEnd,
        language,
      });
      currentStart = segmentEnd;
    }
  }

  return chunks;
}

// ─── GITHUB FILE FETCHER ─────────────────────────────────────────

async function fetchRepoTree(owner: string, repo: string, token?: string): Promise<string[]> {
  const octokit = new Octokit({ auth: token || process.env.GITHUB_TOKEN });

  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: tree } = await octokit.git.getTree({
      owner, repo,
      tree_sha: repoData.default_branch,
      recursive: 'true',
    });

    return tree.tree
      .filter(item => item.type === 'blob' && item.path && shouldIndex(item.path))
      .map(item => item.path!)
      .slice(0, 1000);
  } catch (e) {
    console.error('Failed to fetch repo tree:', e);
    return [];
  }
}

async function fetchFileContent(
  owner: string, repo: string, path: string, token?: string
): Promise<string | null> {
  const octokit = new Octokit({ auth: token || process.env.GITHUB_TOKEN });

  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if ('content' in data && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
  } catch { /* File not accessible */ }
  return null;
}

// ─── COSINE SIMILARITY ──────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── PUBLIC API ──────────────────────────────────────────────────

/**
 * Index a GitHub repository for RAG queries.
 * Uses local TF-IDF embeddings — no external embedding API needed.
 */
export async function indexRepository(
  owner: string,
  repo: string,
  token?: string,
  onProgress?: (message: string, percent: number) => void
): Promise<VectorStore> {
  const repoKey = `${owner}/${repo}`;

  // Check if already indexed (within last hour)
  const existing = vectorStores.get(repoKey);
  if (existing) {
    const indexedAge = Date.now() - new Date(existing.indexedAt).getTime();
    if (indexedAge < 3600000) {
      onProgress?.('Using cached index', 100);
      return existing;
    }
  }

  onProgress?.('Fetching repository file tree...', 5);

  // 1. Get file list
  const filePaths = await fetchRepoTree(owner, repo, token);
  if (filePaths.length === 0) {
    throw new Error('No indexable files found in repository');
  }

  onProgress?.(`Found ${filePaths.length} source files`, 10);

  // 2. Fetch file contents and chunk
  const allChunks: CodeChunk[] = [];
  let fetchedCount = 0;

  for (const path of filePaths) {
    const content = await fetchFileContent(owner, repo, path, token);
    if (content && content.length < 50000) {
      const chunks = chunkCode(content, path);
      allChunks.push(...chunks);
    }
    fetchedCount++;

    if (fetchedCount % 10 === 0) {
      const pct = Math.round(10 + (fetchedCount / filePaths.length) * 40);
      onProgress?.(`Fetched ${fetchedCount}/${filePaths.length} files (${allChunks.length} chunks)`, pct);
    }

    // Rate limiting for GitHub API
    if (fetchedCount % 15 === 0) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  onProgress?.(`Building local TF-IDF vocabulary from ${allChunks.length} chunks...`, 55);

  // 3. Build vocabulary and generate LOCAL embeddings (no API needed!)
  const texts = allChunks.map(c => c.content);
  const vocabulary = buildVocabulary(texts);

  onProgress?.(`Generating embeddings (${vocabulary.length} terms)...`, 70);

  const embeddings = batchEmbedLocal(texts, vocabulary);

  for (let i = 0; i < allChunks.length; i++) {
    allChunks[i].embedding = embeddings[i];
  }

  const validChunks = allChunks.filter(c => c.embedding && c.embedding.length > 0);

  onProgress?.(`Indexed ${validChunks.length} chunks from ${filePaths.length} files`, 100);

  // 4. Store (include vocabulary for query-time embeddings)
  const store: VectorStore = {
    repoKey,
    chunks: validChunks,
    indexedAt: new Date().toISOString(),
    fileCount: filePaths.length,
    totalChunks: validChunks.length,
    vocabulary,
  };

  vectorStores.set(repoKey, store);
  return store;
}

/**
 * Query the indexed codebase using natural language.
 * Returns an AI-generated answer with source code references.
 */
export async function queryCodebase(
  repoKey: string,
  question: string,
  chatHistory: { role: string; content: string }[] = [],
  topK: number = 5
): Promise<RAGResult> {
  const store = vectorStores.get(repoKey);
  if (!store) {
    throw new Error(`Repository "${repoKey}" is not indexed. Please index it first.`);
  }

  // 1. Embed the question locally using the same vocabulary
  const vocabulary = store.vocabulary || [];
  const questionEmbedding = generateLocalEmbedding(question, vocabulary);
  if (questionEmbedding.length === 0) {
    throw new Error('Failed to embed question');
  }

  // 2. Find most relevant chunks via cosine similarity
  const scored = store.chunks
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(questionEmbedding, chunk.embedding || []),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // 3. Build context from top chunks
  const context = scored
    .map((s, i) => `--- Source #${i + 1} (${s.chunk.filePath}, lines ${s.chunk.startLine}-${s.chunk.endLine}) ---\n${s.chunk.content}`)
    .join('\n\n');

  // 4. Generate answer with MegaLLM
  const systemPrompt = `You are DevMRI's Codebase Intelligence AI. You answer questions about a GitHub repository's code.

RULES:
- You have access to actual source code from the repository
- ALWAYS reference specific files and line numbers when answering
- Format code snippets with proper syntax highlighting
- If you're not sure, say so — don't hallucinate code that doesn't exist
- Be concise but thorough
- Use the medical/surgical DevMRI tone when appropriate
- When showing code, use markdown code blocks with the correct language`;

  const userPrompt = `The user is asking about the repository: ${repoKey}

Here are the most relevant code sections retrieved from the codebase:

${context}

${chatHistory.length > 0 ? `Previous conversation:\n${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n` : ''}User's question: ${question}

Provide a clear, code-aware answer with file references.`;

  let answer = '';
  try {
    const completion = await megallm.chat.completions.create({
      model: MEGALLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });
    answer = completion.choices[0]?.message?.content || 'Unable to generate an answer.';
  } catch (e: any) {
    console.warn('[MegaLLM] RAG query error:', e.message || e);
    answer = 'I was unable to process your question. The AI engine may be temporarily unavailable.';
  }

  return {
    answer,
    sources: scored.map(s => ({
      filePath: s.chunk.filePath,
      startLine: s.chunk.startLine,
      endLine: s.chunk.endLine,
      snippet: s.chunk.content.slice(0, 200) + '...',
      relevanceScore: Math.round(s.score * 100) / 100,
    })),
  };
}

/**
 * Check if a repository is indexed and return stats.
 */
export function getIndexStatus(repoKey: string): {
  indexed: boolean;
  fileCount?: number;
  chunkCount?: number;
  indexedAt?: string;
} {
  const store = vectorStores.get(repoKey);
  if (!store) return { indexed: false };

  return {
    indexed: true,
    fileCount: store.fileCount,
    chunkCount: store.totalChunks,
    indexedAt: store.indexedAt,
  };
}
