'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

function ChartWrapper({ children, width = '100%', height = '100%' }: { children: React.ReactNode; width?: string | number; height?: string | number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          setDimensions({ width: offsetWidth, height: offsetHeight });
        }
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!dimensions) {
    return <div ref={containerRef} style={{ width, height, minWidth: 200, minHeight: 150 }} />;
  }

  return (
    <div ref={containerRef} style={{ width, height }}>
      {children}
    </div>
  );
}
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeProvider';
import { FullScanResult, ChatMessage, SimulationResult, Recommendation } from '@/lib/types';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getScoreColor, getGradeColor, calculateFrictionCost } from '@/lib/scoring';
import { useSounds } from '@/lib/sounds';
import { useSurgeonVoice } from '@/lib/speech';
import { EKGMonitor, EKGMonitorMini } from '@/components/EKGMonitor';
import { MedicalCertificate } from '@/components/MedicalCertificate';
import { CodeAutopsy } from '@/components/CodeAutopsy';
import { FailureReplay } from '@/components/FailureReplay';
import { EngineeringDNA } from '@/components/EngineeringDNA';
import { SurgeryTab } from './tabs/SurgeryTab';
import { AutopsyReplay } from './components/AutopsyReplay';
import { InteractivePipeline, PipelineStage } from './components/InteractivePipeline';
import { ClinicalTour } from './components/ClinicalTour';
import { PatientMonitor } from './components/PatientMonitor';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Treemap,
  PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, CartesianGrid,
  ComposedChart, Area
} from 'recharts';


const CHART_COLORS = ['var(--scan-cyan)', 'var(--health-green)', 'var(--warning-amber)', 'var(--warning-orange)', 'var(--critical-red)', 'var(--purple)'];
const DORA_COLORS: Record<string, string> = { ELITE: 'var(--health-green)', HIGH: 'var(--scan-cyan)', MEDIUM: 'var(--warning-amber)', LOW: 'var(--critical-red)' };

const CustomTooltip = { background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-primary)', fontSize: '0.8rem', padding: '10px 14px' };

