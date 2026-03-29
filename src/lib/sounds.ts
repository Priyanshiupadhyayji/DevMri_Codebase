'use client';

import { useCallback, useRef, useEffect } from 'react';

class SoundEngine {
  private audioContext: AudioContext | null = null;
  private mriHumGain: GainNode | null = null;
  private heartbeatGain: GainNode | null = null;
  private mriHumOscillators: OscillatorNode[] = [];
  private isInitialized = false;

  private async init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.mriHumGain = this.audioContext.createGain();
      this.heartbeatGain = this.audioContext.createGain();
      
      this.mriHumGain.gain.value = 0;
      this.heartbeatGain.gain.value = 0;
      
      this.mriHumGain.connect(this.audioContext.destination);
      this.heartbeatGain.connect(this.audioContext.destination);
      
      this.isInitialized = true;
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  async startMRIHum() {
    await this.init();
    if (!this.audioContext || !this.mriHumGain) return;

    const frequencies = [60, 120, 180, 240];
    frequencies.forEach(freq => {
      const osc = this.audioContext!.createOscillator();
      const oscGain = this.audioContext!.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      oscGain.gain.value = 0.03;
      
      osc.connect(oscGain);
      oscGain.connect(this.mriHumGain!);
      osc.start();
      
      this.mriHumOscillators.push(osc);
    });

    this.mriHumGain.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.5);
  }

  stopMRIHum() {
    if (!this.audioContext || !this.mriHumGain || this.mriHumOscillators.length === 0) return;
    
    this.mriHumGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
    
    setTimeout(() => {
      this.mriHumOscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      this.mriHumOscillators = [];
    }, 300);
  }

  playHeartbeat() {
    if (!this.audioContext || !this.heartbeatGain) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const playBeat = (time: number, freq: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + duration);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      osc.connect(gain);
      gain.connect(this.heartbeatGain!);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    playBeat(now, 80, 0.15, 0.4);
    playBeat(now + 0.12, 60, 0.2, 0.3);
  }

  playScoreChime() {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = now + i * 0.1;
      const duration = 0.5;
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  playSurgeryChime() {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.2);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private ambientGain: GainNode | null = null;
  private ambientOscillators: OscillatorNode[] = [];
  private ambientInitialized = false;

  async startHospitalAmbience() {
    if (this.ambientInitialized) return;
    
    // Reuse the shared AudioContext — never create a second one
    await this.init();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    
    if (!this.ambientGain) {
      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.value = 0;
      this.ambientGain.connect(ctx.destination);
    }

    const gain = this.ambientGain;
    gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 2);

    const frequencies = [55, 82.5, 110, 165];
    frequencies.forEach(freq => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      oscGain.gain.value = 0.02;
      
      osc.connect(oscGain);
      oscGain.connect(gain);
      osc.start();
      
      this.ambientOscillators.push(osc);
    });

    this.ambientInitialized = true;
  }

  stopHospitalAmbience() {
    if (!this.ambientGain || !this.audioContext) return;
    
    this.ambientGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
    
    setTimeout(() => {
      this.ambientOscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      this.ambientOscillators = [];
      this.ambientInitialized = false;
    }, 1000);
  }

  playDistantChime() {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const notes = [329.63, 392, 493.88];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = now + i * 0.8;
      const duration = 1.5;
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.02, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
}

const soundEngine = new SoundEngine();

export function useSounds() {
  const mriHumRef = useRef<boolean>(false);

  const startMRIHum = useCallback(() => {
    if (!mriHumRef.current) {
      soundEngine.startMRIHum();
      mriHumRef.current = true;
    }
  }, []);

  const stopMRIHum = useCallback(() => {
    soundEngine.stopMRIHum();
    mriHumRef.current = false;
  }, []);

  const playHeartbeat = useCallback(() => {
    soundEngine.playHeartbeat();
  }, []);

  const playScoreChime = useCallback(() => {
    soundEngine.playScoreChime();
  }, []);

  const playSurgeryChime = useCallback(() => {
    soundEngine.playSurgeryChime();
  }, []);

  useEffect(() => {
    return () => {
      soundEngine.stopMRIHum();
      soundEngine.stopHospitalAmbience();
    };
  }, []);

  const startHospitalAmbience = useCallback(() => {
    soundEngine.startHospitalAmbience();
  }, []);

  const stopHospitalAmbience = useCallback(() => {
    soundEngine.stopHospitalAmbience();
  }, []);

  const playDistantChime = useCallback(() => {
    soundEngine.playDistantChime();
  }, []);

  return {
    startMRIHum,
    stopMRIHum,
    playHeartbeat,
    playScoreChime,
    playSurgeryChime,
    startHospitalAmbience,
    stopHospitalAmbience,
    playDistantChime,
  };
}
