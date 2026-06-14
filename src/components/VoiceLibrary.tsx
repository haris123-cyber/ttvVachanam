/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { LibraryItem } from "../types";
import { 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  ChevronRight, 
  Clock, 
  Sparkles, 
  Cpu, 
  ExternalLink 
} from "lucide-react";

interface VoiceLibraryProps {
  items: LibraryItem[];
  onDelete: (id: string) => void;
  onSelect: (item: LibraryItem) => void;
  onPlayItem: (item: LibraryItem) => void;
  playingItemId: string | null;
  isAudioPlaying: boolean;
}

// Prepend RIFF/WAVE header to Little-Endian 16-bit PCM data to create a valid WAV file
export function getWavBlobFromPCM(base64Pcm: string, sampleRate = 24000): Blob {
  const binaryString = atob(base64Pcm);
  const pcmLen = binaryString.length;
  
  const buffer = new ArrayBuffer(44 + pcmLen);
  const view = new DataView(buffer);
  
  // 1-4: "RIFF"
  view.setUint8(0, 0x52); // R
  view.setUint8(1, 0x49); // I
  view.setUint8(2, 0x46); // F
  view.setUint8(3, 0x46); // F
  
  // 5-8: Size of entire file - 8 bytes
  view.setUint32(4, 36 + pcmLen, true);
  
  // 9-12: "WAVE"
  view.setUint8(8, 0x57);  // W
  view.setUint8(9, 0x41);  // A
  view.setUint8(10, 0x56); // V
  view.setUint8(11, 0x45); // E
  
  // 13-16: "fmt "
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6d); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // space
  
  // 17-20: Format length: 16
  view.setUint32(16, 16, true);
  
  // 21-22: Audio Format: 1 (PCM)
  view.setUint16(20, 1, true);
  
  // 23-24: Channels: 1 (Mono)
  view.setUint16(22, 1, true);
  
  // 25-28: Sample rate (24000)
  view.setUint32(24, sampleRate, true);
  
  // 29-32: Byte rate (sampleRate * 1 channel * 2 bytes = sampleRate * 2)
  view.setUint32(28, sampleRate * 2, true);
  
  // 33-34: Block align (1 channel * 2 bytes = 2)
  view.setUint16(32, 2, true);
  
  // 35-36: Bits per sample (16)
  view.setUint16(34, 16, true);
  
  // 37-40: "data"
  view.setUint8(36, 0x64); // d
  view.setUint8(37, 0x61); // a
  view.setUint8(38, 0x74); // t
  view.setUint8(39, 0x61); // a
  
  // 41-44: Data chunk size
  view.setUint32(40, pcmLen, true);
  
  // Copy PCM data starting at index 44
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < pcmLen; i++) {
    bytes[44 + i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: "audio/wav" });
}