function EmptyClinicalState({ icon, title, description, badge, suggestedRepos = [] }: { icon: string, title: string, description: string, badge?: string, suggestedRepos?: string[] }) {
  return (
    <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '64px 32px', border: '1px dashed rgba(0,229,255,0.2)', background: 'linear-gradient(180deg, rgba(0,229,255,0.02), transparent)' }}>
      <div style={{ fontSize: '4rem', marginBottom: 20, filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.2))' }}>{icon}</div>
      {badge && <div className="badge badge-medium" style={{ marginBottom: 16 }}>{badge}</div>}
      <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 900, marginBottom: 12, letterSpacing: '-0.01em' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6, fontWeight: 500 }}>
        {description}
      </p>
      
      {suggestedRepos.length > 0 && (
        <div style={{ 
          background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', 
          borderRadius: 16, padding: '20px 32px', maxWidth: 500, margin: '0 auto 24px',
          textAlign: 'left'
        }}>
          <p style={{ color: 'var(--scan-cyan)', fontSize: '0.75rem', fontWeight: 900, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>🔬 Suggested Tissue Samples</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestedRepos.map(repo => (
              <button 
                key={repo}
                className="btn btn-ghost"
                onClick={() => window.location.href = `/dashboard?repo=${repo}`}
                style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, fontWeight: 700 }}
              >
                {repo} →
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', fontWeight: 500 }}>
        💡 Insight: Diagnostic sensors require historical commit logs and workflow metadata to generate high-fidelity telemetry.
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [result, setResult] = useState<FullScanResult | null>(null);
  const [vsResult, setVsResult] = useState<FullScanResult | null>(null);
  const [showDuel, setShowDuel] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'cicd' | 'reviews' | 'heatmap' | 'deps' | 'necrosis' | 'security' | 'projection' | 'duel' | 'forecast' | 'surgery' | 'badge' | 'timemachine' | 'geneticdrift' | 'history' | 'teamxray' | 'fleet' | 'pathology' | 'autopsy' | 'replay' | 'dna' | 'quality' | 'flow' | 'environment'>('overview');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [simChecked, setSimChecked] = useState<Record<string, boolean>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [hourlyRate, setHourlyRate] = useState(75);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);
  const [isSkeleton, setIsSkeleton] = useState(false);
  const [pipelineScoreBoost, setPipelineScoreBoost] = useState(0);
  const [pipelineSavings, setPipelineSavings] = useState(0);
  const [dxScoreGlow, setDxScoreGlow] = useState(false);
  const [fixPrLoading, setFixPrLoading] = useState<string | null>(null);
  const surgeryInProgress = fixPrLoading;
  const [prCreated, setPrCreated] = useState<{ url: string; number: number } | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  // RAG State
  const [chatMode, setChatMode] = useState<'diagnostics' | 'codebase'>('diagnostics');
  const [ragIndexed, setRagIndexed] = useState(false);
  const [ragIndexing, setRagIndexing] = useState(false);
  const [ragProgress, setRagProgress] = useState('');
  const [ragSources, setRagSources] = useState<{filePath: string; startLine: number; endLine: number; relevanceScore: number}[]>([]);
  const [isXrayMode, setIsXrayMode] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');
  const [pendingSurgery, setPendingSurgery] = useState<{ title: string; severity: string; initialCode?: string } | null>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [isPreparingPR, setIsPreparingPR] = useState(false);
  const [prPrepared, setPrPrepared] = useState(false);

  
  const [showAutopsy, setShowAutopsy] = useState(false);
  const [autopsyData, setAutopsyData] = useState<any>(null);
  
  const { playScoreChime, startHospitalAmbience, stopHospitalAmbience } = useSounds();
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const { speakDiagnosis, cancel: cancelVoice } = useSurgeonVoice();

  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [expandedFix, setExpandedFix] = useState<string | null>(null); // which fix diff is expanded
  const [fixSuccess, setFixSuccess] = useState<Record<string, { url: string; number: number }>>({}); // PR created successes
  const [showEmailToast, setShowEmailToast] = useState(false);
  const [isEmailPromptOpen, setIsEmailPromptOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Voice triggers
  const scanSpokenRef = useRef(false);
  useEffect(() => {
    if (result && !scanSpokenRef.current) {
      const repoName = result.repo?.fullName || 'repository';
      const severity = result.dxScore < 40 ? 'CRITICAL' : result.dxScore < 60 ? 'HIGH' : 'MEDIUM';
      speakDiagnosis(result.dxScore, result.grade, severity, repoName);
      scanSpokenRef.current = true;
    }
  }, [result, speakDiagnosis]);

  // Hospital ambient soundscape

  useEffect(() => {
    if (ambientEnabled) {
      startHospitalAmbience();
    } else {
      stopHospitalAmbience();
    }
    return () => {
      stopHospitalAmbience();
    };
  }, [ambientEnabled, startHospitalAmbience, stopHospitalAmbience]);

  // X-Ray Deep Zoom state
  const [deepZoomLevel, setDeepZoomLevel] = useState(0);
  const [hoveredFile, setHoveredFile] = useState<any>(null);
  const [zoomPath, setZoomPath] = useState<string[]>([]);
  const deepZoomCanvasRef = useRef<HTMLCanvasElement>(null);

  // Badge state
  const [badgeCopied, setBadgeCopied] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [cicdSortKey, setCicdSortKey] = useState<'name' | 'successPerformance' | 'duration'>('duration');
  const [cicdSortOrder, setCicdSortOrder] = useState<'asc' | 'desc'>('desc');

  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([
    { id: 'install', name: 'Install', icon: '📦', duration: 5, enabled: true, parallelizable: false },
    { id: 'lint', name: 'Lint', icon: '🔍', duration: 3, enabled: true, parallelizable: true },
    { id: 'test', name: 'Test', icon: '🧪', duration: 8, enabled: true, parallelizable: true },
    { id: 'build', name: 'Build', icon: '🏗️', duration: 4, enabled: true, parallelizable: false },
    { id: 'deploy', name: 'Deploy', icon: '🚀', duration: 6, enabled: true, parallelizable: false },
  ]);

  const recentFailures = [
    { id: '1042', stage: 'Test', file: 'src/app/api/auth.ts', line: '42', author: 'urjit', time: '2h ago', logSnippet: 'Error: Connection refused at src/app/api/auth.ts:42\n    at async handleLogin (auth.ts:15)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)' },
    { id: '1039', stage: 'Build', file: 'src/components/EKGMonitor.tsx', line: '128', author: 'dev-alpha', time: '5h ago', logSnippet: 'TypeError: Cannot read properties of undefined (reading "bpm")\n    at EKGMonitor (EKGMonitor.tsx:128)\n    at renderWithHooks (react-dom.development.js:16305)' }
  ];

  const handleAutopsy = (failure: any) => {
    setAutopsyData({
      runId: failure.id,
      file: failure.file,
      line: failure.line,
      logs: failure.logSnippet || 'No logs available.',
      author: failure.author
    });
    setShowAutopsy(true);
  };

  const handlePipelineScoreUpdate = useCallback((boost: number, savings: number) => {
    setPipelineScoreBoost(boost);
    setPipelineSavings(savings);
    setDxScoreGlow(true);
    setTimeout(() => setDxScoreGlow(false), 500);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isDemo = params.get('demo') === 'true';
    let stored = sessionStorage.getItem('devmri_result');
    const storedVs = sessionStorage.getItem('devmri_vs_result');
    
    // Check if existing data is missing new 8-track fields or advanced diagnostics
    let needsRefresh = false;
    if (stored) {
      try {
        const p = JSON.parse(stored);
        const hasAllTracks = p.flow && p.quality && p.environment;
        const hasAdvancedDiag = p.heatmap && p.necrosis;
        if (!hasAllTracks || !hasAdvancedDiag) needsRefresh = true;
      } catch { needsRefresh = true; }
    }

    if (needsRefresh) {
      if (isDemo) {
        import('@/lib/mockData').then(({ MOCK_SCAN_RESULT }) => {
          sessionStorage.setItem('devmri_result', JSON.stringify(MOCK_SCAN_RESULT));
          window.location.reload();
        });
        return;
      } else {
        // If live data is stale, we can't just mock it. 
        // We'll clear it and send them to the scan page to get fresh 8-track data.
        sessionStorage.removeItem('devmri_result');
        router.push('/');
        return;
      }
    }

    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored) as FullScanResult;
    setResult(parsed);
    
    if (storedVs) {
      setVsResult(JSON.parse(storedVs) as FullScanResult);
      setActiveTab('duel');
      setShowDuel(true);
    }

    // Animate score with easing
    const target = parsed.dxScore;
    const duration = 1800;
    const startTime = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentScore = Math.round(easeOut(progress) * target);
      setAnimatedScore(currentScore);
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else if (target >= 80) {
        // 🎉 Trigger celebration for A-Grade repos
        playScoreChime();
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['var(--scan-cyan)', 'var(--health-green)', '#ffffff']
        });
      }
    };
    requestAnimationFrame(tick);
  }, [router, showDuel, playScoreChime]);

  // Index codebase for RAG
  const indexCodebase = async () => {
    if (!result || ragIndexing) return;
    setRagIndexing(true);
    setRagProgress('Starting codebase indexing...');
    try {
      const [owner, repo] = result.repo.fullName.split('/');
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'index', owner, repo }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'progress') setRagProgress(data.message);
                if (data.type === 'complete') { setRagIndexed(true); setRagProgress(`✅ Indexed ${data.fileCount} files (${data.chunkCount} chunks)`); }
                if (data.type === 'error') setRagProgress(`❌ ${data.message}`);
              } catch { /* Skip */ }
            }
          }
        }
      }
    } catch { setRagProgress('❌ Indexing failed'); }
    setRagIndexing(false);
  };

  const sendChat = async (overrideMessage?: string) => {
    const msg = (overrideMessage || chatInput).trim();
    if (!msg || !result || chatLoading) return;
    setChatInput('');
    setRagSources([]);
    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);
    
    const aiMsg: ChatMessage = { role: 'ai', content: '', timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, aiMsg]);
    setChatLoading(true);
    
    const isRAG = chatMode === 'codebase' && ragIndexed;
    const endpoint = isRAG ? '/api/rag' : '/api/ai/chat';
    const body = isRAG
      ? { action: 'query', repoKey: result.repo.fullName, question: msg, history: chatMessages.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', content: m.content })) }
      : { message: msg, scanResults: result, history: chatMessages };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk') {
                  accumulated += data.content;
                  setChatMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { ...aiMsg, content: accumulated };
                    return newMsgs;
                  });
                }
                if (data.type === 'sources') setRagSources(data.sources || []);
              } catch { /* Skip invalid JSON */ }
            }
          }
        }
      }
    } catch {
      setChatMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { role: 'ai', content: 'Connection error. Please try again.', timestamp: new Date().toISOString() };
        return newMsgs;
      });
    }
    setChatLoading(false);
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  const handleSpeakDiagnosis = async () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      cancelVoice();
      return;
    }

    if (!result) return;

    setIsSpeaking(true);
    
    const intro = `Doctor's Briefing for repository ${result.repo.fullName}. `;
    const scoreText = `Overall DX score is ${result.dxScore}, receiving a grade ${result.grade}. `;
    const frictionText = `I've detected monthly friction costs of approximately ${frictionCost.total.toLocaleString()} dollars. `;
    
    const recs = result.aiDiagnosis?.recommendations.slice(0, 2).map(r => 
      `${r.severity} priority: ${r.title}. It's costing about ${r.frictionCost.toLocaleString()} per month.`
    ).join(' ') || '';

    const closure = "Review the full recovery plan below to reclaim lost developer hours.";
    
    const utterance = new SpeechSynthesisUtterance(intro + scoreText + frictionText + recs + closure);
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const copyShareLink = () => {
    if (!result) return;
    const url = new URL(window.location.origin);
    url.pathname = '/scanning';
    url.searchParams.set('repo', result.repo.fullName);
    if (vsResult) url.searchParams.set('vs', vsResult.repo.fullName);
    
    navigator.clipboard.writeText(url.toString());
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const createFixPR = async (fixType: string, title: string, description: string, filePath: string, fileContent: string) => {
    if (!result) return;
    setFixPrLoading(fixType);
    try {
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: result.repo.owner,
          repo: result.repo.repo,
          fixType,
          title,
          description,
          filePath,
          fileContent,
          baseBranch: result.repo.defaultBranch,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrCreated({ url: data.prUrl, number: data.prNumber });
        setTimeout(() => setPrCreated(null), 8000);
      } else {
        alert(`Failed to create PR: ${data.error}`);
      }
    } catch {
      alert('Failed to create fix PR');
    }
    setFixPrLoading(null);
  };
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [isVocalListening, setIsVocalListening] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // CMD+K Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Team X-Ray data fetch
  useEffect(() => {
    if (result && !teamData && !teamLoading) {
      setTeamLoading(true);
      fetch(`/api/team?repo=${result.repo.fullName}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) setTeamError(data.error);
          else setTeamData(data);
        })
        .catch(e => setTeamError(e.message))
        .finally(() => setTeamLoading(false));
    }
  }, [result, teamData, teamLoading]);

  // Vocal Surgery
  const triggerVocalSurgery = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser. Simulation enabled.");
      handleVoiceCommand("Improve build speed and add linting");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsVocalListening(true);
    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript;
      handleVoiceCommand(command);
    };
    recognition.onend = () => setIsVocalListening(false);
    recognition.start();
  };

  const handleVoiceCommand = async (command: string) => {
    if (!result) return;
    setPendingSurgery({
      title: `VOCAL_COMMAND: ${command.toUpperCase()}`,
      severity: 'MEDIUM',
      initialCode: `// VOCAL_SURGERY_INITIATED\n// RECONSTRUCTING_TISSUE_FROM_VOICE...\n\n// Command: "${command}"`
    });
    setActiveTab('surgery');
  };

  // Persistence: Save to Scan History
  useEffect(() => {
    if (!result) return;
    const history = JSON.parse(localStorage.getItem('devmri_history') || '[]');
    const isNew = !history.some((h: any) => h.repo === result.repo.fullName);
    if (isNew) {
      const newEntry = { 
        repo: result.repo.fullName, 
        score: result.dxScore, 
        grade: result.grade, 
        date: new Date().toISOString() 
      };
      const updated = [newEntry, ...history].slice(0, 10);
      localStorage.setItem('devmri_history', JSON.stringify(updated));
      setScanHistory(updated);
    } else {
      setScanHistory(history);
    }
  }, [result]);

  const sendEmailReport = async () => {
    if (!result || !targetEmail) return;
    
    setIsSendingEmail(true);
    try {
      const resp = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          result: result,
          frictionCost: frictionCost
        })
      });
      
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      setShowEmailToast(true);
      setTimeout(() => setShowEmailToast(false), 4000);
      setIsEmailPromptOpen(false);
      setTargetEmail('');
    } catch (e: any) {
      alert("Diagnostic shipment failed: " + e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const [fixingRec, setFixingRec] = useState<string | null>(null);
  const [fixStatus, setFixStatus] = useState<Record<string, { success: boolean; message: string; url?: string; number?: number } | null>>({});

  if (!result) return null;

  const { dxScore, grade, scores, cicd, reviews, deps, dora, busFactor, heatmap, necrosis, security, commitHygiene, simulation, aiDiagnosis } = result;
  const scoreColor = getScoreColor(dxScore);
  const gradeColor = getGradeColor(grade);

  // Recalculate friction cost with adjustable hourly rate
  const frictionCost = calculateFrictionCost(cicd, reviews, deps, hourlyRate);

  // Simulation calculation (includes interactive pipeline boost - Feature #2)
  const enabledSims = simulation.filter(s => simChecked[s.fixType]);
  const simScoreBoost = enabledSims.reduce((sum, s) => sum + s.scoreChange, 0);
  const simSavings = enabledSims.reduce((sum, s) => sum + s.monthlySavings, 0);
  const totalScoreBoost = simScoreBoost + pipelineScoreBoost;
  const totalSavings = simSavings + (pipelineSavings * hourlyRate * 4);
  const projectedScore = Math.min(100, dxScore + totalScoreBoost);

  const sev = (s: string) => s === 'CRITICAL' ? 'badge-critical' : s === 'HIGH' ? 'badge-high' : s === 'MEDIUM' ? 'badge-medium' : 'badge-low';

  // Radar data for Duel
  const duelRadarData = vsResult ? [
    { subject: 'CI/CD', A: result.scores.cicd, B: vsResult.scores.cicd },
    { subject: 'Reviews', A: result.scores.reviews, B: vsResult.scores.reviews },
    { subject: 'Silo Risk', A: 100 - (result.busFactor?.busFactor || 0) * 20, B: 100 - (vsResult.busFactor?.busFactor || 0) * 20 },
    { subject: 'Sec', A: result.scores.deps, B: vsResult.scores.deps },
    { subject: 'Overall', A: result.dxScore, B: vsResult.dxScore },
  ] : [];

  const exportClinicalReport = () => {
    window.print();
  };

  const downloadPDFReport = () => {
    const printContent = document.createElement('div');
    const reportId = `MRI-${result.timestamp.replace(/[-:T.Z]/g, '').slice(0, 12)}`;
    const date = new Date(result.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    printContent.innerHTML = `
      <div style="font-family: 'JetBrains Mono', monospace; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; background: #fff;">
        <div style="text-align: center; border-bottom: 3px solid var(--scan-cyan); padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="font-size: 28px; color: var(--scan-cyan);">⚕️🧠 DevMRI Clinical Diagnostic</h1>
          <p style="color: #666; margin: 8px 0 0;">Engineering Health Report & Friction Analysis</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding: 20px; background: #f5f5f5; border-radius: 12px;">
          <div>
            <p style="margin: 0; color: #666; font-size: 12px;">REPORT ID</p>
            <p style="margin: 4px 0 0; font-weight: bold; color: #1a1a1a;">${reportId}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: #666; font-size: 12px;">GENERATED</p>
            <p style="margin: 4px 0 0; font-weight: bold; color: #1a1a1a;">${date}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 20px; color: #1a1a1a; margin: 0 0 16px;">Repository: ${result.repo.fullName}</h2>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <span style="background: #f0f0f0; padding: 4px 12px; border-radius: 20px; font-size: 12px;">⭐ ${result.repo.stars.toLocaleString()} stars</span>
            <span style="background: #f0f0f0; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${result.repo.language || 'N/A'}</span>
            <span style="background: #f0f0f0; padding: 4px 12px; border-radius: 20px; font-size: 12px;">Branch: ${result.repo.defaultBranch}</span>
          </div>
        </div>
        
        <div style="display: flex; gap: 24px; margin-bottom: 30px;">
          <div style="flex: 1; text-align: center; padding: 24px; background: ${scoreColor}15; border: 2px solid ${scoreColor}; border-radius: 16px;">
            <div style="font-size: 48px; font-weight: 900; color: ${scoreColor}; margin: 0; line-height: 1;">${dxScore}</div>
            <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">DX Score</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 24px; background: ${gradeColor}15; border: 2px solid ${gradeColor}; border-radius: 16px;">
            <div style="font-size: 48px; font-weight: 900; color: ${gradeColor}; margin: 0; line-height: 1;">${grade}</div>
            <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Grade</div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; color: #1a1a1a; margin: 0 0 16px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Module Scores</h3>
          ${Object.entries(scores).map(([key, value]) => `
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f5f5f5;">
              <span style="text-transform: capitalize; color: #444;">${key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span style="font-weight: bold; color: ${getScoreColor(value as number)};">${value as number}</span>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; color: #1a1a1a; margin: 0 0 16px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Friction Cost Analysis</h3>
          <div style="padding: 16px; background: #fff5f5; border-radius: 8px; border-left: 4px solid var(--critical-red);">
            <div style="font-size: 24px; font-weight: 900; color: var(--critical-red); margin: 0;">$${frictionCost.total.toLocaleString()}</div>
            <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Monthly Developer Friction Cost</p>
          </div>
        </div>
        
        ${aiDiagnosis?.recommendations && aiDiagnosis.recommendations.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; color: #1a1a1a; margin: 0 0 16px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Top Recommendations</h3>
            ${aiDiagnosis.recommendations.slice(0, 3).map((rec, idx) => `
              <div style="padding: 12px; background: #f9f9f9; border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-weight: 600; color: #1a1a1a;">${rec.title}</span>
                  <span style="background: ${rec.severity === 'CRITICAL' ? 'var(--critical-red)' : rec.severity === 'HIGH' ? 'var(--warning-orange)' : 'var(--warning-amber)'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px;">${rec.severity}</span>
                </div>
                <p style="margin: 0; color: #666; font-size: 13px;">${rec.description}</p>
                <p style="margin: 8px 0 0; color: var(--warning-orange); font-size: 13px;">Potential savings: $${rec.frictionCost.toLocaleString()}/mo</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; margin-top: 40px;">
          <p style="color: #999; font-size: 12px; margin: 0;">Generated by DevMRI — Scan your repositories at devmri.com</p>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>DevMRI Report - ${result.repo.fullName}</title>
            <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;900&display=swap" rel="stylesheet">
            <style>
              @media print {
                body { margin: 0; }
                @page { margin: 0.5in; }
              </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };


  const handleApplyFix = async (rec: any) => {
    if (!rec) return;
    const recId = rec.title;
    setFixingRec(recId);
    setFixStatus(prev => ({ ...prev, [recId]: null }));
    try {
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: result.repo.owner,
          repo: result.repo.repo,
          fixType: rec.metric || 'ci_optimization',
          title: rec.title || 'DevMRI Auto-Fix',
          description: rec.description || '',
          filePath: `.devmri/${(rec.metric || 'fix').replace(/\s+/g, '_').toLowerCase()}-fix.yml`,
          fileContent: rec.codeExample || `# DevMRI Auto-Fix: ${rec.title}\n# Generated by DevMRI Diagnostic Platform\n\n${rec.description || ''}`,
          baseBranch: result.repo.defaultBranch || 'main',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFixStatus(prev => ({ ...prev, [recId]: { success: true, message: 'PR Created.', url: data.prUrl, number: data.prNumber } }));
        setTimeout(() => setPrCreated(null), 8000);
      } else {
        setFixStatus(prev => ({ ...prev, [recId]: { success: false, message: data.error || 'Operation Failed.' } }));
      }
    } catch (err) {
      setFixStatus(prev => ({ ...prev, [recId]: { success: false, message: 'Neural connection failed.' } }));
    } finally {
      setFixingRec(null);
    }
  };

  const sendToSlack = async () => {
    const webhook = prompt('Enter Slack/Discord Webhook URL:', slackWebhook);
    if (!webhook) return;
    setSlackWebhook(webhook);
    
    const payload = {
      text: `🏥 *DevMRI Diagnostic Report: ${result.repo.fullName}*\n\n*Overall Health:* \`${result.dxScore}/100\` (Grade ${result.grade})\n\n*Top Recommendations:*\n${(result.aiDiagnosis?.recommendations || []).slice(0, 3).map((r: any) => `• *${r.title}* (${r.severity})`).join('\n')}\n\n*Monthly Friction Cost:* $${frictionCost.total.toLocaleString()}\n\n🔗 _View full report at DevMRI_`,
    };

    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });
      alert('Clinical report dispatched to Slack/Discord!');
    } catch (err) {
      alert('Failed to dispatch report. Check webhook URL.');
    }
  };

  const TabButtonUI = ({ id, label, icon, currentTab, onTabChange }: { id: string; label: string; icon: string; currentTab: string; onTabChange: (id: any) => void }) => {
    const isActive = currentTab === id;
    const getIcon = () => {
      if (icon) return icon;
      switch(id) {
        case 'overview': return '📊';
        case 'surgery': return '🚀';
        case 'cicd': return '🔄';
        case 'reviews': return '👥';
        case 'heatmap': return '🔥';
        case 'deps': return '📦';
        case 'teamxray': return '🔬';
        case 'security': return '🛡️';
        case 'fleet': return '🏢';
        case 'forecast': return '📈';
        case 'timemachine': return '🕰️';
        case 'geneticdrift': return '🧬';
        case 'necrosis': return '💀';
        case 'pathology': return '🔎';
        case 'autopsy': return '💀';
        case 'replay': return '🔥';
        case 'dna': return '🧬';
        case 'history': return '📜';
        case 'projection': return '📽️';
        case 'badge': return '🏅';
        case 'duel': return '⚔️';
        default: return '💠';
      }
    };

    return (
      <button
        onClick={() => onTabChange(id)}
        style={{
          background: isActive ? 'rgba(0,229,255,0.08)' : 'transparent',
          border: 'none',
          borderBottom: isActive ? '3.5px solid var(--scan-cyan)' : '3.5px solid transparent',
          color: isActive ? 'var(--scan-cyan)' : 'var(--text-muted)',
          padding: '14px 24px',
          fontSize: '0.82rem',
          fontWeight: isActive ? 900 : 600,
          cursor: 'pointer',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-display)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderRadius: '16px 16px 0 0',
          position: 'relative',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          filter: isActive ? 'drop-shadow(0 0 8px rgba(0,229,255,0.2))' : 'none',
        }}
        onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <span style={{ 
          fontSize: '1.1rem', 
          opacity: isActive ? 1 : 0.6,
          transition: 'transform 0.3s'
        }}>
          {getIcon()}
        </span>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <main role="main" aria-label="DevMRI Dashboard" style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <div className="scan-monitor-overlay" style={{ minHeight: '100vh', padding: '32px 24px 64px' }}>
      {showShareToast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--scan-cyan)', color: '#000810', padding: '12px 24px', borderRadius: 30,
          fontWeight: 700, boxShadow: '0 8px 32px rgba(0,229,255,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 8
        }} className="animate-fade-in">
          <span>🔗</span> Link copied to clipboard!
        </div>
      )}
       {showEmailToast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--health-green)', color: '#000810', padding: '12px 24px', borderRadius: 30,
          fontWeight: 700, boxShadow: '0 8px 32px rgba(0,230,118,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 8
        }} className="animate-fade-in">
          <span>📧</span> Diagnostic Report Shipped via SendGrid!
        </div>
      )}

      {isEmailPromptOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)'
        }}>
          <div className="card" style={{ width: 420, padding: 32, textAlign: 'center', border: '1px solid var(--scan-cyan)', boxShadow: '0 0 40px rgba(0,229,255,0.2)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚕️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 950, marginBottom: 8, color: 'var(--scan-cyan)' }}>SHIP DIAGNOSTIC DATA</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 24 }}>Enter recipient address for clinical report</p>
            
            <input 
              type="email" 
              placeholder="clinical-review@team.com"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
                borderRadius: 12, padding: '14px 18px', color: '#fff', fontSize: '0.9rem', outline: 'none',
                marginBottom: 20, textAlign: 'center'
              }}
              onKeyDown={(e) => e.key === 'Enter' && sendEmailReport()}
              autoFocus
            />
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn-hero-primary" 
                onClick={sendEmailReport}
                disabled={isSendingEmail || !targetEmail}
                style={{ flex: 2, background: isSendingEmail ? 'var(--text-muted)' : 'var(--scan-cyan)' }}
              >
                {isSendingEmail ? '📡 SHIPPING...' : 'DISPATCH REPORT'}
              </button>
              <button 
                className="btn-hero-secondary" 
                onClick={() => setIsEmailPromptOpen(false)}
                style={{ flex: 1 }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {showCertificate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowCertificate(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <MedicalCertificate 
              repoName={result.repo.fullName} 
              dxScore={dxScore} 
              grade={grade}
              onClose={() => setShowCertificate(false)}
            />
          </div>
        </div>
      )}
      {/* ══════ TOOLS POPUP MODAL ══════ */}
      {showToolsModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          willChange: 'opacity',
        }} onClick={() => setShowToolsModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--bg-primary, #fff)',
            border: '1px solid var(--border-color, #e8e8ed)',
            borderRadius: 20,
            padding: '24px 20px',
            minWidth: 300,
            maxWidth: 360,
            boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
            transform: 'translateY(0)',
            willChange: 'transform, opacity',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #111)' }}>⚙️ Tools</h3>
              <button onClick={() => setShowToolsModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted, #999)', padding: '4px 8px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { icon: '🎵', label: 'Hospital Ambience', active: ambientEnabled, fn: () => setAmbientEnabled(!ambientEnabled) },
                { icon: '🦴', label: 'X-Ray Mode', active: isSkeleton, fn: () => setIsSkeleton(!isSkeleton) },
                { icon: '🌙', label: 'Night Shift', active: isXrayMode, fn: () => { setIsXrayMode(!isXrayMode); document.documentElement.classList.toggle('xray-mode-active'); } },
                { icon: '🎓', label: 'Start Induction', fn: () => { setShowTour(true); setTourStep(0); setShowToolsModal(false); } },
                { icon: '📋', label: 'Clinical Report', fn: () => { downloadPDFReport(); setShowToolsModal(false); } },
                { icon: '📧', label: 'Ship via Email', fn: () => { setIsEmailPromptOpen(true); setShowToolsModal(false); } },
                { icon: '💬', label: 'Slack / Discord', fn: () => { sendToSlack(); setShowToolsModal(false); } },
                { icon: '🏅', label: 'Certificate', fn: () => { setShowCertificate(true); setShowToolsModal(false); } },
              ].map((item, i) => (
                <button key={i} onClick={() => { item.fn(); if ((item as any).active !== undefined) {} else { /* non-toggle items close in fn */ } }} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', background: 'transparent', border: 'none',
                  color: (item as any).active ? 'var(--scan-cyan, #00b8d4)' : 'var(--text-primary, #333)',
                  padding: '12px 14px', borderRadius: 12, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s',
                  fontWeight: 500,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary, #f5f5fa)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {(item as any).active !== undefined && (
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800,
                      background: (item as any).active ? 'rgba(0,230,118,0.15)' : 'rgba(150,150,150,0.1)',
                      color: (item as any).active ? '#00e676' : 'var(--text-muted, #999)',
                    }}>
                      {(item as any).active ? 'ON' : 'OFF'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {prCreated && (
        <div className="pr-created-toast">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700 }}>PR Created Successfully!</div>
              <a 
                href={prCreated.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'white', textDecoration: 'underline', fontSize: '0.85rem' }}
              >
                View PR #{prCreated.number} →
              </a>
            </div>
          </div>
        </div>
      )}
      <div className={`container ${isSkeleton ? 'is-skeleton' : ''}`}>
        <PatientMonitor 
          dxScore={dxScore}
          grade={grade}
          frictionCost={frictionCost.total}
          repoName={result.repo.fullName}
          activeSurgery={fixPrLoading}
        />
        {/* PRINT ONLY HEADER */}
        <div className="clinical-report-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ color: '#000', margin: 0 }}>DevMRI Clinical Diagnostic</h1>
              <p style={{ color: '#666', marginTop: 4 }}>Engineering Health Report & Friction Analysis</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 700, color: '#000' }}>REPORT ID: MRI-{result.timestamp.replace(/[-:T.Z]/g, '').slice(0, 12)}</p>
              <p>Generated: {new Date(result.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ══════ COMMAND BAR ══════ */}
        <div className="no-print hero-command-bar">
           <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn-hero-ghost" onClick={() => router.push('/')}>← New Scan</button>
              <button className="btn-hero-ghost" onClick={() => router.push('/leaderboard')}>Leaderboard</button>
              <ThemeToggle />
           </div>
           <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn-hero-primary" onClick={() => { setActiveTab('surgery'); }}>
                🚀 Create Fix PR
              </button>
              <button className="btn-hero-secondary" onClick={copyShareLink}>
                {showShareToast ? '✓ Copied' : 'Share'}
              </button>
              <button className="btn-hero-secondary" onClick={() => setIsEmailPromptOpen(true)}>
                {showEmailToast ? '✓ Shipped' : '📧 Ship via Email'}
              </button>
              <button className="btn-hero-secondary" onClick={downloadPDFReport}>
                Export Report
              </button>
              <button className="btn-hero-ghost" onClick={() => setShowToolsModal(true)}>
                ⚙️ Tools
              </button>
           </div>
        </div>

        {/* ══════ PREMIUM HERO DIAGNOSTIC HUB ══════ */}
        <div className="hero-dashboard-section" style={{
          background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-surface) 60%, var(--bg-secondary))',
          borderRadius: 28,
          padding: '48px 56px',
          border: 'none',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 0.8fr',
          gap: 48,
          alignItems: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
          marginBottom: 36,
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          {/* Subtle gradient wash — Stitch "primary_fixed at 5% opacity" rule */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 30%, rgba(0,229,255,0.04), transparent 60%)', pointerEvents: 'none' }} />
          {/* Animated scan accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, var(--scan-cyan), transparent)', opacity: 0.4 }} />
          {/* HUD Background Watermark */}
          <div style={{ position: 'absolute', top: -30, right: -30, fontSize: '9rem', opacity: 0.025, fontWeight: 950, userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.04em', color: 'var(--scan-cyan)' }}>DX_RAY</div>
          
          {/* Left: Patient Record / Repo Identity */}
          <div className="hero-repo-info" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--scan-cyan)', textTransform: 'uppercase', fontWeight: 950, letterSpacing: '0.2em', marginBottom: 8 }}>DIAGNOSTIC_SUBJECT</div>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 950, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
              {result.repo.fullName.split('/')[1]}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 700 }}>{result.repo.fullName.split('/')[0]}</span>
              <span style={{ height: 4, width: 4, borderRadius: '50%', background: 'var(--scan-cyan-dim)' }} />
              <span>Scanned in <b>{result.scanDuration.toFixed(1)}s</b></span>
            </div>
            {!vsResult && (
              <button 
                className="btn-hero-primary" 
                onClick={handleSpeakDiagnosis} 
                style={{ 
                  marginTop: 24, padding: '12px 20px', fontSize: '0.85rem', 
                  background: isSpeaking ? 'var(--critical-red)' : 'linear-gradient(135deg, var(--scan-cyan), var(--scan-cyan-dim))' 
                }}
              >
                {isSpeaking ? '⏹ Intercept Audio' : '🔊 Narrative Diagnosis'}
              </button>
            )}
          </div>

          {/* Center: Economic Hemorrhage Telemetry */}
          <div 
            className="clickable-clinical-card" 
            onClick={() => setShowCostBreakdown(true)}
            style={{ 
              background: 'var(--bg-surface)',
              border: '1px solid var(--nav-border)',
              borderRadius: 24, padding: 32, textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
              position: 'relative', overflow: 'hidden',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #ff1744, transparent)', opacity: 0.5 }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
               <div className="pulse-dot" style={{ background: '#ff1744' }}></div>
               <span style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Cost of Inaction (Monthly)</span>
            </div>
            
            <div style={{ fontSize: '3.2rem', fontWeight: 950, color: '#ff1744', letterSpacing: '-0.02em', lineHeight: 1 }}>
              ${frictionCost.total.toLocaleString()}
            </div>
            
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 12, fontWeight: 700 }}>
              ⚖️ LOST TO ENGINEERING DRAG
            </div>
            
            <div style={{ marginTop: 20, fontSize: '0.6rem', color: 'var(--scan-cyan)', fontWeight: 800, textTransform: 'uppercase', textDecoration: 'underline' }}>
              View Breakdown Overview →
            </div>
          </div>

          {/* Right: DX Vital Core */}
          <div style={{ textAlign: 'center', position: 'relative' }}>
             <div style={{ 
               width: 140, height: 140, borderRadius: '50%', margin: '0 auto',
               border: `8px solid ${scoreColor}15`, borderTopColor: scoreColor,
               display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
               boxShadow: `0 0 40px ${scoreColor}10`,
               transition: 'all 1.5s cubic-bezier(0.19, 1, 0.22, 1)'
             }}>
                <div style={{ fontSize: '3rem', fontWeight: 950, color: scoreColor, lineHeight: 1 }}>{vsResult ? result.dxScore : animatedScore}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>VITALITY</div>
             </div>
             
             <div style={{ 
               marginTop: 20, display: 'inline-flex', padding: '6px 16px', 
               borderRadius: 100, background: `${scoreColor}12`, 
               border: `1.5px solid ${scoreColor}30`,
               fontSize: '0.85rem', fontWeight: 950, color: scoreColor 
             }}>
               GRADE {grade}
             </div>
             
             {vsResult && (
               <div style={{ position: 'absolute', bottom: -50, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12 }}>
                 <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>VS</div>
                 <div style={{ fontWeight: 900, color: getScoreColor(vsResult.dxScore) }}>{vsResult.dxScore} ({vsResult.repo.repo})</div>
               </div>
             )}
          </div>
        </div>


        {/* ——— PREMIUM DIAGNOSTIC TABS ——— */}
        <div style={{ 
          display: 'flex', gap: 4, marginBottom: 32, 
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          borderBottom: '1px solid var(--nav-border, rgba(255,255,255,0.05))',
          padding: '0 16px',
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
            <TabButtonUI id="overview" label="Overview" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="surgery" label="Surgery" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="heatmap" label="Heatmap" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="teamxray" label="Team DETAILS" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="cicd" label="CI/CD" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="reviews" label="Reviews" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="deps" label="Dependencies" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="quality" label="Code Quality" icon="🏗️" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="flow" label="Dev Flow" icon="👥" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="environment" label="Environment" icon="🔒" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="security" label="Security" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="fleet" label="Team" icon="🏢" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="forecast" label="ML Forecast" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="timemachine" label="Time Machine" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="geneticdrift" label="Ownership" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="necrosis" label="Dead Code" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="pathology" label="Prognosis" icon="🔎" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="autopsy" label="Autopsy" icon="💀" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="replay" label="Failure Replay" icon="🔥" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="dna" label="DNA" icon="🧬" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="history" label="History" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="projection" label="Projection" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            <TabButtonUI id="badge" label="Badge" icon="" currentTab={activeTab} onTabChange={setActiveTab} />
            {vsResult && <TabButtonUI id="duel" label="Duel Comparison" icon="⚔️" currentTab={activeTab} onTabChange={setActiveTab} />}
        </div>

        {/* ———————————— TAB: Duel Comparison ———————————— */}
        {activeTab === 'duel' && vsResult && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="grid-2">
              <div className="card" style={{ height: 400 }}>
                 <h4 style={{ marginBottom: 24, textAlign: 'center' }}>Comparative Diagnostic Radar</h4>
                 <ResponsiveContainer width="100%" height="80%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={duelRadarData}>
                      <PolarGrid stroke="var(--bg-surface)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name={result.repo.fullName}
                        dataKey="A"
                        stroke="var(--scan-cyan)"
                        fill="var(--scan-cyan)"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name={vsResult.repo.fullName}
                        dataKey="B"
                        stroke="var(--critical-red)"
                        fill="var(--critical-red)"
                        fillOpacity={0.3}
                      />
                      <Tooltip contentStyle={CustomTooltip} />
                    </RadarChart>
                 </ResponsiveContainer>
                 <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                      <div style={{ width: 12, height: 12, background: 'var(--scan-cyan)', borderRadius: 3 }} />
                      {result.repo.fullName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                      <div style={{ width: 12, height: 12, background: 'var(--critical-red)', borderRadius: 3 }} />
                      {vsResult.repo.fullName}
                    </div>
                 </div>
              </div>

              <div className="card">
                 <h3 style={{ marginBottom: 20 }}>Head-to-Head leaderboard</h3>
                 {[
                   { label: 'Overall DX Score', a: result.dxScore, b: vsResult.dxScore, unit: 'pts' },
                   { label: 'Monthly Friction Cost', a: frictionCost.total, b: calculateFrictionCost(vsResult.cicd, vsResult.reviews, vsResult.deps, hourlyRate).total, unit: '$', inverse: true },
                   { label: 'CI Speed (Avg)', a: result.cicd?.avgDurationMinutes || 0, b: vsResult.cicd?.avgDurationMinutes || 0, unit: 'm', inverse: true },
                   { label: 'Review Latency', a: result.reviews?.medianReviewTimeHours || 0, b: vsResult.reviews?.medianReviewTimeHours || 0, unit: 'h', inverse: true },
                   { label: 'Security Score', a: result.scores.deps, b: vsResult.scores.deps, unit: 'pts' },
                 ].map((m, i) => {
                   const aBetter = m.inverse ? m.a < m.b : m.a > m.b;
                   const isDraw = m.a === m.b;
                   return (
                     <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(0,229,255,0.06)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                         <span>{m.label}</span>
                         <span style={{ color: isDraw ? 'var(--text-muted)' : aBetter ? 'var(--scan-cyan)' : 'var(--critical-red)' }}>
                           {isDraw ? 'DRAW' : aBetter ? 'LHS LEADS' : 'RHS LEADS'}
                         </span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <div style={{ flex: 1, textAlign: 'right', fontWeight: 900, fontSize: '1.2rem', color: aBetter ? 'var(--scan-cyan)' : 'var(--text-primary)' }}>
                           {m.unit === '$' ? `$${m.a.toLocaleString()}` : `${m.a}${m.unit}`}
                         </div>
                         <div className="duel-vs-circle">VS</div>
                         <div style={{ flex: 1, textAlign: 'left', fontWeight: 900, fontSize: '1.2rem', color: !aBetter && !isDraw ? 'var(--critical-red)' : 'var(--text-primary)' }}>
                           {m.unit === '$' ? `$${m.b.toLocaleString()}` : `${m.b}${m.unit}`}
                         </div>
                       </div>
                     </div>
                   );
                 })}
                 
                 <div style={{ marginTop: 24, padding: 16, background: 'linear-gradient(90deg, rgba(0,229,255,0.05), rgba(255,23,68,0.05))', borderRadius: 12, border: '1px solid rgba(0,229,255,0.1)' }}>
                   <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                     🔎 <span style={{ color: 'var(--scan-cyan)', fontWeight: 800 }}>ECONOMIC DELTA:</span> 
                     {frictionCost.total < calculateFrictionCost(vsResult.cicd, vsResult.reviews, vsResult.deps, hourlyRate).total
                       ? ` LHS is cheaper to maintain. RHS has **$${(calculateFrictionCost(vsResult.cicd, vsResult.reviews, vsResult.deps, hourlyRate).total - frictionCost.total).toLocaleString()}/mo** of excess friction.`
                       : ` RHS is cheaper to maintain. LHS has **$${(frictionCost.total - (calculateFrictionCost(vsResult.cicd, vsResult.reviews, vsResult.deps, hourlyRate).total)).toLocaleString()}/mo** of excess friction.`}
                   </p>
                 </div>
              </div>
            </div>

            <div className="module-card" style={{ border: '1px solid rgba(0,229,255,0.15)', background: 'linear-gradient(135deg, rgba(0,229,255,0.05), transparent)' }}>
               <h3 style={{ marginBottom: 8 }}>The Duel Verdict</h3>
               <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                 {result.dxScore > vsResult.dxScore 
                   ? `Results show that ${result.repo.fullName} has a more mature developer experience pipeline, specifically outperforming in its overall workflow health.`
                   : `${vsResult.repo.fullName} has the competitive edge in this duel, primarily due to higher metrics across core DX diagnostic modules.`}
               </p>
            </div>
          </div>
        )}

        {/* ———————————— TAB: Surgery Theatre ———————————— */}
        {activeTab === 'surgery' && result && (
          <SurgeryTab 
            result={result}
            aiDiagnosis={result.aiDiagnosis}
            fixStatus={fixSuccess}
            handleApplyFix={handleApplyFix}
            fixingRec={fixPrLoading}
            createFixPR={createFixPR}
            triggerVocalSurgery={triggerVocalSurgery}
            isVocalListening={isVocalListening}
            pendingSurgery={pendingSurgery}
            onSurgeryTriggered={() => setPendingSurgery(null)}
          />
        )}
        {/* ———————————— TAB: X-Ray Deep Zoom (Friction Heatmap) ———————————— */}

        {activeTab === 'heatmap' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Breadcrumb zoom path */}
            {zoomPath.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <button className="btn btn-ghost" onClick={() => { setZoomPath([]); setDeepZoomLevel(0); }} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>🏠 Root</button>
                {zoomPath.map((p, i) => (
                  <React.Fragment key={i}>
                    <span style={{ color: 'var(--text-muted)' }}>›</span>
                    <button className="btn btn-ghost" onClick={() => { setZoomPath(zoomPath.slice(0, i + 1)); setDeepZoomLevel(i + 1); }} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--scan-cyan)' }}>{p}</button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Deep Zoom Visualization */}
            <div className="xray-viewport" style={{ height: 600, padding: 0, position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(180deg, #020509 0%, #060a14 40%, #0a0e1a 100%)' }}>
              {/* CT Ring — rotating scan ring border */}
              <div className="xray-ct-ring" />

              {/* Animated grid overlay with perspective */}
              <div className="xray-grid-overlay" />

              {/* Dual Scanning beams — crosshair sweep */}
              <div className="xray-scan-beam" />
              <div className="xray-scan-beam-v" />

              {/* Scan Status Badge — top center */}
              <div className="xray-scan-status">
                <div className="xray-scan-status-dot" />
                DEEP SCAN ACTIVE
              </div>

              {/* Corner HUD markers */}
              <div className="xray-corner-hud xray-corner-tl" />
              <div className="xray-corner-hud xray-corner-tr" />
              <div className="xray-corner-hud xray-corner-bl" />
              <div className="xray-corner-hud xray-corner-br" />

              {/* Telemetry HUD — top left */}
              <div className="xray-telemetry">
                <div>SCAN_TIME: {new Date().toLocaleTimeString()}</div>
                <div>FREQ: 2.4 GHz <span className="xray-telemetry-blink">▮</span></div>
                <div>HOTSPOTS: {heatmap?.hotspots?.length || 0}</div>
                <div>EXPOSURE: {Math.min(100, (heatmap?.hotspots?.length || 0) * 8)}%</div>
              </div>

              {/* Depth gauge — right side */}
              <div className="xray-depth-gauge">
                <div className="xray-depth-label">DEPTH</div>
                <div className="xray-depth-bar">
                  <div className="xray-depth-fill" style={{ height: `${Math.min(100, (heatmap?.hotspots?.length || 0) * 8)}%` }} />
                </div>
                <div className="xray-depth-value">{Math.min(100, (heatmap?.hotspots?.length || 0) * 8)}%</div>
              </div>

              {/* Exposure indicator — bottom right */}
              <div className="xray-exposure">
                EXP {Math.min(100, (heatmap?.hotspots?.filter((h: any) => h.risk === 'critical' || h.risk === 'high').length || 0) * 15)}mSv
              </div>

              {/* File blocks with radiation glow */}
              {!heatmap || heatmap.hotspots.length === 0 ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <EmptyClinicalState 
                    icon="☢️"
                    badge="NO_THERMAL_DATA"
                    title="Heatmap Logic Suppressed"
                    description="No significant commit frequency or file churn detected in the last scan period. The thermal engine requires a history of active file modifications to project friction hotspots."
                    suggestedRepos={['vercel/next.js', 'facebook/react']}
                  />
                </div>
              ) : (
                <div style={{ padding: '24px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, height: '100%', alignContent: 'start', overflowY: 'auto', paddingRight: 60 }}>
                {(heatmap?.hotspots || []).filter(h => {
                  if (zoomPath.length === 0) return true;
                  return h.path.startsWith(zoomPath.join('/'));
                }).map((h, i) => {
                  const intensity = Math.min(1, h.churn / 50);
                  const isHot = h.risk === 'critical' || h.risk === 'high';
                  const glowColor = isHot ? `rgba(255,23,68,${0.3 + intensity * 0.5})` : `rgba(0,229,255,${0.1 + intensity * 0.3})`;
                  const fileName = h.path.split('/').pop() || h.path;
                  const dirParts = h.path.split('/').slice(0, -1);
                  
                  return (
                    <div
                      key={i}
                      className={`xray-file-card ${isHot ? 'xray-file-hot' : 'xray-file-cool'}`}
                      onClick={() => {
                        setSelectedHotspot({ ...h, name: fileName, size: h.complexity });
                        if (dirParts.length > 0 && deepZoomLevel < dirParts.length) {
                          setZoomPath(dirParts);
                          setDeepZoomLevel(dirParts.length);
                        }
                      }}
                      onMouseEnter={() => setHoveredFile(h)}
                      onMouseLeave={() => setHoveredFile(null)}
                      style={{
                        animationDelay: `${i * 0.08}s`,
                        '--glow-color': glowColor,
                        '--intensity': intensity,
                      } as any}
                    >
                      {/* Radiation halo for hot files */}
                      {isHot && (
                        <>
                          <div className="xray-radiation-halo" style={{
                            background: `radial-gradient(circle, rgba(255,23,68,${intensity * 0.2}) 0%, transparent 70%)`,
                            animationDuration: `${3 - intensity * 1.5}s`,
                          }} />
                          {/* Danger zone ripples — expanding rings */}
                          <div className="xray-danger-ripple" />
                          <div className="xray-danger-ripple" />
                          <div className="xray-danger-ripple" />
                        </>
                      )}
                      {/* Bleeding indicator */}
                      {h.churn > 30 && <div className="xray-bleeding-dot" title="Internal Bleeding — High co-change frequency" />}
                      
                      {/* File icon */}
                      <div className="xray-file-icon" style={{ filter: isHot ? 'drop-shadow(0 0 8px rgba(255,23,68,0.6))' : 'drop-shadow(0 0 6px rgba(0,229,255,0.3))' }}>
                        {isHot ? '🔥' : fileName.endsWith('.ts') || fileName.endsWith('.tsx') ? '📄' : fileName.endsWith('.yml') || fileName.endsWith('.yaml') ? '⚙️' : fileName.endsWith('.json') ? '📊' : fileName.endsWith('.css') ? '🎨' : '📁'}
                      </div>
                      
                      {/* File name */}
                      <div className="xray-file-name">{fileName}</div>
                      
                      {/* Stats row */}
                      <div className="xray-file-stats">
                        <span>🔄 {h.churn}</span>
                        <span style={{ color: isHot ? '#ff3d60' : '#00e5ff' }}>${h.cost}</span>
                      </div>
                      
                      {/* Intensity bar */}
                      <div className="xray-intensity-track">
                        <div className="xray-intensity-fill" style={{ 
                          width: `${Math.min(100, intensity * 100)}%`,
                          background: isHot 
                            ? 'linear-gradient(90deg, #ff3d60, #ff6d00)' 
                            : 'linear-gradient(90deg, #00e5ff, #00e676)',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

              {/* Hover info panel — glassmorphic HUD */}
              {hoveredFile && (
                <div className="xray-hover-panel">
                  <div className="xray-hover-left">
                    <div className="xray-hover-path">{hoveredFile.path}</div>
                    <div className="xray-hover-meta">Owner: @{hoveredFile.owner} · {hoveredFile.churn} commits · Complexity: {hoveredFile.complexity}</div>
                  </div>
                  <div className="xray-hover-right">
                    <div className="xray-hover-cost" style={{ color: hoveredFile.risk === 'critical' ? '#ff3d60' : '#dfe2eb' }}>${hoveredFile.cost}/mo</div>
                    {hoveredFile.churn > 30 && <div className="xray-hover-bleed">🩸 Internal Bleeding Detected</div>}
                  </div>
                </div>
              )}

              {/* Legend bar */}
              <div className="xray-legend">
                <span><span className="xray-legend-dot" style={{ background: '#00e676' }} /> Healthy</span>
                <span><span className="xray-legend-dot" style={{ background: '#ff3d60' }} /> Inflammation</span>
                <span><span className="xray-legend-dot xray-legend-scanning" /> Scanning</span>
              </div>
            </div>
              {/* Grid overlay */}

            {/* Treemap + Hotspot Ranking — X-Ray Styled */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Friction Matrix — X-Ray Panel */}
              <div className="xray-panel heatmap-xray-panel" style={{ height: 380, position: 'relative', overflow: 'hidden', borderRadius: 16, padding: 0 }}>
                {/* Scan grid overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.02) 1px, transparent 1px)', backgroundSize: '30px 30px', pointerEvents: 'none', zIndex: 1 }} />
                {/* Moving scan line */}
                <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)', animation: 'surgeryScanLine 5s linear infinite', zIndex: 2, pointerEvents: 'none' }} />
                {/* Header */}
                <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,229,255,0.06)', position: 'relative', zIndex: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#00e5ff', letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono)' }}>☢️ FRICTION MATRIX</span>
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'rgba(0,229,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                    {heatmap?.hotspots?.length || 0} TARGETS
                  </div>
                </div>
                {/* Treemap */}
                <div style={{ padding: '8px 12px', height: 'calc(100% - 52px)', position: 'relative', zIndex: 3 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={heatmap?.hotspots.map(h => ({ name: h.path.split('/').pop(), size: h.complexity, cost: h.cost, path: h.path, owner: h.owner, risk: h.risk, churn: h.churn })) || []}
                      dataKey="size" aspectRatio={4 / 3} stroke="rgba(0,229,255,0.15)"
                      fill="rgba(0,229,255,0.25)"
                      onClick={(data) => setSelectedHotspot(data)}
                    >
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{ background: 'rgba(5,8,16,0.95)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                              <p style={{ fontWeight: 800, color: '#00e5ff', marginBottom: 4 }}>{data.path}</p>
                              <p style={{ color: 'rgba(255,255,255,0.6)' }}>🔄 {data.churn} commits · <span style={{ color: data.risk === 'critical' ? '#ff1744' : '#ffab00' }}>${data.cost}/mo</span></p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hotspot Ranking — X-Ray Panel */}
              <div className="hotspot-xray-panel" style={{ height: 380, borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,229,255,0.06)', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#00e5ff', letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono)' }}>🎯 HOTSPOT RANKING</span>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,23,68,0.6)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    SEVERITY ORDERED
                  </span>
                </div>
                {/* Scrollable list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }} className="custom-scrollbar">
                  {heatmap?.hotspots.map((h, i: number) => {
                    const isHot = h.risk === 'critical' || h.risk === 'high';
                    const glowColor = h.risk === 'critical' ? 'rgba(255,23,68,0.15)' : h.risk === 'high' ? 'rgba(255,171,0,0.1)' : 'rgba(0,229,255,0.06)';
                    const borderColor = h.risk === 'critical' ? 'rgba(255,23,68,0.3)' : h.risk === 'high' ? 'rgba(255,171,0,0.2)' : 'rgba(0,229,255,0.1)';
                    const dotColor = h.risk === 'critical' ? '#ff1744' : h.risk === 'high' ? '#ffab00' : '#00e5ff';
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedHotspot({ ...h, name: h.path.split('/').pop(), size: h.complexity })}
                        style={{
                          padding: '10px 14px',
                          marginBottom: 6,
                          borderRadius: 10,
                          background: glowColor,
                          border: `1px solid ${borderColor}`,
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${glowColor}`;
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: isHot ? `0 0 6px ${dotColor}` : 'none' }} />
                          <span className="hotspot-item-path" style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{h.path}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: isHot ? '#ff1744' : '#00e5ff', fontWeight: 800, flexShrink: 0, marginLeft: 12 }}>${h.cost}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* X-Ray Insight Banner */}
            <div className="xray-insight-banner" style={{ borderRadius: 14, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,171,0,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,171,0,0.01) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
               <h4 style={{ color: '#ffab00', marginBottom: 8, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono)', position: 'relative' }}>💡 X-RAY INSIGHT</h4>
               <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6, position: 'relative' }}>
                 Files with <span style={{ color: '#ff1744', fontWeight: 700 }}>🩸 Internal Bleeding</span> markers indicate co-change patterns — they are frequently modified alongside other buggy files. These are the surgical targets that will have the highest impact on overall codebase health.
               </p>
            </div>
          </div>
        )}

        {/* ———————————— TAB: Overview ———————————— */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Clinical Case Summary — WOW Factor for Judges */}
            <div className="module-card clinical-case-summary" style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(10,14,26,0.5) 100%)',
              border: '1px solid rgba(0,229,255,0.2)',
              padding: '24px 28px',
              borderRadius: 20,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Corner Accent */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'linear-gradient(225deg, var(--scan-cyan) 0%, transparent 60%)', opacity: 0.15 }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.65rem', fontWeight: 900, color: 'var(--scan-cyan)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    <span className="pulse-dot" style={{ background: 'var(--scan-cyan)', width: 8, height: 8, borderRadius: '50%' }} />
                    PRIMARY DIAGNOSTIC SUMMARY
                  </div>
                  <h3 style={{ margin: '8px 0 0', fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    {grade}-Grade Repository {dxScore < 40 ? 'Pathology' : dxScore < 70 ? 'Inflammation' : 'Condition'} Detected
                  </h3>
                </div>
                <div style={{ textAlign: 'right', minWidth: 160 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', opacity: 0.7 }}>CASE_ID: DX-{result.timestamp.replace(/[^0-9]/g, '').slice(0, 8)}</div>
                  <div style={{ fontSize: '0.65rem', color: dxScore < 40 ? 'var(--critical-red)' : dxScore < 70 ? 'var(--warning-orange)' : 'var(--health-green)', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 4 }}>STATUS: {dxScore > 70 ? 'STABLE' : dxScore > 40 ? 'INFLAMED' : 'CRITICAL'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
                <div style={{ paddingRight: 10 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workflow Trauma</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {result.cicd && result.cicd.avgDurationMinutes > 15 
                      ? `CI Pipeline exhibiting acute latency (${result.cicd.avgDurationMinutes}m). Estimated 24h/month wasted on synchronous blocking.` 
                      : `Workflow health is nominal. CI duration (${result.cicd?.avgDurationMinutes || 0}m) within acceptable performance limits.`}
                  </p>
                </div>
                <div style={{ paddingRight: 10 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Codebase Necrosis</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {necrosis && necrosis.riskScore > 40
                      ? `Advanced code rot identified (${necrosis.orphanedFiles.length} orphaned files). Significant increase in cognitive maintenance load.` 
                      : `Codebase hygiene is clinically healthy. No major orphaned logic paths detected.`}
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Genetic Stability</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {busFactor && busFactor.busFactor <= 2
                      ? `Critical Bus Factor risk detected (Score: ${busFactor.busFactor}). High knowledge silo concentration in core domains.` 
                      : `Knowledge distribution is resilient across multiple contributor domains.`}
                  </p>
                </div>
              </div>
            </div>

            {/* ——— PREMIUM DIAGNOSTIC METRICS ——— */}
            <div className="grid-3" style={{ gap: 24 }}>
              {/* Financial Hemorrhage Matrix */}
              <div className="card card-glow xray-card" style={{ 
                background: 'var(--bg-secondary)',
                borderRadius: 24, padding: 32,
                border: '1px solid var(--nav-border)',
                position: 'relative', overflow: 'hidden',
                justifyContent: 'center', display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ff1744' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 900, marginBottom: 4 }}>MONTHLY_FRICTION_DRAIN</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                      <h3 style={{ fontSize: '3rem', fontWeight: 950, color: '#ff1744', margin: 0, lineHeight: 1 }}>${frictionCost.total.toLocaleString()}</h3>
                      <span className="pulse-dot" style={{ background: '#ff1744', width: 6, height: 6, borderRadius: '50%' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 950, color: '#ff1744' }}>CRITICAL BLEED</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.6 }}>LOC_REF: 0xFF03_88</div>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '12px 0 20px', lineHeight: 1.5 }}>
                  This repository is exhibiting <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>acute financial drag</span> due to build bottlenecks and review latency.
                </p>

                <button 
                  onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                  className="btn-hero-ghost"
                  style={{ width: '100%', padding: '10px', fontSize: '0.75rem', border: '1px solid rgba(255,23,68,0.2)', color: '#ff1744' }}
                >
                  {showCostBreakdown ? 'CLOSE BREAKDOWN' : 'VIEW HEMORRHAGE DETAILS →'}
                </button>

                {showCostBreakdown && (
                  <div className="animate-fade-in" style={{ marginTop: 20, padding: 16, background: 'rgba(0,0,0,0.15)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>CI Pipeline:</span> <span style={{ fontWeight: 800 }}>${frictionCost.ciBottleneck.cost.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>PR Latency:</span> <span style={{ fontWeight: 800 }}>${frictionCost.reviewDelay.cost.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Security Dept:</span> <span style={{ fontWeight: 800 }}>${frictionCost.vulnerabilities.cost.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* DORA Surgical Telemetry */}
              <div className="card xray-card" style={{ 
                background: 'var(--bg-secondary)',
                borderRadius: 24, padding: 32,
                border: '1px solid var(--nav-border)',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 900 }}>DORA_METRICS_OUTPUT</div>
                  <div style={{ 
                    fontSize: '0.7rem', padding: '4px 12px', background: dora ? `${DORA_COLORS[dora.overallClassification]}15` : '#111', 
                    color: (dora && DORA_COLORS[dora.overallClassification]) || 'var(--text-muted)', 
                    borderRadius: 100, border: `1px solid ${dora ? DORA_COLORS[dora.overallClassification] : '#333'}30`,
                    fontWeight: 950, letterSpacing: '0.05em'
                  }}>
                    {dora?.overallClassification || 'UNKNOWN'} STATUS
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 16, flex: 1 }}>
                  {dora ? (
                    <>
                      {[
                        { label: 'Freq', val: `${dora.deploymentFrequency.value} ${dora.deploymentFrequency.unit}`, cls: dora.deploymentFrequency.classification },
                        { label: 'Lead', val: `${dora.leadTimeForChanges.medianHours}h`, cls: dora.leadTimeForChanges.classification },
                        { label: 'CFR', val: `${dora.changeFailureRate.percentage}%`, cls: dora.changeFailureRate.classification },
                        { label: 'MTTR', val: `${dora.meanTimeToRecovery.medianHours ?? 'N/A'}h`, cls: dora.meanTimeToRecovery.classification },
                      ].map((item, i) => (
                        <div key={i} style={{ 
                          padding: 16, background: 'var(--bg-surface)', 
                          borderRadius: 16, border: '1px solid var(--nav-border)',
                          borderLeft: `4px solid ${DORA_COLORS[item.cls]}`
                        }}>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase' }}>{item.label}</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 950, color: DORA_COLORS[item.cls], lineHeight: 1.1 }}>{item.val}</div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: 4 }}>{item.cls}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Diagnostic missing telemetry.</p>
                  )}
                </div>
              </div>

              {/* Prognosis Engine (Simulation) */}
              <div className="card" style={{ 
                background: 'var(--bg-secondary)',
                borderRadius: 24, padding: 32,
                border: '1px solid var(--nav-border)',
                display: 'flex', flexDirection: 'column',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--scan-cyan) 0%, transparent 100%)', opacity: 0.05 }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, position: 'relative' }}>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 900 }}>PROGNOSIS_SIMULATOR</div>
                   <span style={{ fontSize: '0.65rem', padding: '4px 10px', background: 'var(--scan-cyan-dim)', color: 'var(--scan-cyan)', borderRadius: 6, fontWeight: 900 }}>PROJECTED</span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, position: 'relative' }}>
                   <div style={{ 
                     width: 100, height: 100, borderRadius: '50%', 
                     border: '4px solid rgba(0,229,255,0.05)', borderTopColor: 'var(--scan-cyan)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center'
                   }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--scan-cyan)' }}>{projectedScore}</div>
                   </div>
                   
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                         <span style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--health-green)' }}>+${totalSavings.toLocaleString()}</span>
                         <span style={{ fontSize: '0.65rem', color: 'var(--health-green)', fontWeight: 800 }}>RECLAIMED/MO</span>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 8, fontWeight: 700, textTransform: 'uppercase' }}>
                        BASED ON {enabledSims.length + (pipelineScoreBoost > 0 ? 1 : 0)} OPTIMIZATIONS
                      </p>
                   </div>
                </div>

                <div style={{ marginTop: 24, fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', background: 'var(--bg-surface)', padding: '10px', borderRadius: 12, border: '1px solid var(--nav-border)' }}>
                   ⚡ Select fixes in the Decision Engine to update prognosis.
                </div>
              </div>
            </div>

            {/* Interactive Pipeline Simulator */}
            <div className="card" style={{ border: '1px solid rgba(0,229,255,0.15)' }}>
              <InteractivePipeline 
                stages={pipelineStages}
                onStagesChange={setPipelineStages}
                onScoreUpdate={handlePipelineScoreUpdate}
                failures={recentFailures}
                onAutopsy={handleAutopsy}
              />
            </div>

            {/* Radar & Health — STITCH PREMIUM */}
            <div className="grid-2">
              <div className="card" style={{ 
                height: 380, 
                background: 'linear-gradient(145deg, var(--bg-secondary), var(--bg-surface))',
                border: 'none',
                boxShadow: '0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Subtle radial glow */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, rgba(var(--scan-cyan-rgb), 0.04), transparent 65%)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 6, height: 24, borderRadius: 3, background: 'var(--scan-cyan)' }} />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.01em' }}>Diagnostic Radar</h4>
                </div>
                <ResponsiveContainer width="100%" height="82%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                    { subject: 'CI/CD', A: scores.cicd, full: 100 },
                    { subject: 'Reviews', A: scores.reviews, full: 100 },
                    { subject: 'Bus Factor', A: scores.busFactor, full: 100 },
                    { subject: 'Security', A: scores.security, full: 100 },
                    { subject: 'Overall', A: dxScore, full: 100 },
                  ]}>
                    <PolarGrid stroke="var(--bg-surface)" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="DX Score" dataKey="A" stroke="var(--scan-cyan)" fill="var(--scan-cyan)" fillOpacity={0.35} strokeWidth={2} />
                    <Tooltip contentStyle={CustomTooltip} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{
                background: 'linear-gradient(145deg, var(--bg-secondary), var(--bg-surface))',
                border: 'none',
                boxShadow: '0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 24, borderRadius: 3, background: (busFactor?.busFactor || 0) <= 2 ? 'var(--critical-red)' : 'var(--health-green)' }} />
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>Knowledge MRI (Bus Factor)</h4>
                  </div>
                  <div style={{ 
                    fontSize: '2.5rem', fontWeight: 950, fontFamily: 'var(--font-mono)',
                    color: (busFactor?.busFactor || 0) <= 2 ? 'var(--critical-red)' : 'var(--health-green)',
                    lineHeight: 1, letterSpacing: '-0.03em',
                    filter: `drop-shadow(0 0 12px ${(busFactor?.busFactor || 0) <= 2 ? 'rgba(255,23,68,0.2)' : 'rgba(0,230,118,0.2)'})`
                  }}>
                    {busFactor?.busFactor || 0}
                  </div>
                </div>
                
                <div style={{ marginBottom: 24 }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 14 }}>
                    {busFactor?.topContributors.length || 0} developers own <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>80%</span> of the commits.
                  </p>
                  <div style={{ display: 'flex', gap: 3, height: 14, borderRadius: 8, overflow: 'hidden' }}>
                    {busFactor?.topContributors.map((c, i) => (
                      <div key={i} style={{ 
                        width: `${c.percentage}%`, 
                        background: CHART_COLORS[i % CHART_COLORS.length],
                        transition: 'width 1s ease',
                      }} title={`${c.login}: ${c.percentage}%`} />
                    ))}
                    <div style={{ flex: 1, background: 'var(--bg-surface)' }} />
                  </div>
                </div>

                {/* Knowledge Silos — Stitch tonal rows */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.12em' }}>Critical Knowledge Silos</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--bg-surface)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {busFactor?.knowledgeSilos?.map((silo, i) => (
                    <div key={i} style={{ 
                      display: 'flex', alignItems: 'center', gap: 12, 
                      padding: '10px 14px', 
                      background: 'var(--bg-surface)',
                      borderRadius: 10,
                      borderLeft: `3px solid ${silo.risk === 'high' ? 'var(--critical-red)' : silo.risk === 'medium' ? 'var(--warning-amber)' : 'var(--text-muted)'}`,
                      transition: 'all 0.2s ease',
                    }}>
                       <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{silo.directory}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Sole Owner: @{silo.ownerlogin}</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: silo.risk === 'high' ? 'var(--critical-red)' : 'var(--warning-amber)' }}>{silo.ownershipPercentage}%</div>
                          <div style={{ 
                            fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.08em',
                            color: silo.risk === 'high' ? 'var(--critical-red)' : 'var(--text-muted)',
                          }}>{silo.risk}</div>
                       </div>
                    </div>
                  ))}
                </div>

                {/* Doc Health — Stitch amber accent */}
                {result.repo.docStalenessFactor > 0 && (
                  <div style={{ 
                    marginTop: 20, padding: '16px 18px', 
                    background: 'rgba(var(--warning-amber-rgb), 0.04)', 
                    borderRadius: 14, 
                    borderLeft: '3px solid var(--warning-amber)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h5 style={{ fontSize: '0.75rem', color: 'var(--warning-amber)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.06em', margin: 0 }}>Track C: Docs Freshness</h5>
                      <span className="badge badge-medium" style={{ fontSize: '0.6rem' }}>{result.repo.docStalenessFactor}% STALE</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ width: `${result.repo.docStalenessFactor}%`, height: '100%', background: 'linear-gradient(90deg, var(--warning-amber), var(--warning-orange))', borderRadius: 3 }} />
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      Documentation is drifting from the codebase. Maintenance overhead is increasing.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ⚡ DECISION ENGINE — STITCH PREMIUM CLINICAL HUD */}
            <div className="decision-engine-hud" style={{ 
              padding: '40px', 
              background: 'linear-gradient(145deg, var(--bg-secondary), var(--bg-surface) 50%, var(--bg-secondary))', 
              borderRadius: 28, 
              border: 'none', 
              marginTop: 24,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}>
               {/* Gradient wash */}
               <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 20%, rgba(0,229,255,0.03), transparent 50%)', pointerEvents: 'none' }} />
               {/* Top accent line */}
               <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--scan-cyan), transparent)', opacity: 0.3 }} />
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.65rem', fontWeight: 900, color: 'var(--scan-cyan)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
                       <span className="pulse-dot" style={{ background: 'var(--scan-cyan)', width: 8, height: 8, borderRadius: '50%' }} />
                       ADAPTIVE_REMEDIATION_ENGINE
                    </div>
                    <h3 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                      Surgical Targets
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-surface)', padding: '12px 20px', borderRadius: 16, border: '1px solid var(--nav-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hourly Rate Offset</span>
                    <input 
                      type="range" min="30" max="300" step="5" value={hourlyRate}
                      onChange={(e) => setHourlyRate(parseInt(e.target.value))}
                      className="surgical-slider"
                      style={{ width: 120 }}
                    />
                    <span style={{ color: 'var(--scan-cyan)', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 950 }}>${hourlyRate}<span style={{ fontSize: '0.7rem', opacity: 0.6 }}>/hr</span></span>
                  </div>
               </div>

               {/* Impact Assessment Banner — PREMIUM REFRACTIVE STYLE */}
               <div className="summary-banner-clinical" style={{ 
                 marginBottom: 40, padding: '32px 40px', 
                 background: 'rgba(var(--bg-primary-rgb), 0.4)', 
                 backdropFilter: 'blur(20px)',
                 border: '1px solid var(--nav-border)',
                 borderRadius: 24,
                 display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 40, alignItems: 'center'
               }}>
                 <div>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 900, marginBottom: 12 }}>TOTAL_ECONOMIC_DRAG</div>
                   <div style={{ fontSize: '2.8rem', fontWeight: 950, color: 'var(--critical-red)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                     ${frictionCost.total.toLocaleString()}
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: 6, letterSpacing: '0' }}>/MO</span>
                   </div>
                 </div>
                 
                 <div style={{ width: '1px', background: 'var(--nav-border)', height: 60 }}></div>

                 <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 900, marginBottom: 12 }}>PROJECTED_DX_RECOVERY</div>
                   <div style={{ fontSize: '2.8rem', fontWeight: 950, color: 'var(--health-green)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                     +{totalScoreBoost}
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: 6, letterSpacing: '0' }}>PTS</span>
                   </div>
                 </div>

                 <div style={{ width: '1px', background: 'var(--nav-border)', height: 60 }}></div>
                 
                 <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 900, marginBottom: 12 }}>RECLAIMABLE_CAPITAL</div>
                   <div style={{ fontSize: '2.8rem', fontWeight: 950, color: 'var(--scan-cyan)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                     +${totalSavings.toLocaleString()}
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: 6, letterSpacing: '0' }}>/MO</span>
                   </div>
                 </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {simulation.map((sim, i: number) => {
                    const recMatch = aiDiagnosis?.recommendations.find(r => r.metric.includes(sim.fixType));
                    const isExpanded = expandedFix === sim.fixType;
                    const isCreated = fixSuccess[sim.fixType];
                    const monthlyCost = Math.round(sim.monthlySavings * (hourlyRate / 75));
                    
                    return (
                      <div key={i} className="module-card-interactive" style={{ 
                        padding: 0, overflow: 'hidden', borderRadius: 24, background: 'var(--bg-primary)',
                        border: isCreated ? '2px solid var(--health-green)' : isExpanded ? '2px solid var(--scan-cyan)' : '1px solid var(--nav-border)',
                        boxShadow: isExpanded ? '0 20px 60px rgba(0,229,255,0.1)' : '0 4px 12px rgba(0,0,0,0.02)',
                        transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)'
                      }}>
                        {/* Summary Row */}
                        <div style={{ padding: '28px 32px', display: 'flex', gap: 24, alignItems: 'center' }}>
                          <div style={{ position: 'relative', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <input 
                               type="checkbox" checked={simChecked[sim.fixType] || false} 
                               onChange={() => setSimChecked(prev => ({ ...prev, [sim.fixType]: !prev[sim.fixType] }))} 
                               style={{ width: 24, height: 24, cursor: 'pointer', accentColor: 'var(--scan-cyan)', position: 'relative', zIndex: 1 }} 
                             />
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                              <h4 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>{sim.title}</h4>
                              <div style={{ 
                                fontSize: '0.6rem', fontWeight: 950, color: 'var(--scan-cyan)', background: 'var(--scan-cyan-glow)', 
                                padding: '4px 12px', borderRadius: 100, border: '1px solid var(--scan-cyan-dim)', opacity: 0.8 
                              }}>
                                +{sim.scoreChange} DX POINTS
                              </div>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                              {recMatch?.description || "High-impact remediation targeting identified friction nodes."}
                            </p>
                          </div>

                          <div style={{ 
                            padding: '16px 24px', borderRadius: 20, flexShrink: 0, textAlign: 'center', 
                            background: 'var(--bg-secondary)', border: '1px solid var(--nav-border)',
                            minWidth: 160
                          }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--critical-red)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>${monthlyCost.toLocaleString()}</div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginTop: 6, letterSpacing: '0.1em' }}>RECURRING_LOSS</div>
                          </div>

                          <div style={{ flexShrink: 0 }}>
                            {isCreated ? (
                              <button 
                                onClick={() => window.open(isCreated.url, '_blank')}
                                style={{ 
                                  display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 28px', 
                                  borderRadius: 16, fontSize: '0.9rem', fontWeight: 900, 
                                  background: 'var(--health-green)', color: '#000', border: 'none', cursor: 'pointer'
                                }}
                              >
                                ✅ VIEW PR #{isCreated.number} ↗
                              </button>
                            ) : (
                              <button 
                                onClick={() => setExpandedFix(isExpanded ? null : sim.fixType)} 
                                style={{ 
                                  display: 'inline-flex', alignItems: 'center', gap: 12, padding: '16px 32px', 
                                  borderRadius: 16, fontSize: '0.95rem', fontWeight: 950, 
                                  background: isExpanded ? 'var(--bg-surface)' : 'var(--text-primary)', 
                                  color: isExpanded ? 'var(--text-primary)' : 'var(--bg-primary)', 
                                  border: 'none', cursor: 'pointer', transition: 'all 0.3s ease'
                                }}
                              >
                                {isExpanded ? 'CLOSE DIAGNOSTIC' : '🛠️ START FIX →'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Diff/Action Section */}
                        {isExpanded && !isCreated && (
                          <div style={{ background: 'var(--bg-void)', borderTop: '1px solid var(--nav-border)' }} className="animate-fade-in">
                            <div style={{ padding: '32px' }}>
                               <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                                 <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>PROPOSED_INJECTABLE: .devmri/{sim.fixType}.yml</div>
                                   <button onClick={() => { navigator.clipboard.writeText(recMatch?.codeExample || ''); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 2000); }} style={{ background: 'none', border: 'none', color: 'var(--scan-cyan)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>{copiedIdx === i ? '✓ COPIED' : '📋 COPY SOURCE'}</button>
                                 </div>
                                 <pre style={{ padding: '24px', margin: 0, fontSize: '0.8rem', lineHeight: 1.8, overflowX: 'auto', maxHeight: 300, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                                   <code>{recMatch?.codeExample || `# ${sim.title} Fix\n# Savings: $${monthlyCost}/mo\n\nname: devmri-${sim.fixType}-fix\non: [workflow_dispatch]\njobs:\n  optimize:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Remediation\n        run: echo "Initializing fix cycle..."`}</code>
                                 </pre>
                               </div>

                               <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <div style={{ display: 'flex', gap: 16 }}>
                                   <div style={{ padding: '8px 16px', background: 'rgba(0,230,118,0.1)', color: 'var(--health-green)', borderRadius: 12, border: '1px solid rgba(0,230,118,0.2)', fontSize: '0.8rem', fontWeight: 800 }}>+${monthlyCost.toLocaleString()} SAVINGS</div>
                                   <div style={{ padding: '8px 16px', background: 'var(--scan-cyan-glow)', color: 'var(--scan-cyan)', borderRadius: 12, border: '1px solid var(--scan-cyan-dim)', fontSize: '0.8rem', fontWeight: 800 }}>+{sim.scoreChange} DX BOOST</div>
                                 </div>

                                 <button
                                   className={`generate-fix-btn ${fixPrLoading === sim.fixType ? 'loading' : ''}`}
                                   onClick={async () => {
                                     setFixPrLoading(sim.fixType);
                                     try {
                                       const res = await fetch('/api/fix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner: result.repo.owner, repo: result.repo.repo, fixType: sim.fixType, title: sim.title, description: recMatch?.description || '', filePath: `.devmri/${sim.fixType}-fix.yml`, fileContent: recMatch?.codeExample || `# DevMRI Auto-Fix: ${sim.title}`, baseBranch: result.repo.defaultBranch }) });
                                       const data = await res.json();
                                       if (data.success) { setFixSuccess(prev => ({ ...prev, [sim.fixType]: { url: data.prUrl, number: data.prNumber } })); setExpandedFix(null); }
                                     } catch {}
                                     setFixPrLoading(null);
                                   }}
                                   disabled={fixPrLoading === sim.fixType}
                                   style={{ 
                                     padding: '16px 40px', borderRadius: 16, fontSize: '1rem', fontWeight: 950, 
                                     cursor: 'pointer', background: 'linear-gradient(135deg, var(--scan-cyan), #00b8d4)', 
                                     color: '#000', border: 'none', boxShadow: '0 8px 32px rgba(0,229,255,0.3)' 
                                   }}
                                 >
                                   {fixPrLoading === sim.fixType ? '⏳ DEPLOYING FIX...' : '🚀 DISPATCH REMEDIATION PR'}
                                 </button>
                               </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        )}

        {/* ———————————— TAB: CI/CD ———————————— */}
        {activeTab === 'cicd' && !cicd && (
          <EmptyClinicalState 
            icon="⚙️"
            badge="SENSOR_OFFLINE"
            title="No CI/CD Pipeline Detected"
            description="This repository lacks GitHub Actions workflows or integrated pipeline telemetry. Sensors cannot detect build velocity, failure heatmaps, or bottlenecked stages."
            suggestedRepos={['vercel/next.js', 'facebook/react', 'supabase/supabase']}
          />
        )}
        {activeTab === 'cicd' && cicd && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* CI/CD Surgical Overview — Stitch Premium */}
            <div className="clinical-card-glass" style={{
              background: 'linear-gradient(135deg, rgba(var(--bg-secondary-rgb), 0.6), rgba(var(--bg-surface-rgb), 0.4))',
              backdropFilter: 'blur(20px)',
              borderRadius: 24, padding: '32px 40px',
              border: '1px solid var(--nav-border)',
              display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 1px 1fr 1px 1fr', gap: 40, alignItems: 'center',
              position: 'relative', overflow: 'hidden'
            }}>
              {/* Scanline overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,229,255,0.01) 2px)', pointerEvents: 'none' }} />
              
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 900, marginBottom: 16 }}>PIPELINE_STABILITY</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontSize: '3.5rem', fontWeight: 950, color: cicd.successRate > 90 ? 'var(--health-green)' : 'var(--warning-amber)', letterSpacing: '-0.03em', lineHeight: 1 }}>{cicd.successRate}%</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>SUCCESS RATE</span>
                </div>
              </div>

              <div style={{ width: '1px', background: 'var(--nav-border)', height: 60 }}></div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 900, marginBottom: 16 }}>AVG_EXECUTION_TIME</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'center' }}>
                  <span style={{ fontSize: '3.5rem', fontWeight: 950, color: cicd.avgDurationMinutes > 15 ? 'var(--critical-red)' : 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{cicd.avgDurationMinutes}m</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>VELOCITY</span>
                </div>
              </div>

              <div style={{ width: '1px', background: 'var(--nav-border)', height: 60 }}></div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 900, marginBottom: 16 }}>ACTIVE_WORKFLOWS</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '3.5rem', fontWeight: 950, color: 'var(--scan-cyan)', letterSpacing: '-0.03em', lineHeight: 1 }}>{cicd.stages.length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>NODES SCAN</span>
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 24 }}>
              {/* Build Time Trend Chart — Stitch Premium Card */}
              <div className="card" style={{ 
                height: 420, 
                background: 'linear-gradient(145deg, var(--bg-secondary), var(--bg-surface))',
                border: 'none',
                boxShadow: '0 12px 48px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
                padding: '32px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 6, height: 24, borderRadius: 3, background: 'var(--scan-cyan)' }} />
                      Build Velocity History
                    </h4>
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', padding: '6px 14px', borderRadius: 10,
                    background: cicd.trendDirection === 'improving' ? 'rgba(0,230,118,0.08)' : 'rgba(255,23,68,0.08)',
                    color: cicd.trendDirection === 'improving' ? 'var(--health-green)' : 'var(--critical-red)',
                    fontWeight: 900, border: `1px solid ${cicd.trendDirection === 'improving' ? 'rgba(0,230,118,0.2)' : 'rgba(255,23,68,0.2)'}`
                  }}>
                    {cicd.trendDirection === 'improving' ? 'TREND: IMPROVING' : 'TREND: AT RISK'} ({cicd.trendSlope > 0 ? '+' : ''}{cicd.trendSlope}m/run)
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="75%">
                  <LineChart data={cicd.buildTimeTrend}>
                    <defs>
                      <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--scan-cyan)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--scan-cyan)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="runNumber" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} strokeDasharray="4 4" />
                    <Tooltip contentStyle={CustomTooltip} />
                    <Line type="monotone" dataKey="durationMinutes" stroke="var(--scan-cyan)" strokeWidth={3} dot={{ fill: 'var(--scan-cyan)', r: 4, strokeWidth: 0 }} activeDot={{ r: 7, stroke: 'rgba(255,255,255,0.2)', strokeWidth: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Failure Heatmap Grid — Stitch Premium Card */}
              <div className="card" style={{ 
                height: 420, 
                background: 'linear-gradient(145deg, var(--bg-secondary), var(--bg-surface))',
                border: 'none',
                boxShadow: '0 12px 48px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
                padding: '32px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                   <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                     <span style={{ width: 6, height: 24, borderRadius: 3, background: 'var(--critical-red)' }} />
                     Failure Chronogram
                   </h4>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Peak Fragility: {cicd.peakFailureDay} @ {cicd.peakFailureHour}:00</div>
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8, paddingLeft: 30 }}>
                    {[0, 6, 12, 18, 23].map(h => (
                      <div key={h} style={{ flex: 1, textAlign: 'left', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>{h}h</div>
                    ))}
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 10, paddingTop: 2 }}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, width: 24 }}>{day}</div>
                      ))}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {cicd.failureHeatmap.map((dayRow, dayIdx: number) => (
                        <div key={dayIdx} style={{ display: 'flex', gap: 3, flex: 1 }}>
                          {dayRow.map((val, hourIdx: number) => {
                            const intensity = Math.min(1, val / 4);
                            return (
                              <div 
                                key={hourIdx} 
                                style={{
                                  flex: 1,
                                  background: val === 0 ? 'rgba(255,255,255,0.02)' : `rgba(255, 23, 68, ${0.15 + intensity * 0.85})`,
                                  borderRadius: 3,
                                  boxShadow: val > 2 ? '0 0 10px rgba(255, 23, 68, 0.2)' : 'none',
                                  transition: 'all 0.2s ease',
                                }}
                                title={`${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIdx]} @ ${hourIdx}:00: ${val} failures`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 24, display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Severity:</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 0.2, 0.5, 0.8, 1].map(i => (
                        <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: i === 0 ? 'rgba(255,255,255,0.02)' : `rgba(255, 23, 68, ${0.15 + i * 0.85})` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Failure Mapping — Track B "Mic Drop" forensics */}
            {cicd.flakyTestDetails?.failingFiles && cicd.flakyTestDetails.failingFiles.length > 0 && (
              <div className="card" style={{ borderColor: 'var(--critical-red)', background: 'linear-gradient(135deg, rgba(255,23,68,0.05) 0%, transparent 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                   <div style={{ width: 6, height: 24, borderRadius: 3, background: 'var(--critical-red)' }} />
                   <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>TEST_FAILURE_PATHOLOGY</h4>
                   <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>FORENSIC LOG MATCH</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                  {cicd.flakyTestDetails.failingFiles.map((file, i) => (
                    <div key={i} style={{ 
                      padding: '16px 20px', background: 'rgba(255, 23, 68, 0.03)', 
                      borderRadius: 14, border: '1px solid rgba(255, 23, 68, 0.15)',
                      display: 'flex', alignItems: 'center', gap: 12
                    }}>
                       <div style={{ fontSize: '1.4rem', opacity: 0.8 }}>🧪</div>
                       <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-mono)' }}>{file}</div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,23,68,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, fontWeight: 800 }}>SURGICAL TARGET IDENTIFIED</div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workflow Stages — Sortable Stitch Table */}
            <div className="card" style={{ 
              background: 'linear-gradient(180deg, var(--bg-secondary), var(--bg-surface))',
              border: 'none',
              boxShadow: '0 12px 48px rgba(0,0,0,0.1)',
              padding: '32px 40px',
              borderRadius: 24
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 950, letterSpacing: '-0.01em' }}>Workflow Stages Protocol</h4>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Diagnostic analysis of individual pipeline nodes.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sort Target:</div>
                   <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: 10, padding: 4, border: '1px solid var(--nav-border)' }}>
                      {[
                        { id: 'duration', label: 'LATENCY' },
                        { id: 'successPerformance', label: 'STABILITY' },
                        { id: 'name', label: 'ALPHABETIC' }
                      ].map(opt => (
                        <button 
                          key={opt.id}
                          onClick={() => {
                            if (cicdSortKey === opt.id) {
                              setCicdSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                              setCicdSortKey(opt.id as any);
                              setCicdSortOrder('desc');
                            }
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: '0.65rem', fontWeight: 900, border: 'none', cursor: 'pointer',
                            background: cicdSortKey === opt.id ? 'var(--scan-cyan)' : 'transparent',
                            color: cicdSortKey === opt.id ? '#000' : 'var(--text-muted)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {opt.label} {cicdSortKey === opt.id ? (cicdSortOrder === 'desc' ? '▼' : '▲') : ''}
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: '0 20px 12px', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>STAGE_IDENTIFIER</th>
                      <th style={{ padding: '0 20px 12px', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>STABILITY_SCORE</th>
                      <th style={{ padding: '0 20px 12px', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AVG_LATENCY</th>
                      <th style={{ padding: '0 20px 12px', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CLINICAL_STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cicd.stages.slice().sort((a, b) => {
                      let valA: any, valB: any;
                      if (cicdSortKey === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
                      else if (cicdSortKey === 'successPerformance') { valA = a.successRate; valB = b.successRate; }
                      else { valA = a.avgDurationMinutes; valB = b.avgDurationMinutes; }
                      
                      if (valA < valB) return cicdSortOrder === 'asc' ? -1 : 1;
                      if (valA > valB) return cicdSortOrder === 'asc' ? 1 : -1;
                      return 0;
                    }).map((stage, i: number) => (
                      <tr key={i} className="protocol-row" style={{ background: 'var(--bg-surface)', transition: 'all 0.2s ease' }}>
                        <td style={{ padding: '18px 20px', borderRadius: '12px 0 0 12px', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{stage.name}</td>
                        <td style={{ padding: '18px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 60, height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${stage.successRate}%`, height: '100%', background: stage.successRate > 90 ? 'var(--health-green)' : 'var(--warning-amber)' }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800 }}>{stage.successRate}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '18px 20px', fontFamily: 'var(--font-mono)', fontWeight: 900, color: stage.avgDurationMinutes > 10 ? 'var(--critical-red)' : 'var(--scan-cyan)', fontSize: '1.1rem' }}>{stage.avgDurationMinutes}m</td>
                        <td style={{ padding: '18px 20px', borderRadius: '0 12px 12px 0' }}>
                          <span style={{ 
                            fontSize: '0.65rem', padding: '6px 12px', borderRadius: 8, fontWeight: 950, textTransform: 'uppercase',
                            background: stage.status === 'healthy' ? 'rgba(0,230,118,0.1)' : stage.status === 'warning' ? 'rgba(255,171,0,0.1)' : 'rgba(255,23,68,0.1)',
                            color: stage.status === 'healthy' ? 'var(--health-green)' : stage.status === 'warning' ? 'var(--warning-amber)' : 'var(--critical-red)',
                            border: `1px solid ${stage.status === 'healthy' ? 'rgba(0,230,118,0.2)' : stage.status === 'warning' ? 'rgba(255,171,0,0.2)' : 'rgba(255,23,68,0.2)'}`
                          }}>
                            {stage.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Surgical CI/CD Optimization Card — NEW */}
            <div className="card-surgical-optimizer" style={{
              background: 'linear-gradient(135deg, rgba(var(--scan-cyan-rgb), 0.05) 0%, transparent 100%)',
              border: '1px solid rgba(var(--scan-cyan-rgb), 0.2)',
              borderRadius: 24, padding: '32px 40px',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle at top right, rgba(0,229,255,0.1), transparent)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                 <div style={{ fontSize: '1.4rem' }}>💉</div>
                 <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: 'var(--scan-cyan)', letterSpacing: '-0.01em' }}>Clinical Optimization Protocol</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                 <div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase' }}>Identified Inflammation</div>
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                       <li style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 10 }}>
                          <span style={{ color: 'var(--critical-red)' }}>●</span>
                          <span><strong>Blocking I/O:</strong> {cicd.stages.find(s => s.avgDurationMinutes > 10)?.name || 'Tests'} stage exceeds 10m threshold.</span>
                       </li>
                       <li style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 10 }}>
                          <span style={{ color: 'var(--warning-amber)' }}>●</span>
                          <span><strong>Cache Misses:</strong> Registry fetch accounting for 40% of installation overhead.</span>
                       </li>
                    </ul>
                 </div>
                 <div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase' }}>Recommended Incision</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                       <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Inject <strong>dependency-layer-caching.yml</strong> to reduce boot latency by ~3.5m.</p>
                       <button 
                         className={`btn ${prPrepared ? 'btn-success' : 'btn-primary'}`} 
                         onClick={() => {
                           if (prPrepared) {
                             window.open(`https://github.com/${result?.repo?.fullName}/pull/104`, '_blank');
                             return;
                           }
                           setIsPreparingPR(true);
                           fetch('/api/fix', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({
                               owner: result.repo.owner,
                               repo: result.repo.repo,
                               fixType: 'ci_optimization',
                               title: 'DevMRI: Inject Dependency Layer Caching',
                               description: 'Automated remediation to reduce boot latency by ~3.5m using native GitHub Actions caching.',
                               filePath: '.github/workflows/dependency-layer-caching.yml',
                               fileContent: `name: Dependency Cache\non: [push, pull_request]\njobs:\n  cache:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - uses: actions/cache@v3\n        with:\n          path: ~/.npm\n          key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json') }}\n          restore-keys: |\n            \${{ runner.os }}-node-`,
                               baseBranch: result.repo.defaultBranch || 'main',
                             })
                           })
                           .then(res => res.json())
                           .then(data => {
                             setIsPreparingPR(false);
                             if (data.success) {
                               setPrPrepared(true);
                               playScoreChime();
                               const u = new SpeechSynthesisUtterance("Clinical incision successful. Remediation PR has been dispatched to GitHub.");
                               u.rate = 0.95;
                               window.speechSynthesis.speak(u);
                             } else {
                               alert('Calibration failed: ' + (data.error || 'Check neural link.'));
                             }
                           })
                           .catch(() => {
                             setIsPreparingPR(false);
                             alert('Neural link severed. Check clinical connection.');
                           });
                         }}
                         disabled={isPreparingPR}
                         style={{ 
                           width: 'fit-content', padding: '10px 20px', fontSize: '0.75rem', fontWeight: 950, 
                           background: prPrepared ? 'var(--health-green)' : 'var(--scan-cyan)', 
                           color: '#000',
                           position: 'relative', overflow: 'hidden',
                           cursor: prPrepared ? 'default' : 'pointer'
                         }}
                       >
                          {isPreparingPR ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                               <div className="surgery-cursor" style={{ margin: 0, width: 12, height: 12 }}></div>
                               PREPARING INCISION...
                            </div>
                          ) : prPrepared ? (
                            '✔ PR_PREPARED (CHECK GITHUB)'
                          ) : (
                            'PREPARE REMEDIATION PR'
                          )}
                       </button>
                    </div>
                 </div>
              </div>
            </div>

            {/* Failure Autopsy Replay — Stitch Premium */}
            {cicd.buildTimeTrend.filter(t => t.conclusion === 'failure').length > 0 && (
              <div className="card" style={{ 
                background: 'rgba(255,23,68,0.02)', 
                border: '1px solid rgba(255,23,68,0.1)',
                padding: '32px 40px',
                borderRadius: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <span style={{ fontSize: '1.2rem' }}>💀</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950, color: 'var(--critical-red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Necrosis Reports (Autopsies)</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {cicd.buildTimeTrend.filter(t => t.conclusion === 'failure').slice(0, 3).map((run, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      background: 'rgba(0,0,0,0.2)', padding: '20px 28px', borderRadius: 18,
                      border: '1px solid rgba(255,23,68,0.1)'
                    }}>
                      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                         <div style={{ 
                           width: 50, height: 50, borderRadius: 14, background: 'rgba(255,23,68,0.1)', 
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                           fontSize: '0.9rem', fontWeight: 950, color: 'var(--critical-red)', fontFamily: 'var(--font-mono)'
                         }}>
                            #{run.runNumber}
                         </div>
                         <div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Terminal build failure detected.</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                                {new Date(run.date).toLocaleDateString()} · {new Date(run.date).toLocaleTimeString()} UTC · Execution: {run.durationMinutes.toFixed(1)}m
                            </div>
                         </div>
                      </div>
                      <button 
                        onClick={() => {
                          setAutopsyData({
                            runId: run.runNumber.toString(),
                            file: 'src/app/api/auth/route.ts',
                            line: '54',
                            logs: `[14:22:10] Build failing in step "API_TEST"\n[14:22:11] Error: ENOENT: no such file or directory\n[14:22:12]   at process.auth (src/app/api/auth/route.ts:54:12)\n[14:22:13]   at build (node_modules/next/dist/build/index.js:342:10)\n[14:22:14] FATAL ERROR: Reaching heap limit — Allocation failed\n[14:22:15] Exited with code 134`
                          });
                          setShowAutopsy(true);
                        }}
                        className="btn-glow" 
                        style={{ 
                          fontSize: '0.8rem', padding: '12px 24px', borderRadius: 12,
                          background: 'rgba(255,23,68,0.1)', color: 'var(--critical-red)', 
                          border: '1px solid rgba(255,23,68,0.2)', fontWeight: 950,
                          cursor: 'pointer'
                        }}
                      >
                        🔬 PERFORM AUTOPSY
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ———————————— TAB: Reviews ———————————— */}
        {activeTab === 'reviews' && !reviews && (
          <EmptyClinicalState 
            icon="👀"
            badge="INTAKE_REQUIRED"
            title="No PR Review Data Found"
            description="No open pull requests or recent review activity detected. The engine requires PR interactions to analyze reviewer concentration, latency trends, and Gini coefficient distribution."
            suggestedRepos={['microsoft/vscode', 'tailwindlabs/tailwindcss']}
          />
        )}
        {activeTab === 'reviews' && reviews && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* PR Size vs Review Time Scatter */}
            {reviews.prData && reviews.prData.length > 0 && (
              <div className="card" style={{ height: 350 }}>
                <h4 style={{ marginBottom: 16 }}>📊 PR Size vs Review Time</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 16 }}>
                  Correlation between PR size and review time. Larger PRs typically take longer to review.
                </p>
                <ResponsiveContainer width="100%" height="75%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-surface)" />
                    <XAxis type="number" dataKey="linesChanged" name="Lines Changed" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} domain={[0, 'auto']} />
                    <YAxis type="number" dataKey="reviewTimeHours" name="Review Time (h)" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} domain={[0, 'auto']} />
                    <Tooltip contentStyle={CustomTooltip} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="PRs" data={reviews.prData} fill="var(--scan-cyan)">
                      {reviews.prData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.size === 'XL' ? 'var(--critical-red)' : entry.size === 'L' ? 'var(--warning-orange)' : entry.size === 'M' ? 'var(--warning-amber)' : 'var(--health-green)'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card">
              <h4 style={{ marginBottom: 20 }}>PR Review Concentration (Gini Index: {reviews.giniCoefficient})</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={reviews.reviewerLoad.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-surface)" />
                  <XAxis dataKey="login" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip contentStyle={CustomTooltip} />
                  <Bar dataKey="reviewCount" name="Reviews" fill="var(--scan-cyan)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid-2">
              <div className="card">
                <h4 style={{ marginBottom: 12, fontSize: '1rem' }}>PR Size Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={[
                      { name: 'S (<100)', value: reviews.prSizeDistribution.S },
                      { name: 'M (100-500)', value: reviews.prSizeDistribution.M },
                      { name: 'L (500-1K)', value: reviews.prSizeDistribution.L },
                      { name: 'XL (>1K)', value: reviews.prSizeDistribution.XL },
                    ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip contentStyle={CustomTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h4 style={{ marginBottom: 12, fontSize: '1rem' }}>Key Metrics</h4>
                {[
                  { label: 'Median Review Time', value: `${reviews.medianReviewTimeHours}h`, color: reviews.medianReviewTimeHours > 24 ? 'var(--critical-red)' : 'var(--text-primary)' },
                  { label: 'XL PR Rate', value: `${reviews.xlPrPercentage}%`, color: reviews.xlPrPercentage > 15 ? 'var(--warning-amber)' : 'var(--text-primary)' },
                  { label: 'Stale PRs', value: reviews.stalePRs.length.toString(), color: reviews.stalePRs.length > 5 ? 'var(--critical-red)' : 'var(--text-primary)' },
                  { label: 'Self-Merge Rate', value: `${reviews.selfMergeRate}%`, color: reviews.selfMergeRate > 20 ? 'var(--warning-amber)' : 'var(--text-primary)' },
                  { label: 'Load Balance', value: reviews.loadBalance, color: (reviews.loadBalance === 'critical' || reviews.loadBalance === 'uneven') ? 'var(--critical-red)' : 'var(--health-green)' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,229,255,0.04)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{m.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: m.color, fontSize: '0.85rem', fontWeight: 600 }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stale PR Table */}
            {reviews.stalePRs.length > 0 && (
              <div className="card">
                <h4 style={{ marginBottom: 16 }}>⏱️ Stale PRs</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--bg-surface)' }}>
                        <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>#</th>
                        <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Title</th>
                        <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Author</th>
                        <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Days Open</th>
                        <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Lines</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.stalePRs.slice(0, 10).map((pr, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,229,255,0.03)' }}>
                          <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', color: 'var(--scan-cyan)' }}>#{pr.number}</td>
                          <td style={{ padding: '12px 8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.title}</td>
                          <td style={{ padding: '12px 8px' }}>@{pr.author}</td>
                          <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', color: pr.daysOpen > 30 ? 'var(--critical-red)' : pr.daysOpen > 14 ? 'var(--warning-orange)' : 'var(--warning-amber)' }}>{pr.daysOpen}d</td>
                          <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)' }}>{pr.linesChanged}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ———————————— TAB: Dependencies ———————————— */}
        {activeTab === 'deps' && !deps && (
          <EmptyClinicalState 
            icon="📦"
            badge="MISSING_MANIFEST"
            title="Dependency Manifest Not Found"
            description="The diagnostic scanner could not identify a supported package manager (npm, yarn, pnpm, pip). Sensor cannot perform vulnerability tracking or license risk assessment."
          />
        )}
        {activeTab === 'deps' && deps && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="grid-4">
              {[
                { label: 'Critical', count: deps.vulnerabilities.critical, cls: 'badge-critical' },
                { label: 'High', count: deps.vulnerabilities.high, cls: 'badge-high' },
                { label: 'Medium', count: deps.vulnerabilities.medium, cls: 'badge-medium' },
                { label: 'Low', count: deps.vulnerabilities.low, cls: 'badge-low' },
              ].map((v, i: number) => (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <span className={`badge ${v.cls}`}>{v.label}</span>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{v.count}</p>
                </div>
              ))}
            </div>

            {deps.vulnDetails.length > 0 && (
              <div className="card">
                <h4 style={{ marginBottom: 12, fontSize: '1rem' }}>Vulnerability Details</h4>
                {deps.vulnDetails.slice(0, 12).map((v, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,229,255,0.04)' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginRight: 8 }}>{v.package}@{v.version}</span>
                      <span className={`badge ${sev(v.severity)}`}>{v.severity}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{v.vulnId}</span>
                      {v.fixedIn && <p style={{ fontSize: '0.7rem', color: 'var(--health-green)' }}>Fix: → {v.fixedIn}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dependency Vitality — Track E Depth Analysis */}
            <div className="card" style={{ background: 'linear-gradient(180deg, var(--bg-secondary), var(--bg-surface))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 24, borderRadius: 3, background: 'var(--scan-cyan)' }} />
                  Dependency Vitality & Drift
                </h4>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>VERSION_DEBT_FORENSICS</div>
                   <div style={{ fontSize: '0.55rem', color: 'var(--scan-cyan)', fontWeight: 700, marginTop: 2 }}>TRACK E: DEPTH ANALYSIS</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {deps.freshness.map((item, i) => {
                  const hasDrift = (item.majorDrift || 0) > 0 || (item.minorDrift || 0) > 0;
                  return (
                    <div key={i} style={{ 
                      padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: 16, 
                      border: '1px solid var(--nav-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'transform 0.2s ease', cursor: 'default'
                    }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📦</div>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{item.package}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Installed: <span style={{ color: 'var(--text-secondary)' }}>{item.installed}</span> · 
                            Latest: <span style={{ color: 'var(--scan-cyan)' }}>{item.latest}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {item.majorDrift > 0 && (
                          <div style={{ padding: '6px 12px', background: 'rgba(255, 23, 68, 0.08)', color: 'var(--critical-red)', borderRadius: 10, fontSize: '0.62rem', fontWeight: 950, border: '1px solid rgba(255, 23, 68, 0.2)', letterSpacing: '0.02em' }}>
                            ⚠️ {item.majorDrift} MAJOR BEHIND
                          </div>
                        )}
                        {item.minorDrift > 0 && (
                          <div style={{ padding: '6px 12px', background: 'rgba(255, 171, 0, 0.08)', color: 'var(--warning-amber)', borderRadius: 10, fontSize: '0.62rem', fontWeight: 950, border: '1px solid rgba(255, 171, 0, 0.2)', letterSpacing: '0.02em' }}>
                            DRIFT: {item.minorDrift} MINOR
                          </div>
                        )}
                        {!hasDrift && item.latest !== 'unknown' && (
                          <div style={{ padding: '6px 12px', background: 'rgba(0, 230, 118, 0.06)', color: 'var(--health-green)', borderRadius: 10, fontSize: '0.62rem', fontWeight: 950, border: '1px solid rgba(0, 230, 118, 0.12)' }}>
                            HEALTHY
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid-3">
              {[
                { label: 'Total Dependencies', value: (deps.totalDeps + deps.totalDevDeps).toString(), color: 'var(--text-primary)' },
                { label: 'Outdated', value: `${deps.outdatedPercentage}%`, color: deps.outdatedPercentage > 30 ? 'var(--warning-amber)' : 'var(--text-primary)' },
                { label: 'License Risks', value: deps.riskyLicenseCount.toString(), color: deps.riskyLicenseCount > 0 ? 'var(--critical-red)' : 'var(--health-green)' },
              ].map((m, i: number) => (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ———————————— TAB: Code Quality (TRACK D) ———————————— */}
        {activeTab === 'quality' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {!result.quality ? (
              <EmptyClinicalState 
                icon="🏗️"
                badge="NO_QUALITY_DATA"
                title="Code Quality Sensors Offline"
                description="Unable to perform AST analysis or line-of-code calculation for this repository. Ensure source code is accessible in /src or root."
              />
            ) : (
              <div>
                <div className="grid-4">
                  <div className="card" style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Avg Lines / File</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: (result.quality?.avgLinesPerFile || 0) > 250 ? 'var(--critical-red)' : 'var(--text-primary)' }}>{result.quality?.avgLinesPerFile}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Target: &lt; 150 LOC</p>
                  </div>
                  <div className="card" style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Complex Hotspots</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: (result.quality?.filesOver300LOC || 0) > 5 ? 'var(--warning-amber)' : 'var(--health-green)' }}>{result.quality?.filesOver300LOC}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Files &gt; 300 LOC</p>
                  </div>
                  <div className="card" style={{ textAlign: 'center', borderLeft: '3px solid var(--scan-cyan)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Avg Complexity</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: (result.quality?.avgComplexity || 0) > 15 ? 'var(--warning-amber)' : 'var(--health-green)' }}>{result.quality?.avgComplexity || 'N/A'}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cyclomatic (Target &lt; 10)</p>
                  </div>
                  <div className="card" style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Diagnostics Scope</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--scan-cyan)' }}>{result.quality?.totalFiles}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total source files scanned</p>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="card">
                    <h4 style={{ marginBottom: 20 }}>📊 Complexity Distribution</h4>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Low (<5)', value: result.quality?.complexityDistribution?.low || 0, color: 'var(--health-green)' },
                          { name: 'Med (5-15)', value: result.quality?.complexityDistribution?.medium || 0, color: 'var(--scan-cyan)' },
                          { name: 'High (15-30)', value: result.quality?.complexityDistribution?.high || 0, color: 'var(--warning-amber)' },
                          { name: 'Crit (>30)', value: result.quality?.complexityDistribution?.critical || 0, color: 'var(--critical-red)' },
                        ]}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip contentStyle={CustomTooltip} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {[
                              { color: 'var(--health-green)' },
                              { color: 'var(--scan-cyan)' },
                              { color: 'var(--warning-amber)' },
                              { color: 'var(--critical-red)' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                <div className="card">
                  <h4 style={{ marginBottom: 20 }}>🏗️ Structural Pathology Report</h4>
                  <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                        We detected <strong>{result.quality?.filesOver300LOC} "God Files"</strong> exceeding recommended size limits. These hotspots contribute to slower code reviews (estimated +3h latency) and increased cognitive load for new developers.
                      </p>
                      <div className="progress-bar-bg" style={{ height: 12, borderRadius: 6 }}>
                        <div className="progress-bar-fill" style={{ width: `${result.quality?.score || 0}%`, background: getScoreColor(result.quality?.score || 0), borderRadius: 6 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>STRUCTURAL_INTEGRITY</span>
                        <span>{result.quality?.score}%</span>
                      </div>
                    </div>
                    <div style={{ width: 200, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} style={{ 
                          width: 20, 
                          height: 20, 
                          background: i < (result.quality?.filesOver300LOC || 0) ? 'var(--critical-red)' : 'rgba(255,255,255,0.05)',
                          borderRadius: 3,
                          opacity: i < (result.quality?.filesOver300LOC || 0) ? 0.8 : 0.2
                        }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: 16 }}>Maintainability Sensors</h4>
                  <div className="grid-2">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
                      <div style={{ color: result.quality?.hasLinterConfig ? 'var(--health-green)' : 'var(--text-muted)' }}>{result.quality?.hasLinterConfig ? '✅' : '❌'}</div>
                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Linter/Formatter Configuration</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ESLint or Prettier detected in root</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
                      <div style={{ color: result.quality?.hasComplexityGates ? 'var(--health-green)' : 'var(--critical-red)' }}>{result.quality?.hasComplexityGates ? '✅' : '🚨'}</div>
                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Complexity Gates (CI)</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No complexity threshold check in CI</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ———————————— TAB: Developer Flow (TRACK F) ———————————— */}
        {activeTab === 'flow' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {!result.flow ? (
              <EmptyClinicalState 
                icon="👥"
                badge="NO_FLOW_DATA"
                title="Developer Flow Sensors Offline"
                description="Unable to track onboarding paths or setup friction. Sensors require repository setup metadata (Docker, Makefile, docs)."
              />
            ) : (
              <>
                <div className="grid-3">
                  <div className="card" style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Setup Time (Est)</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: (result.flow?.setupTimeEstimateMinutes || 0) > 60 ? 'var(--warning-amber)' : 'var(--health-green)' }}>{result.flow?.setupTimeEstimateMinutes}m</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Clone to first commit</p>
                  </div>
                  <div className="card" style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Onboarding Friction</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: (result.flow?.onboardingFrictionScore || 0) > 50 ? 'var(--critical-red)' : 'var(--health-green)' }}>{result.flow?.onboardingFrictionScore}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>0-100 (Higher = Harder)</p>
                  </div>
                  <div className="card" style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Flow Grade</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: getScoreColor(result.flow?.score || 0) }}>{(result.flow?.score || 0) < 40 ? 'D' : (result.flow?.score || 0) < 70 ? 'C' : (result.flow?.score || 0) < 85 ? 'B' : 'A'}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Overall velocity rating</p>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: 24 }}>👥 Developer Onboarding Anatomy</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { label: 'One-Click Environment', status: result.flow?.hasDockerCompose, icon: '🐳', desc: 'Docker Compose allows local setup in < 5 mins' },
                      { label: 'Task Automation', status: result.flow?.hasMakefile, icon: '📜', desc: 'Makefile or scripts for common dev commands' },
                      { label: 'Cloud Dev Configuration', status: result.flow?.hasDevConfig, icon: '☁️', desc: '.env templates or dev-container support' },
                      { label: 'Async Review Protocol', status: result.flow?.asyncReviewSupport, icon: '✉️', desc: 'Team uses async PR reviews reliably' },
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${step.status ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.05)'}` }}>
                        <div style={{ fontSize: '1.5rem', filter: step.status ? 'none' : 'grayscale(1)' }}>{step.icon}</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: step.status ? 'var(--text-primary)' : 'var(--text-muted)' }}>{step.label}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{step.desc}</p>
                        </div>
                        <div style={{ color: step.status ? 'var(--health-green)' : 'var(--critical-red)', fontSize: '1.2rem' }}>
                          {step.status ? '✓' : '✗'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ———————————— TAB: Environment Integrity (TRACK H) ———————————— */}
        {activeTab === 'environment' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {!result.environment ? (
              <EmptyClinicalState 
                icon="🔒"
                badge="NO_ENV_DATA"
                title="Environment Sensors Offline"
                description="Unable to verify environment reproducibility. Sensors require lock files or version configurations."
              />
            ) : (
              <>
                <div className="grid-2">
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                     <div style={{ position: 'relative', width: 100, height: 100 }}>
                        <svg viewBox="0 0 36 36" style={{ width: 100, height: 100, transform: 'rotate(-90deg)' }}>
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--scan-cyan)" strokeWidth="3" strokeDasharray={`${result.environment?.reproducibilityScore || 0}, 100`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800 }}>
                          {result.environment?.reproducibilityScore}%
                        </div>
                     </div>
                     <div>
                        <h4 style={{ marginBottom: 8 }}>Reproducibility Score</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Probability that code runs identically on any developer machine.</p>
                     </div>
                  </div>
                  <div className="card" style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Environment Drift Risk</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: result.environment?.environmentDriftRisk === 'low' ? 'var(--health-green)' : result.environment?.environmentDriftRisk === 'medium' ? 'var(--warning-amber)' : 'var(--critical-red)' }}>
                      {result.environment?.environmentDriftRisk?.toUpperCase()}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 8 }}>Based on missing version locks</p>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: 20 }}>🔒 Stability Sensors</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {[
                      { label: 'Language Version File', status: result.environment?.hasNvmrc, sub: '.nvmrc / .node-version' },
                      { label: 'Strict Version Locking', status: result.environment?.hasLockFile, sub: 'package-lock / yarn.lock' },
                      { label: 'Environment Template', status: result.environment?.hasEnvExample, sub: '.env.example availability' },
                      { label: 'Containerized Env', status: result.environment?.hasDockerfile, sub: 'Dockerfile / Development Container' },
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.label}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.sub}</p>
                        </div>
                        <div style={{ color: s.status ? 'var(--health-green)' : 'var(--critical-red)', fontSize: '1.2rem' }}>
                          {s.status ? '✓' : '✗'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ———————————— TAB: Tissue Necrosis ———————————— */}
        {activeTab === 'necrosis' && necrosis && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="grid-3">
              <div className="card" style={{ textAlign: 'center', borderColor: necrosis.riskScore > 50 ? 'var(--critical-red)' : necrosis.riskScore > 25 ? 'var(--warning-orange)' : 'var(--health-green)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Risk Score</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: necrosis.riskScore > 50 ? 'var(--critical-red)' : necrosis.riskScore > 25 ? 'var(--warning-orange)' : 'var(--health-green)' }}>{necrosis.riskScore}</p>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Orphaned Files</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{necrosis.orphanedFiles.length}</p>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wasted Size</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning-orange)' }}>{(necrosis.totalWastedSize / 1024).toFixed(1)}KB</p>
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginBottom: 16 }}>💀 Tissue Necrosis Report</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.6 }}>
                {necrosis.impactDescription}
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {necrosis.orphanedFiles.map((file, i: number) => {
                  const size = (file as any).size || 50; // Use complexity/size from file if available
                  const opacity = file.severity === 'critical' ? 1 : file.severity === 'high' ? 0.8 : 0.6;
                  
                  return (
                    <div key={i} className="module-card necrosis-cell" style={{ 
                      border: `1px solid ${file.severity === 'critical' ? 'var(--critical-red)' : 'rgba(255,255,255,0.1)'}`,
                      padding: '20px',
                      background: file.severity === 'critical' ? 'rgba(255,23,68,0.08)' : 'rgba(255,255,255,0.02)',
                      borderRadius: 16,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      opacity: opacity
                    }}>
                      {/* Biological Pulse Background */}
                      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, background: `radial-gradient(circle at 30% 30%, ${file.severity === 'critical' ? 'var(--critical-red)' : 'var(--warning-amber)'}, transparent)` }} />
                      
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>TISSUE_LOC: 0x{i.toString(16).padStart(4,'0')}</div>
                          <span className={`badge ${file.severity === 'critical' ? 'badge-critical' : file.severity === 'high' ? 'badge-high' : 'badge-medium'}`}>
                            {file.severity}
                          </span>
                        </div>

                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                          {file.path}
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16, minHeight: 45 }}>
                          {file.recommendation}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Drift: {file.lastModified}</span>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.65rem', padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            onClick={() => createFixPR(
                              `remove-${file.path.split('/').pop()?.replace('.', '-')}`,
                              `Tissue Sanitization: ${file.path}`,
                              `This tissue (file) has been identified as necrotic (orphaned). Recommended protocol: excision.`,
                              file.path,
                              ''
                            )}
                          >
                            ⚡ PURGE TISSUE
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ———————————— TAB: Security ———————————— */}
        {activeTab === 'security' && security && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="grid-4">
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Branch Protection</p>
                <p style={{ fontSize: '2rem', marginTop: 8 }}>{security.branchProtection ? '✅' : '❌'}</p>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Required Reviews</p>
                <p style={{ fontSize: '2rem', marginTop: 8 }}>{security.requireReviews ? '✅' : '❌'}</p>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Has License</p>
                <p style={{ fontSize: '2rem', marginTop: 8 }}>{security.hasLicense ? '✅' : '❌'}</p>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Security Policy</p>
                <p style={{ fontSize: '2rem', marginTop: 8 }}>{security.hasSecurityPolicy ? '✅' : '❌'}</p>
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginBottom: 16 }}>🔒 Security Posture Checklist</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Branch Protection', checked: security.branchProtection },
                  { label: 'Required Pull Request Reviews', checked: security.requireReviews },
                  { label: 'Required Status Checks', checked: security.requireStatusChecks },
                  { label: 'Repository License', checked: security.hasLicense },
                  { label: 'Code of Conduct', checked: security.hasCodeowners },
                  { label: 'Security Policy', checked: security.hasSecurityPolicy },
                  { label: 'Contributing Guide', checked: security.hasContributing },
                ].map((item, i: number) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    padding: '12px 16px', 
                    background: item.checked ? 'rgba(0,230,118,0.1)' : 'rgba(255,23,68,0.1)',
                    borderRadius: 8,
                    border: `1px solid ${item.checked ? 'rgba(0,230,118,0.2)' : 'rgba(255,23,68,0.2)'}`
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{item.checked ? '✅' : '❌'}</span>
                    <span style={{ fontSize: '0.85rem', color: item.checked ? 'var(--health-green)' : 'var(--critical-red)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Community Health Score</p>
              <div style={{ marginTop: 16 }}>
                <div style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  border: `8px solid ${security.communityHealthPct > 70 ? 'var(--health-green)' : security.communityHealthPct > 40 ? 'var(--warning-amber)' : 'var(--critical-red)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800 }}>{security.communityHealthPct}%</span>
                </div>
              </div>
            </div>

            {/* Commit Hygiene Donut */}
            {commitHygiene && (
              <div className="grid-2">
                <div className="card" style={{ height: 300 }}>
                  <h4 style={{ marginBottom: 16 }}>📝 Commit Type Distribution</h4>
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={Object.entries(commitHygiene.prefixDistribution).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {Object.entries(commitHygiene.prefixDistribution).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CustomTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h4 style={{ marginBottom: 16 }}>📈 Commit Hygiene Metrics</h4>
                  {[
                    { label: 'Conventional Commits', value: `${commitHygiene.conventionalPct}%`, color: commitHygiene.conventionalPct > 60 ? 'var(--health-green)' : 'var(--warning-amber)' },
                    { label: 'Avg Message Length', value: commitHygiene.avgMessageLength.toString(), color: 'var(--text-primary)' },
                    { label: 'Short Messages', value: `${commitHygiene.shortMessagePct}%`, color: commitHygiene.shortMessagePct > 30 ? 'var(--critical-red)' : 'var(--text-primary)' },
                  ].map((m, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,229,255,0.04)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{m.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: m.color, fontSize: '0.85rem', fontWeight: 600 }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ———————————— TAB: Before & After Projection ———————————— */}
        {activeTab === 'projection' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* BEFORE - Current State */}
              <div className="card" style={{ border: '2px solid var(--critical-red)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <span style={{ fontSize: '1.5rem' }}>📉</span>
                  <h3 style={{ margin: 0, color: 'var(--critical-red)' }}>BEFORE</h3>
                </div>
                
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current DX Score</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '4rem', fontWeight: 900, color: getScoreColor(dxScore), margin: 0 }}>{dxScore}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Grade: <strong style={{ color: getGradeColor(grade) }}>{grade}</strong></p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '12px 16px', background: 'rgba(255,23,68,0.1)', borderRadius: 8, borderLeft: '3px solid var(--critical-red)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monthly Friction Cost</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--critical-red)' }}>${frictionCost.total.toLocaleString()}</div>
                  </div>
                  {[
                    { label: 'CI/CD Speed', val: scores.cicd },
                    { label: 'Review Latency', val: scores.reviews },
                    { label: 'Cloud Security', val: scores.security },
                    { label: 'Code Quality', val: scores.quality },
                    { label: 'Developer Flow', val: scores.flow },
                    { label: 'Environment', val: scores.environment },
                    { label: 'Bus Factor', val: scores.busFactor },
                    { label: 'Commit Hygiene', val: scores.commitHygiene },
                  ].map((m, i) => (
                    <div key={i} style={{ padding: '10px 16px', background: 'rgba(255,23,68,0.06)', borderRadius: 8, borderLeft: '3px solid var(--critical-red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{m.val}/100</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AFTER - Projected */}
              <div className="card" style={{ border: '2px solid var(--health-green)', background: 'linear-gradient(135deg, rgba(0,230,118,0.05), transparent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <span style={{ fontSize: '1.5rem' }}>📈</span>
                  <h3 style={{ margin: 0, color: 'var(--health-green)' }}>AFTER</h3>
                  <span className="badge" style={{ background: 'rgba(0,230,118,0.2)', color: 'var(--health-green)', marginLeft: 'auto' }}>PROJECTED</span>
                </div>
                
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Projected DX Score</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '4rem', fontWeight: 900, color: getScoreColor(projectedScore), margin: 0 }}>{projectedScore}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Grade: <strong style={{ color: getGradeColor(projectedScore >= 80 ? 'A' : projectedScore >= 60 ? 'B' : projectedScore >= 40 ? 'C' : 'D') }}>{projectedScore >= 80 ? 'A' : projectedScore >= 60 ? 'B' : projectedScore >= 40 ? 'C' : 'D'}</strong></p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ padding: '16px 20px', background: 'rgba(var(--health-green-rgb), 0.08)', borderRadius: 12, border: '1px solid var(--health-green)', position: 'relative' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projected Monthly Savings</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--health-green)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>+${totalSavings.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Score Boost</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--health-green)' }}>+{totalScoreBoost} pts</div>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Fixes Applied</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{enabledSims.length + (pipelineScoreBoost > 0 ? 1 : 0)} recommendations</div>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Timeline</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{aiDiagnosis?.recoveryPlan.implementationTimeline || '4-6 weeks'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Improvement Breakdown */}
            <div className="card">
              <h4 style={{ marginBottom: 20 }}>📈 Improvement Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {simulation.map((sim, i: number) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 16,
                    padding: '16px',
                    background: simChecked[sim.fixType] ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.02)',
                    borderRadius: 8,
                    border: `1px solid ${simChecked[sim.fixType] ? 'rgba(0,230,118,0.3)' : 'rgba(255,255,255,0.05)'}`
                  }}>
                    <input 
                      type="checkbox" 
                      checked={simChecked[sim.fixType] || false}
                      onChange={() => setSimChecked(prev => ({ ...prev, [sim.fixType]: !prev[sim.fixType] }))}
                      style={{ width: 20, height: 20, accentColor: 'var(--health-green)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{sim.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>+${(sim.monthlySavings * (hourlyRate / 75)).toLocaleString()}/mo savings</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--health-green)', fontSize: '1.2rem' }}>+{sim.scoreChange}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ———————————— TAB: Team Dashboard (Fleet Overview) ———————————— */}
        {activeTab === 'fleet' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {scanHistory.length < 2 ? (
              <EmptyClinicalState 
                icon="🏢"
                badge="FLEET_INTAKE_REQUIRED"
                title="📈 Organization Health Indexgistry Empty"
                description="The Team Dashboard requires diagnostic data from at least 2 repositories to calculate organizational averages and health distribution patterns."
                suggestedRepos={['microsoft/vscode', 'facebook/react', 'vercel/next.js']}
              />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  <div className="module-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Fleet Average Score</div>
                    <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--scan-cyan)' }}>
                      {Math.round(scanHistory.reduce((acc, h) => acc + h.score, 0) / scanHistory.length)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>pts</div>
                  </div>
                  <div className="module-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Active Registries</div>
                    <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--health-green)' }}>{scanHistory.length}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>repositories</div>
                  </div>
                  <div className="module-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Critical Silos</div>
                    <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--critical-red)' }}>
                      {scanHistory.filter(h => h.score < 40).length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>high risk</div>
                  </div>
                  <div className="module-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Health Variance</div>
                    <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--warning-amber)' }}>
                      {Math.max(...scanHistory.map(h => h.score)) - Math.min(...scanHistory.map(h => h.score))}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>pts delta</div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="card">
                     <h4 style={{ marginBottom: 20 }}>Health Distribution</h4>
                     <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie 
                            data={[
                              { name: 'Grade A', value: scanHistory.filter(h => h.score >= 80).length },
                              { name: 'Grade B', value: scanHistory.filter(h => h.score >= 60 && h.score < 80).length },
                              { name: 'Grade C', value: scanHistory.filter(h => h.score >= 40 && h.score < 60).length },
                              { name: 'Grade D/F', value: scanHistory.filter(h => h.score < 40).length },
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" outerRadius={80} dataKey="value" stroke="none"
                            label={({ name }) => name}
                          >
                            {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                          <Tooltip contentStyle={CustomTooltip} />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="card">
                    <h4 style={{ marginBottom: 20 }}>Organizational Benchmarks</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                       {scanHistory.sort((a,b) => b.score - a.score).map((h, i) => (
                         <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ 
                              width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface)', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              fontWeight: 900, color: h.score >= 80 ? 'var(--health-green)' : 'var(--scan-cyan)',
                              fontSize: '0.8rem', border: `1px solid ${h.score >= 80 ? 'var(--health-green)' : 'var(--scan-cyan)'}33`
                            }}>
                              {h.grade}
                            </div>
                            <div style={{ flex: 1 }}>
                               <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{h.repo.split('/')[1]}</div>
                               <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{h.repo.split('/')[0]}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                               <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{h.score}</div>
                               <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DX_SCORE</div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ———————————— TAB: ML Forecast ———————————— */}
        {activeTab === 'forecast' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* No CI/CD Data Fallback */}
            {!cicd || !cicd.totalRuns ? (
              <EmptyClinicalState 
                icon="🤖"
                badge="ML_MODEL_STANDBY"
                title="ML Forecast Unavailable"
                description="The Machine Learning forecast engine requires historical CI/CD build runs to train the prediction model. Without build duration and flaky patterns, the drift velocity cannot be calculated."
                suggestedRepos={['vercel/next.js', 'facebook/react']}
              />
            ) : (
              <>
                <div className="grid-3">
                  {/* ML Forecast Summary */}
                  <div className="card card-glow" style={{ position: 'relative', overflow: 'hidden' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ML Predicted Grade D In</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                      <h3 style={{ fontSize: '3rem', fontWeight: 900, color: (result.mlForecast?.days_until_grade_d || 0) < 30 ? 'var(--critical-red)' : 'var(--health-green)' }}>
                        {result.mlForecast?.days_until_grade_d ? (result.mlForecast.days_until_grade_d > 1000 ? 'Stable' : result.mlForecast.days_until_grade_d) : '∞'}
                      </h3>
                      {result.mlForecast?.days_until_grade_d && result.mlForecast.days_until_grade_d <= 1000 && <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>days</span>}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                      {(result.mlForecast?.days_until_grade_d || 1001) < 45 
                        ? '⚠️ Critical drift detected in repository architecture'
                        : (result.mlForecast?.days_until_grade_d || 1001) < 365 
                        ? '🟡 Gradual drift predicted: monitor quarterly'
                        : '✅ Project is technically stable for current velocity'}
                    </p>
                  </div>

                  <div className="card">
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Forecast MAE</p>
                    <div style={{ marginTop: 16 }}>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--scan-cyan)' }}>
                        {result.mlForecast?.mae ? result.mlForecast.mae.toFixed(1) : (cicd.flakyRate > 0 ? (cicd.flakyRate / 10).toFixed(1) : '0.1')}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CI/CD error delta (MAE)</p>
                    </div>
                  </div>

                  <div className="card">
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ML Flaky Detection</p>
                    <div style={{ marginTop: 16 }}>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: 900, color: result.flakyRate > 20 ? 'var(--critical-red)' : result.flakyRate > 10 ? 'var(--warning-amber)' : 'var(--health-green)' }}>
                        {result.flakyRate ?? 0}%
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>builds classified as flaky</p>
                    </div>
                  </div>
                </div>

                {/* Forecast Chart */}
                <div className="card" style={{ height: 400 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <h4>📈 DX Score Forecast (30 Days)</h4>
                    {result.mlSource === 'python' ? (
                      <span className="badge" style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--health-green)', border: '1px solid rgba(0,230,118,0.3)', fontSize: '11px', padding: '2px 8px' }}>ML: Python service</span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', padding: '2px 8px' }}>ML: Built-in model</span>
                    )}
                  </div>
                  {result.mlForecast?.forecast && result.mlForecast.forecast.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                      <ComposedChart data={[
                        ...(cicd?.buildTimeTrend?.slice(-14).map(t => ({
                          date: new Date(t.date).toISOString().split('T')[0],
                          score: Math.max(0, 100 - (t.durationMinutes / 60) * 8),
                          type: 'historical',
                        })) || []),
                        ...result.mlForecast.forecast.map(f => ({
                          date: f.date,
                          score: f.predicted_score,
                          upper: f.upper,
                          lower: f.lower,
                          type: 'forecast',
                        }))
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-surface)" />
                        <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                        <Tooltip contentStyle={CustomTooltip} />
                        <Area type="monotone" dataKey="upper" stroke="none" fill="var(--scan-cyan)" fillOpacity={0.1} name="Upper Bound" />
                        <Area type="monotone" dataKey="lower" stroke="none" fill="var(--bg-primary)" fillOpacity={1} name="Lower Bound" />
                        <Line type="monotone" dataKey="score" stroke="var(--scan-cyan)" strokeWidth={2} dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.type === 'historical') {
                            return <circle cx={cx} cy={cy} r={4} fill="var(--scan-cyan)" />;
                          }
                          return <circle cx={cx} cy={cy} r={4} fill="var(--health-green)" strokeDasharray="3 3" />;
                        }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
                      <p style={{ fontSize: '0.9rem', marginBottom: 4 }}>Forecast data not generated</p>
                      <p style={{ fontSize: '0.75rem' }}>The ML service could not produce a prediction for this scan.</p>
                    </div>
                  )}
                </div>

                {/* Grade Threshold Line */}
                <div className="module-card" style={{ background: 'rgba(255,23,68,0.05)', border: '1px solid rgba(255,23,68,0.2)' }}>
                  <h4 style={{ color: 'var(--critical-red)', marginBottom: 8 }}>⚠️ Grade D Threshold</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    The dashed red line at 40 points marks the Grade D threshold. 
                    {result.mlForecast?.days_until_grade_d && result.mlForecast.days_until_grade_d < 999 
                      ? ` Your pipeline is predicted to cross this threshold in ${result.mlForecast.days_until_grade_d} days.`
                      : ' Your pipeline is predicted to stay above this threshold for the foreseeable future.'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ———————————— TAB: Time Machine ———————————— */}
        {activeTab === 'timemachine' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h3 style={{ margin: 0 }}>⏱️ Time Machine — Historical DX Trends</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                    Track how your repository's DX health has evolved over time
                  </p>
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    const history = JSON.parse(localStorage.getItem('devmri_history') || '[]');
                    const newEntry = { repo: result.repo.fullName, dxScore: result.dxScore, grade: result.grade, date: new Date().toISOString() };
                    localStorage.setItem('devmri_history', JSON.stringify([newEntry, ...history].slice(0, 50)));
                  }}
                  style={{ fontSize: '0.8rem' }}
                >
                  💾 Save Current Scan
                </button>
              </div>

              {/* Historical Data */}
              {(() => {
                const history = JSON.parse(localStorage.getItem('devmri_history') || '[]');
                const repoHistory = history.filter((h: any) => h.repo === result.repo.fullName);
                
                if (repoHistory.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏱️</div>
                      <h4 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No Historical Data Yet</h4>
                      <p>Save scans to build a historical record of your DX score trends.</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          const newEntry = { repo: result.repo.fullName, dxScore: result.dxScore, grade: result.grade, date: new Date().toISOString() };
                          localStorage.setItem('devmri_history', JSON.stringify([newEntry]));
                        }}
                        style={{ marginTop: 16 }}
                      >
                        💾 Save First Scan
                      </button>
                    </div>
                  );
                }

                const sortedHistory = repoHistory.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const chartData = sortedHistory.map((h: any, idx: number) => ({
                  date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  score: h.dxScore,
                  grade: h.grade,
                  change: idx > 0 ? h.dxScore - sortedHistory[idx - 1].dxScore : 0,
                  fullDate: h.date,
                }));

                const latest = chartData[chartData.length - 1];
                const first = chartData[0];
                const totalChange = latest.score - first.score;
                const trend = totalChange > 0 ? 'improving' : totalChange < 0 ? 'declining' : 'stable';
                const daysDiff = Math.ceil((new Date(latest.fullDate).getTime() - new Date(first.fullDate).getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                      <div className="module-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Current Score</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: getScoreColor(latest.score) }}>{latest.score}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Grade {latest.grade}</div>
                      </div>
                      <div className="module-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{daysDiff} Day Trend</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: totalChange > 0 ? 'var(--health-green)' : totalChange < 0 ? 'var(--critical-red)' : 'var(--text-secondary)' }}>
                          {totalChange > 0 ? '+' : ''}{totalChange}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{trend}</div>
                      </div>
                      <div className="module-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Scans Tracked</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--scan-cyan)' }}>{chartData.length}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>data points</div>
                      </div>
                    </div>

                    {/* Trend Chart */}
                    <div style={{ height: 300, marginBottom: 24 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-surface)" />
                          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 10, color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                          <Area type="monotone" dataKey="score" fill="rgba(0,229,255,0.1)" stroke="var(--scan-cyan)" strokeWidth={2} />
                          <Line type="monotone" dataKey="score" stroke="var(--scan-cyan)" strokeWidth={2} dot={{ fill: 'var(--scan-cyan)', r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Change Indicators */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <h4 style={{ marginBottom: 8 }}>📈 Score History</h4>
                      {chartData.slice().reverse().map((d: any, idx: number) => (
                        <div key={idx} className="module-card" style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderLeft: `4px solid ${getScoreColor(d.score)}`
                        }}>
                          <div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{d.date}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: getScoreColor(d.score) }}>{d.score}</span>
                            <span className={`badge ${d.grade === 'A' ? 'badge-success' : d.grade === 'B' ? 'badge-warning' : d.grade === 'C' ? 'badge-medium' : 'badge-critical'}`}>
                              Grade {d.grade}
                            </span>
                            {d.change !== 0 && (
                              <span style={{ 
                                fontSize: '0.8rem', 
                                color: d.change > 0 ? 'var(--health-green)' : 'var(--critical-red)',
                                fontFamily: 'var(--font-mono)'
                              }}>
                                {d.change > 0 ? '+' : ''}{d.change}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Enterprise Insight */}
                    {daysDiff > 14 && (
                      <div className="module-card" style={{ 
                        background: 'linear-gradient(135deg, rgba(0,229,255,0.1), transparent)', 
                        border: '1px solid rgba(0,229,255,0.2)',
                        marginTop: 16
                      }}>
                        <h4 style={{ color: 'var(--scan-cyan)', marginBottom: 8 }}>📊 Enterprise Insight</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                          {trend === 'improving' 
                            ? `Your DX health has improved by ${totalChange} points over ${daysDiff} days. This positive trajectory indicates effective engineering practices.`
                            : trend === 'declining'
                            ? `Your DX health has declined by ${Math.abs(totalChange)} points over ${daysDiff} days. Immediate attention to friction points is recommended.`
                            : `Your DX health has remained stable over ${daysDiff} days.`
                          }
                          {' '}Enterprise buyers value consistent, improving DX metrics as indicators of a healthy codebase.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ———————————— TAB: Genetic Drift ———————————— */}
        {activeTab === 'geneticdrift' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card">
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: 0 }}>🧬 Genetic Drift — Code Ownership Visualization</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                  Network graph showing code ownership and bus factor risk zones
                </p>
              </div>

              {/* Ownership Graph */}
              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-surface)" />
                      <XAxis type="number" dataKey="x" name="ownership" unit="%" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[0, 100]} />
                      <YAxis type="number" dataKey="y" name="churn" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-primary)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 10, color: 'var(--text-primary)', fontSize: '0.8rem' }}
                        cursor={{ strokeDasharray: '3 3' }}
                      />
                      {(busFactor?.knowledgeSilos || []).map((silo, idx) => (
                        <Scatter 
                          key={idx}
                          name={silo.directory}
                          data={[{ x: silo.ownershipPercentage, y: Math.random() * 80 + 10, ...silo }]} 
                          fill={silo.risk === 'high' ? 'var(--critical-red)' : silo.risk === 'medium' ? 'var(--warning-amber)' : 'var(--health-green)'}
                          shape={(props: any) => {
                            const { cx, cy, payload } = props;
                            return (
                              <g>
                                <circle cx={cx} cy={cy} r={silo.risk === 'high' ? 18 : silo.risk === 'medium' ? 14 : 10} fill={silo.risk === 'high' ? 'var(--critical-red)' : silo.risk === 'medium' ? 'var(--warning-amber)' : 'var(--health-green)'} opacity={0.7} />
                                <circle cx={cx} cy={cy} r={silo.risk === 'high' ? 9 : silo.risk === 'medium' ? 7 : 5} fill="#fff" />
                                <text x={cx} y={cy + 35} textAnchor="middle" fill="var(--text-secondary)" fontSize={10}>{silo.directory}</text>
                                <text x={cx} y={cy + 48} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>{silo.ownerlogin}</text>
                              </g>
                            );
                          }}
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Bus Factor Risk Zones</h4>
                  {(busFactor?.knowledgeSilos || []).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No critical ownership silos detected.</p>
                  ) : (
                    (busFactor?.knowledgeSilos || []).map((silo, idx) => (
                      <div 
                        key={idx}
                        className="module-card"
                        style={{
                          borderLeft: `4px solid ${silo.risk === 'high' ? 'var(--critical-red)' : silo.risk === 'medium' ? 'var(--warning-amber)' : 'var(--health-green)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{silo.directory}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Owner: {silo.ownerlogin}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                              fontSize: '1.2rem', 
                              fontWeight: 900, 
                              color: silo.risk === 'high' ? 'var(--critical-red)' : silo.risk === 'medium' ? 'var(--warning-amber)' : 'var(--health-green)' 
                            }}>
                              {silo.ownershipPercentage}%
                            </div>
                            <span className={`badge ${silo.risk === 'high' ? 'badge-critical' : silo.risk === 'medium' ? 'badge-high' : 'badge-success'}`}>
                              {silo.risk.toUpperCase()} RISK
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Bus Factor Summary */}
                  <div className="module-card" style={{ background: 'rgba(255,23,68,0.05)', border: '1px solid rgba(255,23,68,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Bus Factor</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: busFactor?.busFactor && busFactor.busFactor <= 2 ? 'var(--critical-red)' : busFactor?.busFactor && busFactor.busFactor <= 3 ? 'var(--warning-orange)' : 'var(--health-green)' }}>
                        {busFactor?.busFactor || 1}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>
                      {busFactor?.busFactor && busFactor.busFactor <= 2 
                        ? 'Critical: Only 1-2 people know this code. High risk of knowledge loss.' 
                        : busFactor?.busFactor && busFactor.busFactor <= 3
                        ? 'Moderate: Few maintainers. Consider spreading knowledge.'
                        : 'Healthy: Multiple contributors understand this code.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Top Contributors */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ marginBottom: 16 }}>Top Contributors</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {(busFactor?.topContributors || []).map((contributor, idx) => (
                    <div key={idx} className="module-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 40, height: 40, borderRadius: '50%', 
                        background: `linear-gradient(135deg, var(--scan-cyan), var(--health-green))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, color: '#000'
                      }}>
                        {contributor.login.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{contributor.login}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contributor.commits} commits</div>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--scan-cyan)' }}>{contributor.percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Warning */}
              {busFactor?.riskLevel === 'critical' && (
                <div className="module-card" style={{ 
                  background: 'linear-gradient(135deg, rgba(255,23,68,0.1), transparent)', 
                  border: '1px solid rgba(255,23,68,0.3)' 
                }}>
                  <h4 style={{ color: 'var(--critical-red)', marginBottom: 8 }}>⚠️ Critical Knowledge Silo Detected</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    Critical code paths have only one maintainer. If this person leaves or gets hit by a bus, 
                    the project faces significant knowledge loss. Consider:
                  </p>
                  <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8, paddingLeft: 20 }}>
                    <li>Adding more reviewers to these files</li>
                    <li>Creating documentation and code walkthroughs</li>
                    <li>Pair programming on critical features</li>
                    <li>Setting up CODEOWNERS file</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ———————————— TAB: Team X-Ray ———————————— */}
        {activeTab === 'teamxray' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card">
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: 0 }}>👥 Team DETAILS — Who Works on What?</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                  Maps contributors to codebase domains using git commit history
                </p>
              </div>

              {teamLoading && (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <div className="heartbeat" style={{ margin: '0 auto 16px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Scanning team topology...</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 8 }}>Analyzing commit history across domains</p>
                </div>
              )}

              {teamError && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--critical-red)' }}>
                  <p>⚠️ {teamError}</p>
                </div>
              )}

              {teamData && (
                <>
                  {/* Domain Summary Cards — Premium Animated */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
                    {teamData.domainSummary.map((d: any, dIdx: number) => (
                      <div key={d.name} className="team-domain-card" style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${d.color}30`,
                        borderRadius: 16, padding: 20,
                        borderLeft: `4px solid ${d.color}`,
                        animationDelay: `${dIdx * 0.08}s`,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>{d.icon}</span>
                          <span style={{ background: `${d.color}18`, color: d.color, border: `1px solid ${d.color}33`, fontSize: '0.6rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' }}>
                            {d.memberCount} {d.memberCount === 1 ? 'dev' : 'devs'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem', marginBottom: 4, color: 'var(--text-primary)' }}>{d.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {d.totalFileTouches} file touches
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
                          {d.members.slice(0, 3).join(', ')}{d.members.length > 3 ? ` +${d.members.length - 3}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Risk Alerts — White Theme Compatible */}
                  {teamData.risks.length > 0 && (
                    <div className="team-risks-section" style={{ marginBottom: 28 }}>
                      <h4 style={{ fontSize: '0.8rem', color: '#e53935', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 900 }}>⚠️ Team Risks</h4>
                      {teamData.risks.map((r: any, i: number) => (
                        <div key={i} className="team-risk-card" style={{
                          display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px',
                          background: r.severity === 'CRITICAL' ? 'rgba(229,57,53,0.1)' : 'rgba(255,152,0,0.08)',
                          border: `1.5px solid ${r.severity === 'CRITICAL' ? '#ffcdd2' : '#ffe0b2'}`,
                          borderRadius: 14, marginBottom: 10, fontSize: '0.85rem',
                          borderLeft: `4px solid ${r.severity === 'CRITICAL' ? '#e53935' : '#ff9800'}`,
                          animationDelay: `${i * 0.1}s`,
                        }}>
                          <span style={{
                            background: r.severity === 'CRITICAL' ? '#e53935' : '#ff9800',
                            color: '#fff',
                            fontSize: '0.6rem', fontWeight: 900,
                            padding: '4px 10px', borderRadius: 6,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            boxShadow: r.severity === 'CRITICAL' ? '0 2px 8px rgba(229,57,53,0.3)' : '0 2px 8px rgba(255,152,0,0.2)'
                          }}>{r.severity}</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: r.severity === 'CRITICAL' ? 600 : 400 }}>{r.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                                    {/* ═══ Contributor Grid — "Meet Our Team" Style ═══ */}
                  <div className="team-grid-container">
                    <h3 className="team-grid-title">👥 {result?.repo?.fullName?.split('/').pop() || 'Repository'} — Contributors</h3>
                    <p className="team-grid-subtitle">Contributor profiles mapped to codebase domains via git commit history</p>


                    {/* Contributor Grid */}
                    <div className="team-contributors-grid">
                      {teamData.contributors.slice(0, 12).map((c: any, cIdx: number) => {
                        const pastelColors = ['#FFD6E0', '#D4F0FF', '#E8D4FF', '#D4FFE4', '#FFF3D4', '#FFE0D4', '#D4EAFF', '#F0D4FF', '#D4FFF0', '#FFDDD4', '#E0FFD4', '#D4DFFF'];
                        const bgColor = pastelColors[cIdx % pastelColors.length];
                        return (
                          <div key={c.login} className="team-member-card">
                            {cIdx === 0 && <div className="principal-badge">Principal</div>}
                            <div className="team-avatar-wrapper" style={{ background: bgColor }}>
                              {c.avatar ? (
                                <img src={c.avatar} alt={c.login} />
                              ) : (
                                <div className="fallback-avatar" style={{ background: bgColor }}>👤</div>
                              )}
                            </div>
                            <div className="team-member-name">{c.login}</div>
                            <div className="team-member-role">{c.primaryIcon} {c.primaryDomain} · {c.role}</div>
                            <div className="team-member-stats">
                              <div className="stat-item">
                                <div className="stat-value">{c.totalCommits}</div>
                                <div className="stat-label">Commits</div>
                              </div>
                              <div className="stat-item">
                                <div className="stat-value">{c.knowledgeCoverage}%</div>
                                <div className="stat-label">Coverage</div>
                              </div>
                              <div className="stat-item">
                                <div className="stat-value">${c.economicImpact?.toLocaleString()}</div>
                                <div className="stat-label">Value</div>
                              </div>
                            </div>
                            <div className="team-domain-bar">
                              {c.domainBreakdown?.map((d: any, i: number) => (
                                <div key={i} style={{ width: `${d.percentage}%`, background: d.color, minWidth: d.percentage > 5 ? 4 : 0 }} title={`${d.name}: ${d.percentage}%`} />
                              ))}
                            </div>
                            <div className="team-social-icons" style={{ marginTop: 14 }}>
                              <a href={`https://github.com/${c.login}`} target="_blank" rel="noopener noreferrer" className="team-social-icon" title="GitHub Profile">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                              </a>
                              <span className="team-social-icon" title={`Activity: ${c.activityStatus}`}>
                                <span style={{ background: c.activityStatus === 'Active' ? '#00e676' : c.activityStatus === 'Recent' ? '#ffab00' : '#888', width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
                              </span>
                              {c.burnoutRisk === 'high' && (
                                <span className="team-social-icon" style={{ background: 'rgba(255, 23, 68, 0.1)', borderColor: 'rgba(255, 23, 68, 0.2)', color: 'var(--critical-red)' }} title="Burnout Risk">⚡</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="team-footer-stats">
                      Analyzed {teamData.analyzedCommits} commits · {teamData.totalContributors} contributors detected
                    </div>
                  </div>
                  {/* Legacy list removed in favor of high-fidelity grid above */}

                </>
              )}
            </div>
          </div>
        )}

        {/* ———————————— TAB: Pathology ———————————— */}
        {activeTab === 'pathology' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card">
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: 0 }}>🔬 Digital Pathology — Deep File Diagnostics</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                  Identifying high-friction hotspots and critical code lesions
                </p>
              </div>

              {/* Lab Overview */}
              <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="module-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--critical-red)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Lesions</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--critical-red)' }}>
                    {heatmap?.hotspots.filter(h => h.risk === 'critical').length || 0}
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>Immediate surgery required</p>
                </div>
                <div className="module-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--warning-orange)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>High Churn Area</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--warning-orange)' }}>
                    {Math.round((heatmap?.totalChurn || 0) / 10)}%
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>Unstable code territory</p>
                </div>
                <div className="module-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--scan-cyan)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Friction Heat</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--scan-cyan)' }}>
                    ${heatmap?.hotspots.reduce((sum, h) => sum + h.cost, 0) || 0}
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>Monthly cost of lesions</p>
                </div>
              </div>

              {/* Pathology Results */}
              <h4 style={{ fontSize: '0.8rem', color: 'var(--scan-cyan)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>🔎 Biopsy Results: Target Files</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(heatmap?.hotspots || []).slice(0, 10).map((h, i) => (
                  <div key={i} className="module-card" style={{ padding: '20px', borderLeft: `5px solid ${h.risk === 'critical' ? 'var(--critical-red)' : h.risk === 'high' ? 'var(--warning-orange)' : 'var(--info-blue)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                          {h.path}
                          {h.isDeepScan && (
                            <span className="badge-glow" style={{ fontSize: '0.55rem', padding: '2px 8px', background: 'rgba(0,184,212,0.15)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)' }}>
                              ⚡ DEEP BIOPSY
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <span className="badge" style={{ background: h.risk === 'critical' ? 'rgba(255,23,68,0.1)' : 'rgba(0,184,212,0.1)', color: h.risk === 'critical' ? 'var(--critical-red)' : 'var(--scan-cyan)', border: 'none', fontSize: '0.6rem' }}>
                            {h.risk.toUpperCase()} SEVERITY
                          </span>
                          {h.healthScore !== undefined && (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: getScoreColor(h.healthScore), border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.6rem' }}>
                              HEALTH: {h.healthScore}%
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Owned by {h.owner}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--critical-red)', fontFamily: 'var(--font-mono)', textShadow: '0 0 10px rgba(255,23,68,0.2)' }}>${h.cost}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Friction</div>
                      </div>

                    </div>

                    {/* Metabolism / Stats */}
                    <div className="grid-4" style={{ marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>🔄 Churn</div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--scan-cyan)' }}>{h.churn} commits</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>📝 Complexity</div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--scan-cyan)' }}>Level {Math.ceil(h.complexity / 20)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>🩸 Bleeding</div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--critical-red)' }}>{Math.round(h.churn * 0.4)} co-changes</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>⚕️ Health</div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: h.risk === 'critical' ? 'var(--critical-red)' : 'var(--health-green)' }}>
                           {Math.max(10, 100 - Math.round(h.cost / 10))}%
                        </div>
                      </div>
                    </div>

                    {/* Lab Note + Action */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                      <div style={{ 
                        flex: 1, 
                        background: 'var(--bg-secondary, rgba(255,109,0,0.05))', border: '1px solid var(--border-color, rgba(255,109,0,0.1))',
                        borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-primary, #333)',
                        fontStyle: 'italic', display: 'flex', gap: 10, alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>📝</span>
                        <span>Pathology Note: High churn and complexity suggests this file has become a "God Object". Recommend modular split to reduce friction.</span>
                      </div>
                      <button 
                        onClick={() => {
                          setPendingSurgery({
                            title: h.path,
                            severity: h.risk.toUpperCase(),
                            initialCode: `// ANALYZING LESION IN ${h.path}...\n// HIGH CHURN: ${h.churn} COMMITS\n// COMPLEXITY: ${h.complexity}\n\n// TODO: REFACTOR TARGET\nclass ${h.path.split('/').pop()?.split('.')[0] || 'Module'} {\n  // Legacy code detected here...\n}`
                          });
                          setActiveTab('surgery');
                        }}
                        style={{
                          background: 'linear-gradient(135deg, var(--scan-cyan), #00b8d4)',
                          color: '#000', fontWeight: 900, fontSize: '0.7rem', border: 'none',
                          borderRadius: 8, padding: '0 20px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          boxShadow: '0 4px 15px rgba(0,229,255,0.2)'
                        }}
                      >
                        <span>🎬 START SURGERY</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: Patient Records (History) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* ———————————— TAB: Code Autopsy ———————————— */}
        {activeTab === 'autopsy' && (
          <div className="animate-fade-in">
            <CodeAutopsy
              dxScore={dxScore}
              grade={grade}
              frictionCost={frictionCost}
              cicd={result.cicd}
              reviews={result.reviews}
              deps={result.deps}
              necrosis={result.necrosis}
              busFactor={result.busFactor}
              heatmap={heatmap}
              repoName={result.repo.fullName}
            />
          </div>
        )}

        {/* ———————————— TAB: Live Failure Replay ———————————— */}
        {activeTab === 'replay' && (
          <div className="animate-fade-in">
            <FailureReplay
              dxScore={dxScore}
              grade={grade}
              frictionCost={frictionCost}
              cicd={result.cicd}
              reviews={result.reviews}
              necrosis={result.necrosis}
              heatmap={heatmap}
              repoName={result.repo.fullName}
            />
          </div>
        )}

        {/* ———————————— TAB: Engineering DNA ———————————— */}
        {activeTab === 'dna' && (
          <div className="animate-fade-in">
            <EngineeringDNA
              repoName={result.repo.fullName}
              commits={(result.repo as any).commitCount || 500}
              contributors={result.busFactor?.topContributors?.length || (result.repo as any).contributorCount || 10}
              files={(result.repo as any).fileCount || 200}
              dxScore={dxScore}
              grade={grade}
              cicd={result.cicd}
              reviews={result.reviews}
              necrosis={result.necrosis}
              heatmap={heatmap}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h3 style={{ margin: 0 }}>ðŸ“‹ Patient Records — Health Journey</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                    Track your repository's diagnostic history over time
                  </p>
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    const newEntry = { repo: result.repo.fullName, dxScore: result.dxScore, grade: result.grade, date: new Date().toISOString() };
                    const history = JSON.parse(localStorage.getItem('devmri_history') || '[]');
                    localStorage.setItem('devmri_history', JSON.stringify([newEntry, ...history].slice(0, 100)));
                  }}
                  style={{ fontSize: '0.8rem' }}
                >
                  ðŸ’¾ Save Current Scan
                </button>
              </div>

              {(() => {
                const history = JSON.parse(localStorage.getItem('devmri_history') || '[]');
                const repoHistory = history.filter((h: any) => h.repo === result.repo.fullName);
                const sortedHistory = repoHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                if (sortedHistory.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '3rem', marginBottom: 16 }}>ðŸ“‹</div>
                      <h4 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No Patient Records</h4>
                      <p>Save scans to build a health history for this repository.</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          const newEntry = { repo: result.repo.fullName, dxScore: result.dxScore, grade: result.grade, date: new Date().toISOString() };
                          localStorage.setItem('devmri_history', JSON.stringify([newEntry]));
                        }}
                        style={{ marginTop: 16 }}
                      >
                        ðŸ’¾ Save First Record
                      </button>
                    </div>
                  );
                }

                // Calculate journey metrics
                const firstScan = sortedHistory[sortedHistory.length - 1];
                const latestScan = sortedHistory[0];
                const scoreChange = latestScan.dxScore - firstScan.dxScore;
                const daysSpan = Math.ceil((new Date(latestScan.date).getTime() - new Date(firstScan.date).getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <>
                    {/* Journey Summary */}
                    <div className="grid-3" style={{ marginBottom: 24 }}>
                      <div className="module-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>First Scan</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: getScoreColor(firstScan.dxScore) }}>{firstScan.dxScore}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(firstScan.date).toLocaleDateString()}</div>
                      </div>
                      <div className="module-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: getScoreColor(latestScan.dxScore) }}>{latestScan.dxScore}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Grade {latestScan.grade}</div>
                      </div>
                      <div className="module-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Journey</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: scoreChange > 0 ? 'var(--health-green)' : scoreChange < 0 ? 'var(--critical-red)' : 'var(--text-secondary)' }}>
                          {scoreChange > 0 ? '+' : ''}{scoreChange}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{daysSpan} days</div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ position: 'relative', paddingLeft: 30 }}>
                      <div style={{ 
                        position: 'absolute', left: 8, top: 0, bottom: 0, 
                        width: 2, background: 'linear-gradient(180deg, var(--scan-cyan), var(--health-green))' 
                      }} />
                      
                      {sortedHistory.map((scan: any, idx: number) => {
                        const isImprovement = idx < sortedHistory.length - 1 && scan.dxScore > sortedHistory[idx + 1].dxScore;
                        const isDecline = idx < sortedHistory.length - 1 && scan.dxScore < sortedHistory[idx + 1].dxScore;
                        
                        return (
                          <div key={idx} style={{ 
                            position: 'relative', marginBottom: 24,
                            padding: '16px 20px', 
                            background: idx === 0 ? 'rgba(0,229,255,0.1)' : 'rgba(10,14,20,0.5)',
                            borderRadius: 12,
                            border: `1px solid ${idx === 0 ? 'rgba(0,229,255,0.3)' : 'rgba(0,229,255,0.1)'}`,
                          }}>
                            <div style={{ 
                              position: 'absolute', left: -26, top: '50%', transform: 'translateY(-50%)',
                              width: 12, height: 12, borderRadius: '50%', 
                              background: getScoreColor(scan.dxScore),
                              boxShadow: `0 0 10px ${getScoreColor(scan.dxScore)}`
                            }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {new Date(scan.date).toLocaleDateString('en-US', { 
                                    year: 'numeric', month: 'short', day: 'numeric', 
                                    hour: '2-digit', minute: '2-digit' 
                                  })}
                                </div>
                                {idx === 0 && (
                                  <span className="badge" style={{ background: 'rgba(0,229,255,0.2)', color: 'var(--scan-cyan)', marginTop: 4 }}>
                                    LATEST
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                {idx < sortedHistory.length - 1 && (
                                  <span style={{ 
                                    fontSize: '0.8rem', 
                                    color: isImprovement ? 'var(--health-green)' : isDecline ? 'var(--critical-red)' : 'var(--text-muted)',
                                    fontWeight: 600
                                  }}>
                                    {isImprovement ? 'â†‘' : isDecline ? 'â†“' : 'â†’'} {Math.abs(scan.dxScore - sortedHistory[idx + 1].dxScore)}
                                  </span>
                                )}
                                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: getScoreColor(scan.dxScore) }}>
                                  {scan.dxScore}
                                </span>
                                <span className={`badge ${scan.grade === 'A' ? 'badge-success' : scan.grade === 'B' ? 'badge-warning' : scan.grade === 'C' ? 'badge-medium' : 'badge-critical'}`}>
                                  {scan.grade}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Export */}
                    <div style={{ marginTop: 16 }}>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          const data = JSON.stringify(sortedHistory, null, 2);
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `devmri-history-${result.repo.fullName.replace('/', '-')}.json`;
                          a.click();
                        }}
                        style={{ width: '100%' }}
                      >
                        ðŸ“¥ Export Patient Records
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: DX Badge â•â•â•â•â•â••â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'badge' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card card-glow" style={{ textAlign: 'center', padding: 40 }}>
              <h2 style={{ marginBottom: 8 }}>ðŸ·ï¸ Your DX-Score Badge</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                Add this badge to your README to show your repo&apos;s DX health score.
                Other developers will want to scan their repos too!
              </p>

              {/* Badge Preview */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                <div style={{
                  background: 'var(--bg-primary)', borderRadius: 12, padding: '24px 40px',
                  border: '1px solid rgba(0,229,255,0.15)',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/badge?score=${dxScore}&repo=${result.repo.fullName}`}
                    alt={`DX Score: ${dxScore}`}
                    style={{ height: 28 }}
                  />
                </div>
              </div>

              {/* Markdown Snippet */}
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <h4 style={{ textAlign: 'left', marginBottom: 8 }}>ðŸ“‹ Markdown (for README.md)</h4>
                <div style={{
                  background: 'var(--bg-void)', borderRadius: 8, padding: '16px 20px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--health-green)',
                  textAlign: 'left', position: 'relative', border: '1px solid var(--bg-surface)',
                  wordBreak: 'break-all',
                }}>
                  <code>{`![DX Score: ${dxScore}](${typeof window !== 'undefined' ? window.location.origin : ''}/api/badge?repo=${result.repo.fullName}&score=${dxScore})`}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`![DX Score: ${dxScore}](${window.location.origin}/api/badge?repo=${result.repo.fullName}&score=${dxScore})`);
                      setBadgeCopied(true);
                      setTimeout(() => setBadgeCopied(false), 2000);
                    }}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: badgeCopied ? 'var(--health-green)' : 'var(--bg-surface)',
                      color: badgeCopied ? '#000' : 'var(--scan-cyan)',
                      border: 'none', borderRadius: 6, padding: '4px 10px',
                      fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    {badgeCopied ? 'âœ“ Copied!' : 'Copy'}
                  </button>
                </div>

                <h4 style={{ textAlign: 'left', marginBottom: 8, marginTop: 24 }}>ðŸ”— HTML Embed</h4>
                <div style={{
                  background: 'var(--bg-void)', borderRadius: 8, padding: '16px 20px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--purple)',
                  textAlign: 'left', border: '1px solid var(--bg-surface)',
                  wordBreak: 'break-all',
                }}>
                  <code>{`<a href="${typeof window !== 'undefined' ? window.location.origin : ''}/scanning?repo=${result.repo.fullName}"><img src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/badge?repo=${result.repo.fullName}&score=${dxScore}" alt="DX Score" /></a>`}</code>
                </div>

                <h4 style={{ textAlign: 'left', marginBottom: 8, marginTop: 24 }}>âš¡ GitHub Action (auto-update badge on every push)</h4>
                <div style={{
                  background: 'var(--bg-void)', borderRadius: 8, padding: '16px 20px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--warning-amber)',
                  textAlign: 'left', border: '1px solid var(--bg-surface)', whiteSpace: 'pre-wrap',
                }}>
{`name: DevMRI DX Score
on:
  push:
    branches: [main]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run DevMRI Scan
        uses: devmri/action@v1
        with:
          repo: \${{ github.repository }}
          token: \${{ secrets.GITHUB_TOKEN }}`}
                </div>
              </div>
            </div>

            {/* PR Bot Preview */}
            <div className="card">
              <h4 style={{ marginBottom: 16 }}>🤖 PR Diagnostic Bot Preview</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
                When the GitHub action runs, it automatically comments on every PR with a mini diagnostic:
              </p>
              <div style={{
                background: '#0d1117', border: '1px solid #30363d', borderRadius: 8,
                padding: 20, fontFamily: 'var(--font-display)',
              }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--scan-cyan), var(--health-green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🩺</div>
                  <div>
                    <span style={{ fontWeight: 700, color: '#c9d1d9' }}>DevMRI Bot</span>
                    <span style={{ color: '#8b949e', fontSize: '0.85rem', marginLeft: 8 }}>commented just now</span>
                  </div>
                </div>
                <div style={{ color: '#c9d1d9', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  <p style={{ marginBottom: 8 }}>### 🩺 DevMRI Diagnostic Summary</p>
                  <p style={{ marginBottom: 4 }}>| Metric | Value | Status |</p>
                  <p style={{ marginBottom: 4 }}>|--------|-------|--------|</p>
                  <p style={{ marginBottom: 4 }}>| DX Score | <strong style={{ color: getScoreColor(dxScore) }}>{dxScore}</strong> | Grade <strong>{grade}</strong> |</p>
                  <p style={{ marginBottom: 4 }}>| CI Health | {scores.cicd}% | {scores.cicd > 70 ? 'âœ…' : 'âš ï¸'} |</p>
                  <p style={{ marginBottom: 4 }}>| Review Load | {scores.reviews}% | {scores.reviews > 70 ? 'âœ…' : 'âš ï¸'} |</p>
                  <p style={{ marginBottom: 4 }}>| Friction Cost | ${frictionCost.total.toLocaleString()}/mo | 💰 |</p>
                  <p style={{ marginTop: 12, color: '#8b949e', fontSize: '0.8rem' }}>_Powered by DevMRI Â· [Full Report â†’]({typeof window !== 'undefined' ? window.location.origin : ''}/scanning?repo={result.repo.fullName})_</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€â”€ PREMIUM CHAT UX (Floating Component) â”€â”€â”€ */}
      <div className="chat-bubble-container">
        {isChatOpen && (
          <div className={`chat-window-premium ${isChatMaximized ? 'maximized' : ''}`}>
            <div 
              className="chat-header-premium"
              onClick={() => setIsChatMaximized(!isChatMaximized)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: chatMode === 'codebase' ? 'var(--purple)' : 'var(--scan-cyan)', boxShadow: `0 0 10px ${chatMode === 'codebase' ? 'var(--purple)' : 'var(--scan-cyan)'}`, animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 950, letterSpacing: '0.1em', color: chatMode === 'codebase' ? 'var(--purple)' : 'var(--scan-cyan)' }}>
                  {chatMode === 'codebase' ? 'DNA_CODEBASE_LENS' : 'AI_CLINICAL_ADVISOR'}
                </span>
                {isChatMaximized && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>IMMERSIVE MODE</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                {/* Mode Toggle */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: 20, border: '1px solid rgba(0,229,255,0.15)', padding: 2, marginRight: 4 }}>
                  <button
                    onClick={() => setChatMode('diagnostics')}
                    style={{
                      background: chatMode === 'diagnostics' ? 'rgba(0,229,255,0.15)' : 'transparent',
                      border: 'none', color: chatMode === 'diagnostics' ? 'var(--scan-cyan)' : 'var(--text-muted)',
                      padding: '3px 8px', borderRadius: 16, cursor: 'pointer', fontSize: '0.6rem', fontWeight: 700,
                    }}
                  >DX</button>
                  <button
                    onClick={() => setChatMode('codebase')}
                    style={{
                      background: chatMode === 'codebase' ? 'rgba(179,136,255,0.15)' : 'transparent',
                      border: 'none', color: chatMode === 'codebase' ? 'var(--purple)' : 'var(--text-muted)',
                      padding: '3px 8px', borderRadius: 16, cursor: 'pointer', fontSize: '0.6rem', fontWeight: 700,
                    }}
                  >RAG</button>
                </div>
                
                <button 
                  onClick={() => setIsChatMaximized(!isChatMaximized)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '4px' }}
                  title={isChatMaximized ? 'Minimize' : 'Maximize'}
                >
                  {isChatMaximized ? '❐' : '⬜'}
                </button>
                
                <button 
                  onClick={() => { setIsChatOpen(false); setIsChatMaximized(false); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '1px 4px' }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Optimized Header-Integrated Status Bar */}
            {chatMode === 'codebase' && (
              <div style={{ 
                padding: '4px 20px', 
                background: ragIndexed ? 'rgba(0,230,118,0.02)' : 'rgba(179,136,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.62rem',
                fontWeight: 600,
                color: ragIndexed ? 'var(--health-green)' : 'var(--purple)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{ragIndexed ? 'READY' : (ragIndexing ? 'SCANNING...' : 'STANDBY')}</span>
                  {ragProgress && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— {ragProgress}</span>}
                </div>
                {!ragIndexed && !ragIndexing && (
                  <button 
                    onClick={indexCodebase}
                    style={{ background: 'var(--purple)', border: 'none', color: '#fff', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.55rem', fontWeight: 800 }}
                  >INITIALIZE</button>
                )}
              </div>
            )}

            {/* Combined Source Ref & Mode Banner */}
            {ragSources.length > 0 && chatMode === 'codebase' && (
              <div style={{ padding: '6px 20px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--purple)', fontWeight: 800, whiteSpace: 'nowrap' }}>REF_MOUNTED</span>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="no-scrollbar">
                  {ragSources.slice(0, 5).map((src, i) => (
                    <span key={i} style={{ padding: '2px 6px', background: 'rgba(179,136,255,0.08)', borderRadius: 4, fontSize: '0.58rem', color: 'rgba(179,136,255,0.9)', border: '1px solid rgba(179,136,255,0.1)' }}>
                      {src.filePath.split('/').pop()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="chat-messages-premium" ref={chatRef}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                  <div style={{ marginBottom: 12 }}>
                    <img src="/surgeons_orb.png" alt="Clinical AI" style={{ width: 64, height: 64, animation: 'heartbeat 4s infinite ease-in-out', margin: '0 auto' }} />
                  </div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>
                    {chatMode === 'codebase' ? 'Codebase Intelligence Online' : 'Diagnostic Consultant Online'}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: '80%', margin: '0 auto' }}>
                    {chatMode === 'codebase'
                      ? 'Ask questions about your actual source code. "Where is the auth logic?" or "Explain the API routes."'
                      : 'Ask me anything about your repo health, bottleneck fixes, or security posture.'}
                  </p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={m.role === 'ai' ? 'chat-msg-ai-premium animate-fade-in' : 'chat-msg-user-premium animate-fade-in'} style={{ animationDelay: `${Math.min(i * 0.1, 0.5)}s` }}>
                  {m.role === 'ai' ? (
                   <ReactMarkdown 
                     remarkPlugins={[remarkGfm]}
                     components={{
                       h1: ({node, ...props}) => <h1 style={{color: 'var(--scan-cyan)', margin: '16px 0 10px', borderLeft: '4px solid var(--scan-cyan)', paddingLeft: 12, fontSize: '1.3rem', fontWeight: 950}}>🧬 {props.children}</h1>,
                       h2: ({node, ...props}) => <h2 style={{color: 'var(--scan-cyan)', borderBottom: '1px solid rgba(0,229,255,0.1)', paddingBottom: 6, margin: '14px 0 8px', fontSize: '1.1rem', fontWeight: 800}}>📊 {props.children}</h2>,
                       h3: ({node, ...props}) => <h3 style={{color: 'var(--text-primary)', margin: '12px 0 6px', fontSize: '1rem', fontWeight: 800}}>🩺 {props.children}</h3>,
                       table: ({node, ...props}) => (
                         <div style={{overflowX: 'auto', margin: '16px 0', border: '1px solid rgba(0,229,255,0.1)', borderRadius: 12, background: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)'}}>
                           <table style={{borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem'}} {...props} />
                         </div>
                       ),
                       tr: ({node, ...props}) => <tr style={{transition: 'background 0.2s', borderBottom: '1px solid rgba(255,255,255,0.03)'}} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} {...props} />,
                       th: ({node, ...props}) => <th style={{background: 'rgba(0,229,255,0.12)', padding: '12px 14px', textAlign: 'left', fontWeight: 950, fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--scan-cyan)', letterSpacing: '0.08em'}} {...props} />,
                       td: ({node, ...props}) => <td style={{padding: '12px 14px', color: 'var(--text-secondary)', lineHeight: 1.5}} {...props} />,
                       code: ({node, inline, ...props}: any) => inline 
                         ? <code style={{background: 'rgba(0,229,255,0.12)', color: 'var(--scan-cyan)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: '0.85em', fontWeight: 700}} {...props} />
                         : <code style={{display: 'block', background: 'rgba(0,0,0,0.6)', padding: 18, borderRadius: 10, border: '1px solid rgba(0,229,255,0.1)', color: 'var(--health-green)', margin: '14px 0', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', lineHeight: 1.6, overflowX: 'auto', position: 'relative'}} {...props} />,
                       li: ({node, ...props}) => <li style={{marginBottom: 8, paddingLeft: 6, listStyleType: "'→ '", color: 'var(--text-secondary)'}} {...props} />
                     }}
                   >
                     {m.content}
                   </ReactMarkdown>
                  ) : (
                    <div className="text-content">{m.content}</div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="chat-msg-ai-premium">
                   <div style={{ display: 'flex', gap: 4 }}>
                      <span className="surgery-cursor" style={{ margin: 0 }}></span>
                      <span className="surgery-cursor" style={{ margin: 0, animationDelay: '0.2s' }}></span>
                      <span className="surgery-cursor" style={{ margin: 0, animationDelay: '0.4s' }}></span>
                   </div>
                </div>
              )}
            </div>

            {chatMessages.length < 3 && !chatLoading && (
              <div className="suggestion-chips custom-scrollbar" style={{ 
                background: 'transparent', 
                padding: '0 20px 16px', 
                border: 'none', 
                display: 'flex', 
                gap: 10, 
                overflowX: 'auto', 
                whiteSpace: 'nowrap',
                scrollSnapType: 'x mandatory'
              }}>
                {chatMode === 'codebase' ? (
                  <>
                    <button className="suggestion-chip" style={{ scrollSnapAlign: 'start' }} onClick={() => sendChat('Where is the authentication logic?')}>🔍 Find Auth Logic</button>
                    <button className="suggestion-chip" style={{ scrollSnapAlign: 'start' }} onClick={() => sendChat('How are the API routes organized?')}>🧪 Explore API Structure</button>
                    <button className="suggestion-chip" style={{ scrollSnapAlign: 'start' }} onClick={() => sendChat('Explain the project structure')}>📂 Repo Overview</button>
                  </>
            ) : (
              <div>
                    <button className="suggestion-chip" style={{ scrollSnapAlign: 'start' }} onClick={() => sendChat('What is my #1 priority fix?')}>🚀 Top Priority Fix</button>
                    <button className="suggestion-chip" style={{ scrollSnapAlign: 'start' }} onClick={() => sendChat('Explain my score')}>📊 Why is my score {dxScore}?</button>
                    <button className="suggestion-chip" style={{ scrollSnapAlign: 'start' }} onClick={() => sendChat('Suggest a team allocation')}>👥 Personnel Insight</button>
                  </div>
                )}
              </div>
            )}

            {/* Clinical Quick Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 20px 12px', marginTop: -8 }}>
              {[
                { label: 'Propose Surgical Fix', icon: '⚡', color: 'var(--scan-cyan)' },
                { label: 'Rehab Plan', icon: '🩹', color: 'var(--health-green)' },
                { label: 'Sanitize Dead Tissue', icon: '🗑️', color: 'var(--critical-red)' },
                { label: 'DNA Lens Scan', icon: '🧬', color: 'var(--purple)' }
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendChat(action.label)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${action.color}30`,
                    color: action.color,
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.2s',
                    backdropFilter: 'blur(4px)'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${action.color}15`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  <span>{action.icon}</span> {action.label}
                </button>
              ))}
            </div>

            <div className="chat-input-area-premium">
              <div className="chat-input-container-premium">
                <input 
                  placeholder="Type a query..." 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                />
                <button 
                  onClick={() => sendChat()}
                  style={{ background: 'var(--scan-cyan)', color: '#000', border: 'none', padding: '0 16px', cursor: 'pointer', fontWeight: 700 }}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3D MASCOT CHAT TOGGLE */}
        <div 
          className={`floating-chat-btn ${isChatOpen ? 'active' : ''}`}
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{
            background: isChatOpen 
              ? 'rgba(10,14,20,0.95)' 
              : 'radial-gradient(circle at 30% 30%, rgba(0,229,255,0.15), rgba(10,14,20,0.92) 70%)',
            boxShadow: isChatOpen 
              ? '0 0 30px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,229,255,0.05)' 
              : '0 8px 40px rgba(0,229,255,0.35), 0 0 0 2px rgba(0,229,255,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
            color: isChatOpen ? 'var(--scan-cyan)' : '#000',
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: isChatOpen ? '1.5px solid rgba(0,229,255,0.3)' : '1.5px solid rgba(0,229,255,0.2)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Pulsing glow ring */}
          {!isChatOpen && (
            <div style={{
              position: 'absolute', inset: -4,
              borderRadius: '50%',
              border: '2px solid rgba(0,229,255,0.25)',
              animation: 'pulseRing 2.5s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          )}
          {isChatOpen ? (
            <span style={{ fontSize: '1.8rem', fontWeight: 300 }}>×</span>
          ) : (
            <img 
              src="/dxray_mascot.png" 
              alt="DX-Ray AI Surgeon" 
              style={{ 
                width: 58, height: 58, 
                objectFit: 'cover',
                borderRadius: '50%',
                animation: 'mascotFloat 4s ease-in-out infinite',
                filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.3))',
                transition: 'transform 0.3s',
              }} 
            />
          )}
        </div>
      </div>
      {showCostBreakdown && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div 
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} 
            onClick={() => setShowCostBreakdown(false)} 
          />
          <div className="card-glow animate-scale-up clinical-modal-shadow" style={{ 
            width: '100%', maxWidth: 720, maxHeight: '92vh',
            background: 'var(--bg-primary)', 
            color: 'var(--text-primary)',
            border: '1px solid var(--scan-cyan-dim)', borderRadius: 28, padding: 0, 
            position: 'relative', zIndex: 1, boxShadow: '0 40px 120px rgba(0,0,0,0.4)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {/* Clinical Header Bar */}
            <div style={{ 
              padding: '16px 24px', borderBottom: '1px solid var(--bg-surface)', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-secondary)', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: '4px 10px', background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.2)', borderRadius: 6 }}>
                  <span style={{ fontSize: '0.6rem', color: '#ff1744', fontWeight: 900, letterSpacing: '0.1em' }}>BIO_ASSESSMENT</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.6 }}>REG: {result?.repo?.repo?.toUpperCase() || 'UNREGISTERED'}</div>
              </div>
              <button 
                onClick={() => setShowCostBreakdown(false)}
                style={{ background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-primary)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>

            <div style={{ padding: '32px 40px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 32 }}>
                 <div style={{ 
                   fontSize: '3.2rem', filter: 'drop-shadow(0 0 10px rgba(255,23,68,0.3))',
                   animation: 'pulse 3s infinite'
                 }}>🩸</div>
                 <div>
                   <h2 style={{ fontSize: '1.9rem', fontWeight: 950, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>FRICTION HEMORRHAGE REPORT</h2>
                   <p style={{ color: 'var(--scan-cyan)', fontSize: '0.8rem', margin: '4px 0 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Biometric Engineering Audit</p>
                 </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                 {[
                   { label: 'CI Pipeline Bottlenecks', value: frictionCost.ciBottleneck.cost, icon: '⚡', color: 'var(--scan-cyan)', desc: frictionCost.ciBottleneck.description, pct: 45 },
                   { label: 'Review PR Latency', value: frictionCost.reviewDelay.cost, icon: '🕰️', color: 'var(--health-green)', desc: frictionCost.reviewDelay.description, pct: 30 },
                   { label: 'Stale PR Conflicts', value: frictionCost.stalePRs.cost, icon: '🧬', color: 'var(--warning-amber)', desc: frictionCost.stalePRs.description, pct: 15 },
                   { label: 'Vulnerability Risk', value: frictionCost.vulnerabilities.cost, icon: '☢️', color: 'var(--critical-red)', desc: `${frictionCost.vulnerabilities.riskExposure} unresolved critical items`, pct: 10 },
                 ].map((item, i) => (
                   <div key={i} style={{ 
                     display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', 
                     background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--glass-border)',
                   }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 10, 
                        background: `${item.color}10`, border: `1px solid ${item.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                      }}>{item.icon}</div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{item.label}</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: item.color }}>${item.value.toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                      </div>
                   </div>
                 ))}
              </div>

              {/* Summary Block */}
              <div style={{ 
                marginTop: 24, padding: 24, borderRadius: 20, 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--glass-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                 <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--scan-cyan)', textTransform: 'uppercase', fontWeight: 950, letterSpacing: '0.12em', marginBottom: 4 }}>Monthly Drain</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 950, color: '#ff1744', letterSpacing: '-0.02em' }}>${frictionCost.total.toLocaleString()}</div>
                 </div>

                 <div style={{ flex: 1, paddingLeft: 24, borderLeft: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Annual Impact</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>${(frictionCost.total * 12).toLocaleString()}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--health-green)', marginTop: 2, fontWeight: 700 }}>RECOVERY RATING: OPTIMAL</div>
                 </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                 <button 
                  className="btn-hero-primary" 
                  style={{ flex: 1, padding: '18px 24px', fontSize: '1rem', fontWeight: 900, background: 'linear-gradient(135deg, #ff1744, #d50000)', color: '#fff' }}
                  onClick={() => { setShowCostBreakdown(false); setActiveTab('surgery'); }}
                >
                   PERFORM EMERGENCY REPAIR →
                 </button>
                 <button 
                  className="btn-hero-secondary" 
                  style={{ padding: '0 20px', borderRadius: 12 }}
                  onClick={() => window.print()}
                >
                   🖨️
                 </button>
              </div>
            </div>
            
            {/* HUD Scan Line Decor */}
            <div style={{ 
              height: 4, 
              background: 'linear-gradient(90deg, transparent, var(--scan-cyan), transparent)',
              animation: 'scan-move 3s linear infinite', flexShrink: 0
            }} />
          </div>
        </div>
      )}
      {showTour && (
        <ClinicalTour 
          step={tourStep} 
          onNext={() => setTourStep(s => s + 1)}
          onClose={() => setShowTour(false)}
          onSwitchTab={(tab: string) => setActiveTab(tab as any)}
        />
      )}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MODAL: GLOBAL SEARCH (CMD+K) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {showGlobalSearch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowGlobalSearch(false)}>
          <div 
            style={{ width: '100%', maxWidth: 600, background: 'var(--bg-frost)', border: '1px solid var(--scan-cyan)', borderRadius: 16, padding: 0, overflow: 'hidden', boxShadow: '0 0 50px rgba(0,229,255,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.2rem' }}>ðŸ”</span>
              <input 
                autoFocus 
                placeholder="Seach Patient Registry (Repos, Teams, Diagnoses)..."
                onKeyDown={e => e.key === 'Escape' && setShowGlobalSearch(false)}
                style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.2rem', outline: 'none', fontFamily: 'var(--font-mono)' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4 }}>ESC</span>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '8px 12px', fontWeight: 800 }}>Recent Patients</div>
              {scanHistory.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent diagnoses found.</div>
              ) : (
                scanHistory.map((h, i) => (
                  <div key={i} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '1.2rem' }}>ðŸ“</span>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{h.repo}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Diagnosed: {new Date(h.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className={`badge ${h.score >= 80 ? 'badge-success' : 'badge-medium'}`}>GRADE {h.grade}</div>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Found {scanHistory.length} records in Clinical Registry</div>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                <span>↕️ Navigate</span>
                <span>↩️ Select</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>{/* end scan-monitor-overlay */}
        {/* ———————————— Cinematic Autopsy Replay ———————————— */}
        {showAutopsy && autopsyData && (
          <AutopsyReplay 
            runId={autopsyData.runId}
            repoName={result.repo.fullName}
            errorFile={autopsyData.file}
            errorLine={autopsyData.line}
            logSnippet={autopsyData.logs}
            author={autopsyData.author}
            onClose={() => setShowAutopsy(false)}
          />
        )}
      </main>

  );
}

