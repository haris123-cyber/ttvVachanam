/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TtsEngine, VoiceProfile, MoodProfile } from "../types";
import { GEMINI_VOICES, BROWSER_VOICES, AUDIO_MOODS } from "../presetData";
import { Cpu, Palette, Volume2, Sparkles, MessageSquareDot } from "lucide-react";

interface TtsControlsPanelProps {
  engine: TtsEngine;
  onEngineChange: (engine: TtsEngine) => void;
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  selectedMoodId: string;
  onMoodChange: (moodId: string) => void;
  speed: number; // For speech rates
  onSpeedChange: (speed: number) => void;
  pitch: number; // Browser only
  onPitchChange: (pitch: number) => void;
  browserVoices: SpeechSynthesisVoice[];
  selectedBrowserVoiceName: string;
  onBrowserVoiceChange: (voiceName: string) => void;
}

export default function TtsControlsPanel({
  engine,
  onEngineChange,
  selectedVoiceId,
  onVoiceChange,
  selectedMoodId,
  onMoodChange,
  speed,
  onSpeedChange,
  pitch,
  onPitchChange,
  browserVoices,
  selectedBrowserVoiceName,
  onBrowserVoiceChange
}: TtsControlsPanelProps) {

  const handleEngineSelect = (selectedEngine: TtsEngine) => {
    onEngineChange(selectedEngine);
    // Reset to sensible defaults if changing engine
    if (selectedEngine === "gemini") {
      onVoiceChange(GEMINI_VOICES[0].id);
    } else {
      onVoiceChange("browser_default");
    }
  };

  const selectedVoice = GEMINI_VOICES.find(v => v.id === selectedVoiceId) || GEMINI_VOICES[0];
  const selectedMood = AUDIO_MOODS.find(m => m.id === selectedMoodId) || AUDIO_MOODS[0];

  // Standard speed options
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // Filter browser voices to Malayalam or Indian accents if possible, fallback to all
  const filteredBrowserVoices = browserVoices.filter(v => 
    v.lang.toLowerCase().includes("ml") || 
    v.lang.toLowerCase().includes("in") || 
    v.name.toLowerCase().includes("malayalam")
  );

  const displayBrowserVoices = filteredBrowserVoices.length > 0 ? filteredBrowserVoices : browserVoices;

  return (
    <div className="glass p-6 rounded-3xl flex flex-col gap-5 shadow-xl shadow-slate-950/40" id="tts-controls-panel">
      
      {/* 1. Header & Engine Toggle */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold tracking-wider text-sky-300 uppercase flex items-center gap-1.5" id="engine-header-title">
          <Cpu size={14} className="text-sky-400" />
          Voice Synthesis Engine
        </h3>
        
        <div className="grid grid-cols-2 gap-2.5 p-1 bg-black/35 border border-white/5 rounded-2xl" id="engine-toggle-group">
          <button
            onClick={() => handleEngineSelect("gemini")}
            className={`py-3 px-3 rounded-xl text-xs leading-tight font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              engine === "gemini"
                ? "bg-white/15 border border-sky-500/30 text-sky-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            }`}
            id="engine-select-gemini"
          >
            <span className="flex items-center gap-1">
              <Sparkles size={11} className="text-sky-400 animate-pulse" />
              Gemini Neural AI
            </span>
            <span className="text-[9px] opacity-60 font-medium">Ultra-Realistic Vocals</span>
          </button>

          <button
            onClick={() => handleEngineSelect("browser")}
            className={`py-3 px-3 rounded-xl text-xs leading-tight font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              engine === "browser"
                ? "bg-white/15 border border-sky-500/30 text-sky-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            }`}
            id="engine-select-browser"
          >
            <span className="flex items-center gap-1">
              <Cpu size={11} className="text-indigo-400" />
              Local Browser Offline
            </span>
            <span className="text-[9px] opacity-60 font-medium">Instant & Unlimited</span>
          </button>
        </div>
      </div>

      <hr className="border-white/5 p-0 m-0" />

      {/* 2. Voice Profiles Selecting */}
      {engine === "gemini" ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold tracking-wider text-sky-300 uppercase flex items-center gap-1.5" id="voices-model-title">
              <MessageSquareDot size={14} className="text-sky-400" />
              Malayalam Voice Models
            </h3>
            <span className="text-[9px] uppercase tracking-wider font-bold bg-sky-950/40 border border-sky-500/20 text-sky-400 px-2 py-0.5 rounded-lg">
              {GEMINI_VOICES.length} available
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1" id="voices-grid-list">
            {GEMINI_VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => onVoiceChange(v.id)}
                className={`py-2 px-3 rounded-xl border text-left flex items-start gap-2.5 transition-all group cursor-pointer ${
                  selectedVoiceId === v.id
                    ? "bg-white/10 border-sky-500/40 text-sky-150 ring-1 ring-sky-500/10"
                    : "bg-black/15 border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
                  selectedVoiceId === v.id ? "bg-sky-450 shadow-[0_0_10px_rgba(56,189,248,0.7)]" : "bg-slate-700"
                }`} />
                <div className="flex-1 min-w-0 font-sans">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold leading-none">{v.name}</strong>
                    <span className="text-[8px] font-mono uppercase tracking-wider bg-black/40 border border-white/5 px-1.5 py-0.5 rounded text-sky-400">
                      {v.gender}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight text-slate-400 mt-1 line-clamp-2 font-sans font-light">
                    {v.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* 3. Emotional Tone / Settings for Gemini */}
          <div className="flex flex-col gap-2.5 mt-2">
            <h3 className="text-xs font-bold tracking-wider text-sky-300 uppercase flex items-center gap-1.5">
              <Palette size={13} className="text-sky-400" />
              Emotional Tone / Style Moods
            </h3>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-1.5" id="moods-grid-list">
              {AUDIO_MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onMoodChange(m.id)}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex flex-col gap-0.5 text-center items-center justify-center transition-all cursor-pointer ${
                    selectedMoodId === m.id
                      ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                      : "bg-white/5 border-white/5 hover:border-white/10 text-slate-400"
                  }`}
                >
                  <span>{m.name}</span>
                  <span className="text-[8px] opacity-60 font-medium font-sans truncate max-w-full">
                    {m.id}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Tone Helper Details */}
            <div className="text-[11px] bg-sky-950/10 border border-sky-900/15 rounded-2xl p-3 font-sans text-slate-350 mt-1 leading-snug">
              <span className="font-bold text-sky-400 text-xs mr-1 block sm:inline">Mood effect:</span> {selectedMood.description}
            </div>
          </div>
        </div>
      ) : (
        /* Browser Engine Config */
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 font-sans">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold tracking-wider text-indigo-300 uppercase flex items-center gap-1.5" id="browser-voices-select-title">
                <Volume2 size={14} className="text-indigo-450" />
                Browser Vocal Driver
              </h3>
            </div>

            {displayBrowserVoices.length > 0 ? (
              <select
                value={selectedBrowserVoiceName}
                onChange={(e) => onBrowserVoiceChange(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-sky-500 font-sans cursor-pointer"
                id="browser-driver-dropdown"
              >
                {displayBrowserVoices.map((v, i) => (
                  <option key={v.name + i} value={v.name} className="bg-slate-900 text-slate-100">
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            ) : (
              <div className="py-3 px-4 bg-black/20 border border-white/5 text-[11px] text-slate-500 rounded-xl leading-relaxed">
                No custom browser speech models discovered. Standard fallback voice synthesiser will act on activation.
              </div>
            )}
          </div>

          {/* 4. Speed & Pitch Sliders (Browser Offline Engine Only) */}
          <div className="flex flex-col gap-5 mt-2" id="speech-sliders">
            {/* Speed Rate Slider */}
            <div className="flex flex-col gap-2 font-sans">
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-slate-400">Speech Rate (Speed)</span>
                <span className="text-sky-400 font-bold">{speed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-full accent-sky-400 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                id="speech-slider-rate"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0.5x (Slow)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Fast)</span>
              </div>
            </div>

            {/* Pitch Control */}
            <div className="flex flex-col gap-2 font-sans">
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-slate-400">Vocal Pitch</span>
                <span className="text-indigo-400 font-bold">{pitch}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                id="speech-slider-pitch"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Low Pitch</span>
                <span>Normal</span>
                <span>High Pitch</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speed Rate preset indicators for Gemini */}
      {engine === "gemini" && (
        <div className="flex flex-col gap-2.5 font-sans">
          <div className="flex justify-between text-xs font-mono font-semibold">
            <span className="text-slate-400">Speaking Rate</span>
            <span className="text-sky-400 font-bold">{speed}x</span>
          </div>
          <div className="grid grid-cols-6 gap-1" id="gemini-speed-presets">
            {speedOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => onSpeedChange(opt)}
                className={`py-1 rounded-lg text-[10px] font-mono border cursor-pointer transition-all ${
                  speed === opt
                    ? "bg-sky-500/20 border-sky-500/35 text-sky-300 font-bold"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                }`}
              >
                {opt}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer Branding Indicator */}
      <div className="text-[10px] text-zinc-500 text-center font-mono mt-2" id="vocal-specs-meta">
        Malayalam Vocal Driver: {engine === "gemini" ? "Gemini TTS (24kHz Raw PCM)" : "Web Speech Synthesis API"}
      </div>

    </div>
  );
}
