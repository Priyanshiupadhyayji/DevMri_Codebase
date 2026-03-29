import { NextRequest } from 'next/server';

const API_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'DevMRI API',
    version: '1.0.0',
    description: 'Developer Experience Diagnostic API — Clinical-grade codebase health analysis powered by AI.',
    contact: { name: 'DevMRI Team', url: 'https://github.com/urjitupadhya/DEVmri' },
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },
  servers: [
    { url: 'https://devmri.vercel.app', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Local Development' },
  ],
  paths: {
    '/api/scan': {
      get: {
        summary: 'Run Full DX Scan',
        description: 'Performs a comprehensive Developer Experience scan on a GitHub repository, returning real-time progress via Server-Sent Events (SSE).',
        operationId: 'scanRepository',
        tags: ['Core'],
        parameters: [
          { name: 'owner', in: 'query', required: true, schema: { type: 'string' }, description: 'GitHub repository owner', example: 'facebook' },
          { name: 'repo', in: 'query', required: true, schema: { type: 'string' }, description: 'GitHub repository name', example: 'react' },
          { name: 'token', in: 'query', required: false, schema: { type: 'string' }, description: 'GitHub Personal Access Token for private repos or higher rate limits' },
        ],
        responses: {
          '200': {
            description: 'SSE stream with scan progress and final results',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
          },
          '400': { description: 'Missing required parameters' },
          '429': { description: 'GitHub API rate limit exceeded' },
        },
      },
    },
    '/api/demo': {
      get: {
        summary: 'Get Demo Data',
        description: 'Returns pre-loaded mock scan data for the Demo/Playground mode. No authentication required.',
        operationId: 'getDemoData',
        tags: ['Core'],
        responses: {
          '200': {
            description: 'Full scan result with mock data',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/ScanResult' },
              },
            },
          },
        },
      },
    },
    '/api/surgery': {
      post: {
        summary: 'AI Surgery — Generate Fix',
        description: 'Uses Gemini AI to generate a code fix for a specific diagnostic recommendation.',
        operationId: 'performSurgery',
        tags: ['AI'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['recommendation', 'repoContext'],
                properties: {
                  recommendation: { type: 'object', description: 'The diagnostic recommendation to fix' },
                  repoContext: { type: 'object', description: 'Repository metadata for context' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'SSE stream with generated code chunks' },
        },
      },
    },
    '/api/ai/chat': {
      post: {
        summary: 'AI Diagnostics Chat',
        description: 'Chat with the AI about scan results and get clinical recommendations.',
        operationId: 'aiChat',
        tags: ['AI'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', description: 'User message' },
                  scanResults: { type: 'object', description: 'Current scan context' },
                  history: { type: 'array', items: { type: 'object' }, description: 'Chat history' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'SSE stream with AI response chunks' },
        },
      },
    },
    '/api/rag': {
      post: {
        summary: 'RAG — Chat with Codebase',
        description: 'Index a repository and query its contents using Retrieval-Augmented Generation.',
        operationId: 'ragQuery',
        tags: ['AI'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  action: { type: 'string', enum: ['index', 'query'] },
                  owner: { type: 'string' },
                  repo: { type: 'string' },
                  question: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'SSE stream with RAG results' } },
      },
    },
    '/api/fix': {
      post: {
        summary: 'Create Fix PR',
        description: 'Creates a GitHub Pull Request with the AI-generated fix.',
        operationId: 'createFixPR',
        tags: ['GitHub'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['owner', 'repo', 'fixType', 'title', 'filePath', 'fileContent'],
                properties: {
                  owner: { type: 'string' },
                  repo: { type: 'string' },
                  fixType: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  filePath: { type: 'string' },
                  fileContent: { type: 'string' },
                  baseBranch: { type: 'string', default: 'main' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'PR created successfully', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, prUrl: { type: 'string' }, prNumber: { type: 'integer' } } } } } },
        },
      },
    },
    '/api/email': {
      post: {
        summary: 'Email Report Dispatch',
        description: 'Send a clinical diagnostic report via email.',
        operationId: 'emailReport',
        tags: ['Integrations'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  to: { type: 'string', format: 'email' },
                  repoName: { type: 'string' },
                  dxScore: { type: 'number' },
                  grade: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Email dispatched' } },
      },
    },
    '/api/slack': {
      post: {
        summary: 'Slack Webhook',
        description: 'Post DX report summary to a Slack channel via webhook.',
        operationId: 'slackWebhook',
        tags: ['Integrations'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  webhookUrl: { type: 'string', format: 'uri' },
                  repoName: { type: 'string' },
                  dxScore: { type: 'number' },
                  grade: { type: 'string' },
                  scores: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Message posted to Slack' } },
      },
    },
    '/api/badge': {
      get: {
        summary: 'DX Score Badge (SVG)',
        description: 'Returns a shields.io-style SVG badge for embedding in README files.',
        operationId: 'getBadge',
        tags: ['Core'],
        parameters: [
          { name: 'repo', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'score', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'grade', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'SVG badge image', content: { 'image/svg+xml': {} } } },
      },
    },
    '/api/ml/forecast': {
      post: {
        summary: 'ML DX Score Forecast',
        description: 'Predicts future DX score trends using machine learning.',
        operationId: 'mlForecast',
        tags: ['AI'],
        responses: { '200': { description: 'Forecast data with predicted scores and confidence intervals' } },
      },
    },
    '/api/org': {
      get: {
        summary: 'Organization Scan',
        description: 'Scan all repositories in a GitHub organization.',
        operationId: 'orgScan',
        tags: ['Enterprise'],
        parameters: [
          { name: 'org', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'SSE stream with org scan progress' } },
      },
    },
    '/api/sbom': {
      get: {
        summary: 'Generate SBOM',
        description: 'Generate a Software Bill of Materials (SBOM) in CycloneDX JSON format.',
        operationId: 'generateSbom',
        tags: ['Enterprise'],
        parameters: [
          { name: 'repo', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'CycloneDX SBOM JSON', content: { 'application/json': {} } } },
      },
    },
    '/api/benchmark': {
      get: {
        summary: 'Competitive Benchmark',
        description: 'Returns percentile ranking against industry benchmarks and comparison with top open-source projects.',
        operationId: 'getBenchmark',
        tags: ['Core'],
        parameters: [
          { name: 'score', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'repo', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Benchmark with percentile, verdict, and comparisons' } },
      },
    },
    '/api/widget': {
      get: {
        summary: 'Embeddable Widget JS',
        description: 'Returns a self-contained JavaScript widget for embedding DX Score on any website using Shadow DOM.',
        operationId: 'getWidget',
        tags: ['Integrations'],
        parameters: [
          { name: 'repo', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'score', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'grade', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'theme', in: 'query', schema: { type: 'string', enum: ['dark', 'light'] } },
        ],
        responses: { '200': { description: 'JavaScript widget code', content: { 'application/javascript': {} } } },
      },
    },
  },
  components: {
    schemas: {
      ScanResult: {
        type: 'object',
        properties: {
          repo: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, fullName: { type: 'string' }, stars: { type: 'integer' }, language: { type: 'string' } } },
          dxScore: { type: 'number', minimum: 0, maximum: 100 },
          grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
          scores: { type: 'object', properties: { cicd: { type: 'number' }, reviews: { type: 'number' }, deps: { type: 'number' }, security: { type: 'number' }, necrosis: { type: 'number' }, heatmap: { type: 'number' }, doc: { type: 'number' } } },
          timestamp: { type: 'string', format: 'date-time' },
          scanDuration: { type: 'number' },
        },
      },
    },
  },
  tags: [
    { name: 'Core', description: 'Core scanning and diagnostic endpoints' },
    { name: 'AI', description: 'AI-powered analysis and code generation' },
    { name: 'GitHub', description: 'GitHub integration endpoints' },
    { name: 'Integrations', description: 'Third-party service integrations' },
    { name: 'Enterprise', description: 'Enterprise-grade features' },
  ],
};

export async function GET(req: NextRequest) {
  const accept = req.headers.get('accept') || '';
  
  // Return JSON spec
  return Response.json(API_SPEC, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
