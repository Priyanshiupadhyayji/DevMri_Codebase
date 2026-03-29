'use client';

import { useEffect, useRef, useState } from 'react';

interface EKGMonitorProps {
  bpm: number;
  isActive: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export function EKGMonitor({ bpm, isActive, severity }: EKGMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 180 });
  
  const getSeverityColor = () => {
    switch (severity) {
      case 'CRITICAL': return '#ff1744';
      case 'HIGH': return '#ff6d00';
      case 'MEDIUM': return '#ffab00';
      default: return '#00e676';
    }
  };

  const color = getSeverityColor();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    let animationFrame: number;
    let offset = 0;
    
    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
      ctx.lineWidth = 1;
      
      for (let x = 0; x <= dimensions.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, dimensions.height); ctx.stroke();
      }
      
      for (let y = 0; y <= dimensions.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(dimensions.width, y); ctx.stroke();
      }
    };

    const drawEKGLine = () => {
      const speed = isActive ? (bpm / 60) * 1.5 : 0.8;
      offset = (offset + speed) % dimensions.width;
      
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      drawGrid();
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.shadowColor = color;
      ctx.shadowBlur = isActive ? 12 : 3;
      
      ctx.beginPath();
      
      for (let x = 0; x < dimensions.width; x++) {
        const xPos = (x - offset + dimensions.width) % dimensions.width;
        let yPos = dimensions.height / 2;
        
        if (isActive) {
          const normalizedX = xPos / dimensions.width;
          const cycle = (normalizedX * 10) % 1;
          
          if (cycle < 0.1) {
            yPos = dimensions.height / 2;
          } else if (cycle < 0.15) {
            yPos = dimensions.height / 2 - Math.sin((cycle - 0.1) * 20 * Math.PI) * 15; // P wave
          } else if (cycle < 0.22) {
            yPos = dimensions.height / 2;
          } else if (cycle < 0.25) {
            yPos = dimensions.height / 2 + 10; // Q wave
          } else if (cycle < 0.28) {
            yPos = dimensions.height / 2 - 50; // R wave (spike)
          } else if (cycle < 0.31) {
            yPos = dimensions.height / 2 + 25; // S wave
          } else if (cycle < 0.45) {
            yPos = dimensions.height / 2 - Math.sin((cycle - 0.31) * 7.14 * Math.PI) * 12; // T wave
          } else {
            yPos = dimensions.height / 2;
          }
        } else {
          yPos = dimensions.height / 2 + Math.sin(x * 0.03 + Date.now() * 0.005) * 4;
        }
        
        if (x === 0) ctx.moveTo(xPos, yPos);
        else ctx.lineTo(xPos, yPos);
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      animationFrame = requestAnimationFrame(drawEKGLine);
    };

    drawEKGLine();
    
    return () => cancelAnimationFrame(animationFrame);
  }, [bpm, isActive, color, dimensions]);

  const randSPO2 = 94 + Math.floor(Math.random() * 5);
  const randResp = 12 + Math.floor(Math.random() * 8);

  return (
    <div id="ekg-monitor-main" className="ekg-container" style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 12, left: 20, zIndex: 2, display: 'flex', gap: 40 }}>
        <div>
          <div className="ekg-stat-label" style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>Heart Rate</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: color, fontFamily: 'var(--font-mono)' }}>{isActive ? bpm : '---'} <span style={{ fontSize: '0.7rem' }}>BPM</span></div>
        </div>
        <div>
          <div className="ekg-stat-label" style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>SpO2</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>{isActive ? randSPO2 : '---'}%</div>
        </div>
        <div>
          <div className="ekg-stat-label" style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>Resp</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b388ff', fontFamily: 'var(--font-mono)' }}>{isActive ? randResp : '---'} <span style={{ fontSize: '0.7rem' }}>RPM</span></div>
        </div>
      </div>
      
      <div style={{ position: 'absolute', bottom: 12, right: 20, zIndex: 2, textAlign: 'right' }}>
        <div style={{ fontSize: '0.6rem', color: '#556677', fontWeight: 800, textTransform: 'uppercase' }}>NIBP SYSTOLIC/DIASTOLIC</div>
        <div className="ekg-nibp-value" style={{ fontSize: '1.2rem', fontWeight: 700, opacity: 0.9, fontFamily: 'var(--font-mono)' }}>122/84 <span style={{ fontSize: '0.6rem' }}>mmHg</span></div>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: dimensions.height,
          display: 'block',
          opacity: 0.8
        }}
      />
    </div>
  );
}

export function EKGMonitorMini({ bpm, isActive, severity }: EKGMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const getSeverityColor = () => {
    switch (severity) {
      case 'CRITICAL': return '#ff1744';
      case 'HIGH': return '#ff6d00';
      case 'MEDIUM': return '#ffab00';
      default: return '#00e676';
    }
  };

  const color = getSeverityColor();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 160;
    const height = 50;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let animationFrame: number;
    let offset = 0;
    
    const draw = () => {
      const speed = isActive ? (bpm / 60) * 1.2 : 0.6;
      offset = (offset + speed) % width;
      
      ctx.clearRect(0, 0, width, height);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = isActive ? 6 : 1;
      
      ctx.beginPath();
      
      for (let x = 0; x < width; x++) {
        const xPos = (x - offset + width) % width;
        const normalizedX = xPos / width;
        let yPos = height / 2;
        
        if (isActive) {
          const t = normalizedX * 2;
          const cycle = t % 1;
          if (cycle < 0.2) yPos = height / 2;
          else if (cycle < 0.25) yPos = height / 2 - 15;
          else if (cycle < 0.28) yPos = height / 2 + 10;
          else yPos = height / 2;
        } else {
          yPos = height / 2 + Math.sin(x * 0.05 + Date.now()*0.005) * 2;
        }
        
        if (x === 0) ctx.moveTo(xPos, yPos);
        else ctx.lineTo(xPos, yPos);
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    
    return () => cancelAnimationFrame(animationFrame);
  }, [bpm, isActive, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: 160,
        height: 50,
        display: 'block',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: 6
      }}
    />
  );
}
