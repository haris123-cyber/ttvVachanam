/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";

interface WaveformVisualizerProps {
  isPlaying: boolean;
  isPaused?: boolean;
}

export default function WaveformVisualizer({ isPlaying, isPaused = false }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 400, height: 100 });
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // ResizeObserver for responsive canvas sizing
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      // Safeguard sizes
      setSize({
        width: Math.max(width, 100),
        height: Math.max(height, 60),
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, size.width, size.height);

      const barCount = Math.floor(size.width / 5);
      const gap = 2;
      const barWidth = (size.width - (barCount - 1) * gap) / barCount;

      // Update oscillation phase
      if (isPlaying && !isPaused) {
        phaseRef.current += 0.08;
      }

      // Drawing gorgeous multi-layered waves
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        let amplitude = 0.15; // default idle pulse

        if (isPlaying && !isPaused) {
          // Complex sum of sines to look organic and professional
          const norm = i / barCount;
          const wave1 = Math.sin(norm * Math.PI * 4 + phaseRef.current) * 0.4;
          const wave2 = Math.cos(norm * Math.PI * 8 - phaseRef.current * 1.5) * 0.2;
          const wave3 = Math.sin(norm * Math.PI * 12 + phaseRef.current * 0.5) * 0.15;
          // Center focal curve
          const envelope = Math.sin(norm * Math.PI); // tapering off at margins

          amplitude = Math.abs(wave1 + wave2 + wave3) * envelope * 0.9 + 0.1;
        } else if (isPaused) {
          // Frozen ripple
          const norm = i / barCount;
          amplitude = Math.abs(Math.sin(norm * Math.PI * 4)) * 0.1 + 0.05;
        }

        const barHeight = amplitude * size.height * 0.85;
        const y = (size.height - barHeight) / 2;

        // Rich Sky Blue combined with Professional Indigo
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, "#38bdf8"); // Sky Blue
        gradient.addColorStop(0.5, "#6366f1"); // Deep Indigo
        gradient.addColorStop(1, "#818cf8"); // Soft Violet/Indigo

        ctx.fillStyle = gradient;

        // Rounded rectangles for a premium feel
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, 3);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isPaused, size]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-24 glass-card overflow-hidden flex items-center justify-center p-2"
      id="waveform-container"
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="w-full h-full block opacity-95 transition-opacity duration-300"
        id="waveform-canvas"
      />
      
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-sky-400/50 tracking-wider uppercase select-none">
          Audio Visual Engine Standby
        </div>
      )}
    </div>
  );
}