export default function VoiceLibrary({
  items,
  onDelete,
  onSelect,
  onPlayItem,
  playingItemId,
  isAudioPlaying
}: VoiceLibraryProps) {
  const [filter, setFilter] = useState<"all" | "gemini" | "browser">("all");

  const filteredItems = items.filter(item => {
    if (filter === "all") return true;
    return item.engine === filter;
  });

  const handleDownload = (item: LibraryItem) => {
    if (item.base64Audio) {
      // For Gemini audio, generate lossless WAV
      const blob = getWavBlobFromPCM(item.base64Audio, item.sampleRate || 24000);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `malayalam_synthesis_${item.voiceId}_${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (item.audioUrl) {
      // General direct download fallback
      const a = document.createElement("a");
      a.href = item.audioUrl;
      a.download = `synthesis_${Date.now()}.wav`;
      a.click();
    } else {
      alert("Browser synthesis recordings are processed locally on-the-fly and do not generate stationary downloadable servers. Try using Gemini Neural AI option to export WAV recordings!");
    }
  };

  return (
    <div className="glass p-6 rounded-3xl flex flex-col h-full shadow-xl shadow-slate-950/40" id="voice-library">
      
      {/* 1. List Header & Engines Filtering */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4" id="library-header">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold tracking-wider text-sky-300 uppercase flex items-center gap-1.5" id="library-title">
            <Clock size={14} className="text-sky-450" />
            Synthesized Audio Library
          </h2>
          <span className="text-[9px] uppercase tracking-wider font-bold bg-sky-950/40 border border-sky-500/20 text-sky-400 px-2 py-0.5 rounded-lg">
            {items.length} total
          </span>
        </div>

        {/* Engine Filters */}
        <div className="flex gap-1.5 self-start sm:self-auto" id="library-filters">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs rounded-lg transition-all border cursor-pointer ${
              filter === "all" 
                ? "bg-sky-500 text-slate-950 border-transparent font-bold" 
                : "bg-white/5 text-slate-450 border-white/5 hover:text-slate-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("gemini")}
            className={`px-2.5 py-1 text-xs rounded-lg transition-all border flex items-center gap-1 cursor-pointer ${
              filter === "gemini" 
                ? "bg-sky-500/10 text-sky-300 border-sky-500/35 font-bold" 
                : "bg-white/5 text-slate-450 border-white/5 hover:text-slate-200"
            }`}
          >
            <Sparkles size={10} className="text-sky-400" />
            Neural
          </button>
          <button
            onClick={() => setFilter("browser")}
            className={`px-2.5 py-1 text-xs rounded-lg transition-all border flex items-center gap-1 cursor-pointer ${
              filter === "browser" 
                ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/35 font-bold" 
                : "bg-white/5 text-slate-450 border-white/5 hover:text-slate-200"
            }`}
          >
            <Cpu size={10} className="text-indigo-400" />
            Local
          </button>
        </div>
      </div>

      {/* 2. Items Listings Scroll View */}
      <div className="flex-1 overflow-y-auto max-h-[460px] custom-scrollbar pr-1 py-4 flex flex-col gap-3" id="library-scroll-list">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isCurrent = playingItemId === item.id;
            const isPlaying = isCurrent && isAudioPlaying;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 group ${
                  isCurrent
                    ? "bg-white/10 border-sky-500/35 shadow-md"
                    : "bg-black/15 border-white/5 hover:border-white/10"
                }`}
              >
                {/* Play Round Trigger */}
                <button
                  onClick={() => onPlayItem(item)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-sky-500 hover:bg-sky-400 text-slate-950"
                      : "bg-white/5 hover:bg-sky-500/10 text-slate-400 hover:text-sky-300 border border-white/5"
                  }`}
                  id={`play-library-item-${item.id}`}
                >
                  {isPlaying ? (
                    <Pause size={14} fill="currentColor" />
                  ) : (
                    <Play size={14} className="ml-0.5" fill="currentColor" />
                  )}
                </button>

                {/* Body Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5 select-none text-left">
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <h4 className="text-xs font-bold text-slate-200 truncate pr-2 font-sans">
                      {item.title || "Custom Synthesis"}
                    </h4>
                    <span className="text-[9px] font-mono text-slate-500 flex-shrink-0">
                      {item.date}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                    {item.text}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[9px] font-bold">
                    {item.engine === "gemini" ? (
                      <span className="bg-sky-500/10 border border-sky-500/25 text-sky-300 px-2 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wider">
                        <Sparkles size={8} className="text-sky-400" />
                        Neural AI
                      </span>
                    ) : (
                      <span className="bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 px-2 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wider">
                        <Cpu size={8} className="text-indigo-400" />
                        Local Engine
                      </span>
                    )}

                    <span className="bg-black/30 text-slate-400 px-2 py-0.5 rounded border border-white/5">
                      Voice: {item.voiceName}
                    </span>

                    {item.moodId && (
                      <span className="bg-sky-500/5 text-sky-300 px-2 py-0.5 rounded border border-sky-500/10">
                        {item.moodId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Operations side panel */}
                <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                  {/* Load Text to Editor */}
                  <button
                    onClick={() => onSelect(item)}
                    className="p-1 px-2.5 bg-white/5 hover:bg-sky-500/10 text-[10px] font-bold text-slate-350 hover:text-sky-300 rounded-lg border border-white/5 transition-colors flex items-center gap-0.5 cursor-pointer font-sans"
                    title="Load original text to editor"
                    id={`load-library-item-${item.id}`}
                  >
                    Edit
                    <ExternalLink size={9} />
                  </button>

                  <div className="flex gap-1 mt-1 sm:mt-0">
                    {/* Exporter WAV (only for gemini engine, local synthesis does not allow file saves) */}
                    {(item.engine === "gemini" || item.audioUrl) && (
                      <button
                        onClick={() => handleDownload(item)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-sky-300 border border-white/5 rounded-lg transition-all cursor-pointer"
                        title="Export audio file (WAV)"
                        id={`download-library-item-${item.id}`}
                      >
                        <Download size={11} />
                      </button>
                    )}

                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 bg-white/5 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-white/5 rounded-lg transition-all cursor-pointer"
                      title="Delete recording"
                      id={`delete-library-item-${item.id}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Clock size={28} className="text-slate-650 mb-2.5 opacity-40 text-sky-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Library Empty</p>
            <p className="text-[11px] leading-relaxed mt-1 max-w-[240px] text-slate-500 font-sans">
              Process some Malayalam inputs above to cache or save audio voice files locally.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
