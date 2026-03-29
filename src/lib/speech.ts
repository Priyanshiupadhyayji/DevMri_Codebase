'use client';

import { useCallback, useRef, useEffect } from 'react';

class SurgeonVoice {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;

  private async init() {
    if (this.isInitialized) return;
    
    if (typeof window === 'undefined') return;
    
    this.synth = window.speechSynthesis;
    
    const loadVoices = () => {
      this.voices = this.synth?.getVoices() || [];
    };
    
    loadVoices();
    
    if (this.synth?.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
    
    this.isInitialized = true;
  }

  private getBestVoice(): SpeechSynthesisVoice | null {
    const preferredNames = [
      'Google UK English Female',
      'English (United Kingdom) Female',
      'Microsoft Zira',
      'Samantha',
      'Google US English Female',
      'Female'
    ];
    
    for (const name of preferredNames) {
      const voice = this.voices.find(v => 
        v.name.includes(name)
      );
      if (voice) return voice;
    }
    
    return this.voices.find(v => v.name.toLowerCase().includes('female')) || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0] || null;
  }

  async speak(text: string, priority: 'high' | 'normal' = 'normal') {
    await this.init();
    
    if (!this.synth) return;
    
    this.synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getBestVoice();
    
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = priority === 'high' ? 0.94 : 0.86; // Slower, more elegant and polite
    utterance.pitch = 1.3; // Higher pitch for a softer, feminine clarity
    utterance.volume = 0.95;
    
    return new Promise<void>((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      this.synth?.speak(utterance);
    });
  }

  private getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  async speakGreeting(repoName: string) {
    const timeGreeting = this.getTimeGreeting();
    const welcome = `${timeGreeting}, Doctor. I am your DevMRI clinical consultant. I have initiated the deep-scan protocol for ${repoName}. Please allow me a moment to prepare the diagnostic report for you.`;
    return this.speak(welcome, 'normal');
  }

  speakDiagnosis(dxScore: number, grade: string, severity: string, repoName: string): Promise<void> {
    const intro = `${this.getTimeGreeting()}, I've completed the repository diagnostic for ${repoName}. `;
    const gradeMessages: Record<string, string> = {
      'A': `The results are truly excellent. This repository demonstrates elite clinical health and architectural efficiency.`,
      'B': `The repository is in good standing. I've identified only minor optimizations for your consideration.`,
      'C': `The condition is moderate. There are several opportunities to improve the developer experience and reduce friction.`,
      'D': `I've detected some concerning patterns. A few areas would benefit from prioritized attention to maintain stability.`,
      'F': `The diagnosis indicates critical technical friction. I would strongly recommend immediate intervention to stabilize the codebase.`
    };

    const severityPhrases: Record<string, string> = {
      'CRITICAL': `I have flagged some critical anomalies that require your urgent attention, Doctor.`,
      'HIGH': `There are high-risk patterns that we should likely address in the next sprint.`,
      'MEDIUM': `I've noted some moderate irregularities, though the vital signs remain stable.`,
      'LOW': `The repository is performing beautifully, with only minor routine maintenance suggested.`
    };
    const scoreText = `The total health score is ${dxScore} out of 100, which results in a grade ${grade}. `;
    const gradeText = gradeMessages[grade] || '';
    const severityText = severityPhrases[severity] || '';
    
    const speak = async () => {
      await this.speak(intro + scoreText + gradeText + severityText, 'high');
    };
    
    return speak();
  }

  speakSurgeryProgress(phase: string): Promise<void> {
    const phrases: Record<string, string> = {
      'init': `Preparing the surgery theatre. I'll be guiding you through the clinical intervention protocol, Doctor.`,
      'analyzing': `Analyzing the codebase pathology. Identifying the most effective surgical targets to reduce tech debt.`,
      'generating': `Generating the remedial code now. Please wait while I synthesize the fix for you.`,
      'complete': `The surgical intervention is successfully complete. The codebase vital signs have stabilized beautifully.`,
      'error': `I've encountered a minor complication. Please allow me to re-evaluate the approach.`
    };

    return this.speak(phrases[phase] || `Initiating protocol ${phase}...`);
  }

  cancel() {
    this.synth?.cancel();
  }
}

const surgeonVoice = new SurgeonVoice();

export function useSurgeonVoice() {
  const isSpeakingRef = useRef(false);

  const speakDiagnosis = useCallback(async (dxScore: number, grade: string, severity: string, repoName: string) => {
    isSpeakingRef.current = true;
    await surgeonVoice.speakDiagnosis(dxScore, grade, severity, repoName);
    isSpeakingRef.current = false;
  }, []);

  const speakSurgeryProgress = useCallback(async (phase: string) => {
    isSpeakingRef.current = true;
    await surgeonVoice.speakSurgeryProgress(phase);
    isSpeakingRef.current = false;
  }, []);

  const speakText = useCallback(async (text: string, priority: 'high' | 'normal' = 'normal') => {
    isSpeakingRef.current = true;
    await surgeonVoice.speak(text, priority);
    isSpeakingRef.current = false;
  }, []);

  const cancel = useCallback(() => {
    surgeonVoice.cancel();
    isSpeakingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      surgeonVoice.cancel();
    };
  }, []);

  const speakGreeting = useCallback(async (repoName: string) => {
    isSpeakingRef.current = true;
    await surgeonVoice.speakGreeting(repoName);
    isSpeakingRef.current = false;
  }, []);

  return {
    speakDiagnosis,
    speakSurgeryProgress,
    speakGreeting,
    speakText,
    cancel,
    isSpeaking: isSpeakingRef.current
  };
}
