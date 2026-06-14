/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { TtsEngine, LibraryItem } from "./types";
import { GEMINI_VOICES, AUDIO_MOODS } from "./presetData";
import TextControlPanel from "./components/TextControlPanel";
import TtsControlsPanel from "./components/TtsControlsPanel";
import WaveformVisualizer from "./components/WaveformVisualizer";
import VoiceLibrary, { getWavBlobFromPCM } from "./components/VoiceLibrary";
import { 
  Sparkles, 
  Play, 
  Pause, 
  Square, 
  Save, 
  Download,
  AlertTriangle, 
  HelpCircle, 
  Tv, 
  ChevronRight,
  Info,
  Shield,
  Activity,
  Gauge,
  Database,
  RefreshCw
} from "lucide-react";

export default function App() {
  // TTS State parameters
  const [text, setText] = useState<string>("നമസ്കാരം, സുഖമാണോ? മലയാളം ടെക്സ്റ്റ്-ടു-വോയ്‌സ് പ്ലാറ്റ്‌ഫോമിലേക്ക് സ്വാഗതം.");
  const [engine, setEngine] = useState<TtsEngine>("gemini");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("Kore");
  const [selectedMoodId, setSelectedMoodId] = useState<string>("neutral");
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0); // Web speech Synthesis only

  // Gemini limits & balance stats state
  const [usageStats, setUsageStats] = useState<{
    totalRequests: number;
    ttsRequests: number;
    transliterateRequests: number;
    enhanceRequests: number;
    estimatedTokens: number;
    lastRequestTime: string | null;
    isKeyConfigured: boolean;
    limits: { rpm: number; tpm: number; rpd: number };
    tier: string;
  } | null>(null);

  const fetchUsageStats = async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setUsageStats(data);
      }
    } catch (err) {
      console.error("Failed to load Gemini usage stats:", err);
    }
  };

  useEffect(() => {
    fetchUsageStats();
    const interval = setInterval(fetchUsageStats, 10000); // Sync every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Library & System status
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Active Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);

  // Buffer caching (To prevent duplicating expensive Gemini calls)
  const [activeGeminiBase64, setActiveGeminiBase64] = useState<string | null>(null);
  const [activeGeminiText, setActiveGeminiText] = useState<string>("");
  const [activeGeminiVoice, setActiveGeminiVoice] = useState<string>("");
  const [activeGeminiMood, setActiveGeminiMood] = useState<string>("");

  // Refs for Web Audio API (Gemini raw PCM playback)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);

  // Web Speech Synthesis (Browser TTS) API State
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceName, setSelectedBrowserVoiceName] = useState<string>("");
  const syntheticUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Hydrate Library items from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("malayalam_tts_library");
      if (saved) {
        setLibrary(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Error loading localStorage library:", err);
    }
  }, []);

  // Save changes to LocalStorage
  const saveLibraryToLocalStorage = (updatedLibrary: LibraryItem[]) => {
    try {
      localStorage.setItem("malayalam_tts_library", JSON.stringify(updatedLibrary));
      setLibrary(updatedLibrary);
    } catch (err) {
      console.error("Error saving library to localStorage:", err);
    }
  };

  // Setup Web Speech Synthesis list
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadWebVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setBrowserVoices(voices);

      // Prioritize Malayalam (ml-IN), fallback to other Indian dialects, or first voice
      const mlVoice = voices.find(v => 
        v.lang.toLowerCase().includes("ml") || 
        v.name.toLowerCase().includes("malayalam")
      );
      const inVoice = voices.find(v => v.lang.toLowerCase().includes("in"));

      if (mlVoice) {
        setSelectedBrowserVoiceName(mlVoice.name);
      } else if (inVoice) {
        setSelectedBrowserVoiceName(inVoice.name);
      } else if (voices.length > 0) {
        setSelectedBrowserVoiceName(voices[0].name);
      }
    };

    loadWebVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadWebVoices;
    }
  }, []);

  // Initialize or resume AudioContext
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Convert raw 16-bit PCM little endian base64 into AudioBuffer
  const decodePCMToBuffer = (base64: string, sampleRate = 24000): AudioBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const float32Array = new Float32Array(len / 2);
    const dataView = new DataView(bytes.buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const int16 = dataView.getInt16(i * 2, true); // true for little-endian
      float32Array[i] = int16 / 32768.0;
    }

    const ctx = getAudioContext();
    const buffer = ctx.createBuffer(1, float32Array.length, sampleRate);
    buffer.copyToChannel(float32Array, 0);
    return buffer;
  };

  // Clean-up and termination of any active raw PCM nodes
  const stopPCMPlayback = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch (e) {
        // Source node might already be dead
      }
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  // Clean-up any active synthetic browser synthesis
  const stopSyntheticPlayback = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  // Main Master Reset
  const stopAllPlayback = () => {
    stopPCMPlayback();
    stopSyntheticPlayback();
    setPlayingItemId(null);
  };

  // Play using window.speechSynthesis local capabilities
  const playWithLocalBrowserEngine = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setErrorMessage("Speech synthesis is unsupported by your browser.");
      return;
    }

    // Stop previous utterance
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Match voice profile
    const activeVoice = browserVoices.find(v => v.name === selectedBrowserVoiceName);
    if (activeVoice) {
      utterance.voice = activeVoice;
    }

    utterance.rate = speed;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error("Browser TTS trigger error:", e);
      setIsPlaying(false);
      setIsPaused(false);
      if (e.error !== "interrupted") {
        setErrorMessage(`Browser speech system returned error: ${e.error}`);
      }
    };

    syntheticUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Main Audio Synth Trigger
  const handleToggleSpeak = async () => {
    if (!text.trim()) {
      setErrorMessage("Please enter some Malayalam text to speak.");
      return;
    }
    if (text.length > 6500) {
      setErrorMessage("Vocal script exceeds maximum limit of 6,500 characters. Please shorten your content.");
      return;
    }
    setErrorMessage(null);
    setInfoMessage(null);

    // 1. Local Browser TTS Mode
    if (engine === "browser") {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setErrorMessage("Speech synthesis is unsupported by your browser.");
        return;
      }

      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsPlaying(true);
        return;
      }

      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPaused(true);
        setIsPlaying(false);
        return;
      }

      playWithLocalBrowserEngine();
      return;
    }

    // 2. Gemini Neural AI mode
    if (engine === "gemini") {
      // If paused, resume playback node
      if (isPaused && audioBufferRef.current) {
        playPCMBufferAtOffset(audioBufferRef.current, pauseOffsetRef.current);
        setIsPaused(false);
        setIsPlaying(true);
        return;
      }

      // If active, user selected to pause
      if (isPlaying) {
        // Capture pause offset
        const elapsedTime = getAudioContext().currentTime - startTimeRef.current;
        pauseOffsetRef.current = pauseOffsetRef.current + elapsedTime;
        
        if (audioSourceRef.current) {
          try {
            audioSourceRef.current.stop();
          } catch(e){}
        }
        setIsPaused(true);
        setIsPlaying(false);
        return;
      }

      // Start fresh playback. Detect if caching matches current selection
      const matchesCache = 
        activeGeminiBase64 && 
        activeGeminiText === text && 
        activeGeminiVoice === selectedVoiceId && 
        activeGeminiMood === selectedMoodId;

      if (matchesCache && activeGeminiBase64) {
        try {
          const buffer = decodePCMToBuffer(activeGeminiBase64);
          audioBufferRef.current = buffer;
          pauseOffsetRef.current = 0;
          playPCMBufferAtOffset(buffer, 0);
          setInfoMessage("Playing cached neural recording instantly (Unlimited Offline Replay).");
          setIsPlaying(true);
          setIsPaused(false);
        } catch (err: any) {
          setErrorMessage(`Cache decode failed: ${err.message}. Regenerating...`);
          generateAndPlayGeminiTts();
        }
      } else {
        generateAndPlayGeminiTts();
      }
    }
  };

  // Perform Gemini TTS Backend Call
  const generateAndPlayGeminiTts = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setInfoMessage(null);
    stopPCMPlayback();

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: selectedVoiceId,
          mood: AUDIO_MOODS.find(m => m.id === selectedMoodId)?.instruction || "neutral"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Internal Server requested TTS returned failure.");
      }

      if (data.isQuotaFallback) {
        setErrorMessage(data.error || "Neural TTS daily rate limit has been exceeded. Seamlessly switching to Local Voice Engine as backup!");
        setEngine("browser");
        playWithLocalBrowserEngine();
        fetchUsageStats();
        return;
      }

      const base64Audio = data.audio;
      if (!base64Audio) {
        throw new Error("Empty audio stream decoded.");
      }

      // Cache this generation of audio
      setActiveGeminiBase64(base64Audio);
      setActiveGeminiText(text);
      setActiveGeminiVoice(selectedVoiceId);
      setActiveGeminiMood(selectedMoodId);

      // Program play node
      const buffer = decodePCMToBuffer(base64Audio);
      audioBufferRef.current = buffer;
      pauseOffsetRef.current = 0;
      playPCMBufferAtOffset(buffer, 0);
      setIsPlaying(true);
      setIsPaused(false);

      // Immediate quota update
      fetchUsageStats();

    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Failed to dial server neural syntesis loop.";
      const isQuotaExceeded = errMsg.toLowerCase().includes("quota") || 
                              errMsg.toLowerCase().includes("exhausted") || 
                              errMsg.toLowerCase().includes("429");
      
      if (isQuotaExceeded) {
        setEngine("browser");
        setInfoMessage("Neural TTS daily limit reached. Seamlessly switched to local speech synthesizer for uninterrupted voice generation!");
        playWithLocalBrowserEngine();
      } else {
        setErrorMessage(errMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Play PCM nodes through AudioContext
  const playPCMBufferAtOffset = (buffer: AudioBuffer, offset: number) => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch(e){}
    }

    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // Wire up playback configurations (speed modifier)
    source.playbackRate.value = speed;
    source.connect(ctx.destination);

    source.onended = () => {
      // If was not manually paused or stopped, set back to stop state
      if (audioSourceRef.current === source) {
        setIsPlaying(false);
        setIsPaused(false);
        setPlayingItemId(null);
      }
    };

    audioSourceRef.current = source;
    startTimeRef.current = ctx.currentTime;
    
    // Bounds guard offset
    const adjustedOffset = offset >= buffer.duration ? 0 : offset;
    source.start(0, adjustedOffset);
  };

  // Play individual recordings in the Library directly
  const handlePlayLibraryItem = (item: LibraryItem) => {
    // If playing current, trigger standard toggling pauses
    if (playingItemId === item.id) {
      handleToggleSpeakFromActive(item);
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    stopAllPlayback();

    // 1. Playing cached base64 PCM directly (Zero network latencies!)
    if (item.engine === "gemini" && item.base64Audio) {
      try {
        const buffer = decodePCMToBuffer(item.base64Audio, item.sampleRate || 24000);
        audioBufferRef.current = buffer;
        pauseOffsetRef.current = 0;
        
        setPlayingItemId(item.id);
        playPCMBufferAtOffset(buffer, 0);
        setIsPlaying(true);
        setIsPaused(false);
      } catch (err: any) {
        setErrorMessage("Failed to play library PCM buffer: " + err.message);
      }
    } 
    // 2. Falling back to local synthesiser
    else if (item.engine === "browser") {
      setPlayingItemId(item.id);
      const utterance = new SpeechSynthesisUtterance(item.text);
      const voice = browserVoices.find(v => v.name === item.voiceId);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setPlayingItemId(null);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setPlayingItemId(null);
      };
      setIsPlaying(true);
      setIsPaused(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle active library play nodes
  const handleToggleSpeakFromActive = (item: LibraryItem) => {
    if (item.engine === "gemini") {
      if (isPlaying) {
        const elapsed = getAudioContext().currentTime - startTimeRef.current;
        pauseOffsetRef.current = pauseOffsetRef.current + elapsed;
        if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch(e){}
        }
        setIsPlaying(false);
        setIsPaused(true);
      } else if (isPaused && audioBufferRef.current) {
        playPCMBufferAtOffset(audioBufferRef.current, pauseOffsetRef.current);
        setIsPlaying(true);
        setIsPaused(false);
      }
    } else {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
        setIsPaused(true);
      } else {
        window.speechSynthesis.resume();
        setIsPlaying(true);
        setIsPaused(false);
      }
    }
  };

  // Load past library card properties to primary editor controls
  const handleSelectLibraryItem = (item: LibraryItem) => {
    setText(item.text);
    setEngine(item.engine);
    if (item.engine === "gemini") {
      setSelectedVoiceId(item.voiceId);
      if (item.moodId) setSelectedMoodId(item.moodId);
    } else {
      setSelectedBrowserVoiceName(item.voiceId);
    }
    setInfoMessage(`Loaded recording text and settings back to the Control Panel.`);
  };

  // Add current active generation to local history library
  const handleSaveToLibrary = () => {
    if (!text.trim()) {
      setErrorMessage("No content to save.");
      return;
    }

    const titleInput = prompt("Enter a descriptive title for this voice synthesis:", `സന്ദേശം ${library.length + 1}`);
    if (titleInput === null) return; // cancelled
    const finalTitle = titleInput.trim() || `സന്ദേശം ${library.length + 1}`;

    const newRecording: LibraryItem = {
      id: "lib_" + Date.now(),
      text,
      engine,
      voiceId: engine === "gemini" ? selectedVoiceId : selectedBrowserVoiceName,
      voiceName: engine === "gemini" 
        ? (GEMINI_VOICES.find(v => v.id === selectedVoiceId)?.name || selectedVoiceId)
        : selectedBrowserVoiceName,
      moodId: engine === "gemini" ? selectedMoodId : undefined,
      base64Audio: engine === "gemini" ? (activeGeminiBase64 || undefined) : undefined,
      sampleRate: engine === "gemini" ? 24000 : undefined,
      date: new Date().toLocaleDateString("ml-IN", { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      title: finalTitle
    };

    const updated = [newRecording, ...library];
    saveLibraryToLocalStorage(updated);
    setInfoMessage(`Synthesis saved perfectly to your local library!`);
  };

  // Download current active audio directly as WAV
  const handleDownloadCurrentAudio = () => {
    if (engine !== "gemini") {
      alert("Local browser synthesis runs on-the-fly and does not generate physical files. Please switch the Speech Engine to 'Gemini Neural AI' to generate and download high-quality lossless WAV audio!");
      return;
    }
    if (!activeGeminiBase64) {
      setErrorMessage("No active neural synthesized audio is available. Click 'Speak Malayalam' to generate your audio first!");
      return;
    }
    try {
      const blob = getWavBlobFromPCM(activeGeminiBase64, 24000);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `malayalam_synthesis_${selectedVoiceId}_${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      setInfoMessage("Neural WAV audio downloaded successfully!");
    } catch (err: any) {
      setErrorMessage(`Failed to export WAV audio: ${err.message}`);
    }
  };

  // Remove library items
  const handleDeleteLibraryItem = (id: string) => {
    if (playingItemId === id) {
      stopAllPlayback();
    }
    const updated = library.filter(item => item.id !== id);
    saveLibraryToLocalStorage(updated);
  };

  return (
    <div className="min-h-screen text-slate-150 flex flex-col p-3 sm:p-5 md:p-6 lg:p-8 relative selection:bg-sky-500/30 selection:text-slate-100" id="main-application-frame">
      
      {/* Dynamic Frosted Blue/Indigo Mesh Background spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-sky-400/15 to-indigo-500/15 blur-[120px] pointer-events-none select-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-violet-500/10 to-sky-500/15 blur-[130px] pointer-events-none select-none" />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6 relative" id="layout-view-wrapper">
        
        {/* TOP BRAND HEADER PANEL */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5" id="header-brand-panel">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono text-[9px] font-bold uppercase tracking-wider leading-none">
                PRO EDITION
              </span>
              <span className="flex items-center gap-1 text-[11px] text-sky-450 font-mono tracking-wide font-semibold">
                <Sparkles size={11} className="animate-pulse text-sky-400" />
                Dual-Engine Platform
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100 mt-2 font-sans uppercase" id="brand-main-title">
              Vachanam <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-500 font-normal">മലയാളം</span>
            </h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5 tracking-wide">
              Traditional Malayalam voice Synthesis, Transliteration & Writing Studio
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-2.5 rounded-2xl text-[11px] font-bold font-mono" id="brand-status-meta">
            <div className="flex items-center gap-1.5 px-3 border-r border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse shrink-0" />
              <span className="text-slate-305">Neural Engine:</span>
              <span className="text-sky-405">ONLINE</span>
            </div>
            
            <div className="flex items-center gap-1.5 px-3">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] shrink-0" />
              <span className="text-slate-305">Web Speech API:</span>
              <span className="text-indigo-405">READY</span>
            </div>
          </div>
        </header>

        {/* FEEDBACK & ALERTS AREA */}
        {errorMessage && (() => {
          const isQuotaExceeded = errorMessage.toLowerCase().includes("quota") || 
                                  errorMessage.toLowerCase().includes("exhausted") || 
                                  errorMessage.toLowerCase().includes("429");
          return (
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-xs leading-relaxed flex flex-col gap-3 animated-fade-in backdrop-blur-md" id="error-alert">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0" size={17} />
                <div className="flex-1">
                  <span className="font-bold uppercase tracking-wider block mb-1 font-sans">
                    {isQuotaExceeded ? "Vocal API Quota Exhausted" : "Synthesis Failure"}
                  </span>
                  <p className="font-mono text-[11px] leading-relaxed break-words">{errorMessage}</p>
                  
                  {errorMessage.includes("GEMINI_API_KEY") && (
                    <div className="mt-2 text-[11px] text-slate-400 leading-snug font-sans">
                      👉 Please navigate to your <strong>Settings &gt; Secrets</strong> tab in Google AI Studio, insert your valid <strong>GEMINI_API_KEY</strong>, and resume!
                    </div>
                  )}
                </div>
              </div>

              {isQuotaExceeded && (
                <div className="mt-2 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 font-sans flex flex-col gap-2.5">
                  <div className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={12} className="text-amber-400 animate-pulse" />
                    Neural TTS Quota Limit Exceeded (20 Reqs/Day)
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    The new neural voice synthesis preview model (<code>gemini-3.1-flash-tts-preview</code>) on free keys is limited to 20 requests per day. 
                    No worries at all! You can switch instantly to the built-in, completely unlimited <strong>Local browser vocal engine</strong> to continue generating beautiful Malayalam vocals without limit constraints.
                  </p>
                  <button
                    onClick={() => {
                      setEngine("browser");
                      setErrorMessage(null);
                      setInfoMessage("Switched seamlessly to Local Speech Engine (Free & Unlimited local playback active!).");
                    }}
                    className="self-start px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-[11px] rounded-lg transition-all active:scale-95 cursor-pointer shadow-lg shadow-amber-950/20 flex items-center gap-1.5"
                  >
                    <RefreshCw size={11} className="animate-spin duration-1000" />
                    Switch to Local Voice Engine (Free & Unlimited)
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {infoMessage && (
          <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-sky-300 text-xs flex items-center gap-2.5 animated-fade-in backdrop-blur-md font-sans" id="info-alert">
            <Info className="text-sky-404" size={14} />
            <span className="font-semibold leading-none">{infoMessage}</span>
          </div>
        )}

        {/* MAIN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="workspace-grid-layout">
          
          {/* LEFT COLUMN: Input Text Editor */}
          <div className="lg:col-span-7 flex flex-col" id="col-editor-panel">
            <TextControlPanel
              value={text}
              onChange={setText}
              onEnhanceStart={() => setErrorMessage(null)}
              onEnhanceEnd={() => {
                setInfoMessage("AI Writing Assistant updated your text script successfully.");
                fetchUsageStats();
              }}
              onEnhanceError={(err) => setErrorMessage(err)}
              disabled={isProcessing}
            />
          </div>

          {/* RIGHT COLUMN: Sound Engine controls */}
          <div className="lg:col-span-5 flex flex-col gap-6" id="col-sound-engine-panel">
            
            {/* Engine configuration */}
            <TtsControlsPanel
              engine={engine}
              onEngineChange={setEngine}
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={setSelectedVoiceId}
              selectedMoodId={selectedMoodId}
              onMoodChange={setSelectedMoodId}
              speed={speed}
              onSpeedChange={setSpeed}
              pitch={pitch}
              onPitchChange={setPitch}
              browserVoices={browserVoices}
              selectedBrowserVoiceName={selectedBrowserVoiceName}
              onBrowserVoiceChange={setSelectedBrowserVoiceName}
            />

            {/* WAVE VISUALIZER DISPLAY CARD */}
            <div className="glass p-6 rounded-3xl flex flex-col gap-4 shadow-xl shadow-slate-950/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-305 flex items-center gap-1.5">
                  <Tv size={13} className="text-sky-400" />
                  Dynamic Waveform Output
                </span>
                
                {isPlaying && (
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-950/40 border border-sky-500/20 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider font-bold">
                    ACTIVE {engine === "gemini" ? "NEURAL" : "SYNTH"} OUTPUT
                  </span>
                )}
              </div>

              <WaveformVisualizer isPlaying={isPlaying} isPaused={isPaused} />
              
              {/* Contextual audio description summaries */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>Mono Channel Output</span>
                <span>{engine === "gemini" ? "Sample Rate: 24,000 Hz" : "Sample Rate: Browser Driver"}</span>
              </div>
            </div>

            {/* GEMINI QUOTA & LIMITS BALANCE DASHBOARD */}
            <div className="glass p-6 rounded-3xl flex flex-col gap-4 shadow-xl shadow-slate-950/30" id="gemini-limits-quota-dashboard">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 font-sans">
                  <Activity size={13} className="text-indigo-400" />
                  Gemini API Quota & Live Balance
                </span>
                
                <button 
                  onClick={fetchUsageStats}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-indigo-400 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer border border-white/5"
                  title="Force Sync limits with Google backend"
                >
                  <RefreshCw size={10} />
                  Sync Quota
                </button>
              </div>

              {usageStats ? (
                <div className="flex flex-col gap-3.5 font-sans">
                  {/* Status Banner */}
                  <div className={`p-3 rounded-2xl flex items-center justify-between gap-2.5 border ${
                    usageStats.isKeyConfigured 
                      ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-300" 
                      : "bg-amber-500/5 border-amber-500/10 text-amber-300"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={usageStats.isKeyConfigured ? "text-emerald-400 animate-pulse" : "text-amber-400"} />
                      <div className="flex flex-col text-left leading-tight">
                        <span className="text-[11px] font-bold tracking-tight">
                          {usageStats.isKeyConfigured ? "API KEY CONFIGURED" : "MISSING API KEY"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                          {usageStats.tier}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono uppercase bg-slate-950/40 px-2 py-0.5 rounded border border-white/5">
                        {usageStats.isKeyConfigured ? "Verified" : "Missing Key"}
                      </span>
                    </div>
                  </div>

                  {/* Active Daily Balance Calculation */}
                  <div className="bg-black/20 p-3.5 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] text-slate-450 uppercase font-bold font-mono tracking-wider">Remaining Day Bal</span>
                        <span className="text-base font-black tracking-tight text-white mt-0.5">
                          {typeof usageStats.limits.rpd === "number" ? (
                            <>
                              {(usageStats.limits.rpd - usageStats.totalRequests).toLocaleString()}{" "}
                              <span className="text-[11px] font-normal text-slate-400">/ {usageStats.limits.rpd.toLocaleString()} reqs</span>
                            </>
                          ) : (
                            <>
                              ∞ <span className="text-[11px] font-normal text-indigo-300">Unlimited Requests</span>
                            </>
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-500/10 px-2 py-0.5 rounded-full">
                        {typeof usageStats.limits.rpd === "number" ? (
                          `${((1 - (usageStats.totalRequests / usageStats.limits.rpd)) * 100).toFixed(1)}% Free`
                        ) : (
                          "∞ Infinite Free Access"
                        )}
                      </span>
                    </div>

                    {/* Progress slider bar */}
                    <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-sky-500 h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: typeof usageStats.limits.rpd === "number" 
                            ? `${Math.max(1, Math.min(100, (1 - (usageStats.totalRequests / usageStats.limits.rpd)) * 100))}%` 
                            : "100%" 
                        }}
                      />
                    </div>
                  </div>

                  {/* Metrics breakdown grid */}
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-slate-400 text-left">
                    <div className="p-2.5 bg-white/3 border border-white/5 rounded-xl flex flex-col gap-0.5">
                      <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Estimated Tokens</span>
                      <strong className="text-slate-200 text-xs mt-0.5 flex items-center gap-1">
                        <Database size={11} className="text-indigo-400" />
                        {usageStats.estimatedTokens.toLocaleString()}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white/3 border border-white/5 rounded-xl flex flex-col gap-0.5">
                      <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Active Rate Limits</span>
                      <strong className="text-slate-200 text-xs mt-0.5 flex items-center gap-1">
                        <Gauge size={11} className="text-emerald-400" />
                        {usageStats.limits.rpm} RPM
                      </strong>
                    </div>
                  </div>

                  {/* Endpoint-level Session Activity lists */}
                  <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3 text-left">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">
                      Current Session Actions (Stateful Feed)
                    </span>
                    <div className="flex flex-col gap-1 font-mono text-[10px]">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400">Vocal Synthesis (TTS API)</span>
                        <span className="font-bold text-sky-450">{usageStats.ttsRequests} reqs</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-white/3">
                        <span className="text-slate-400">Manglish Transliteration</span>
                        <span className="font-bold text-indigo-450">{usageStats.transliterateRequests} reqs</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-white/3">
                        <span className="text-slate-400">Style Enhancement & Translate</span>
                        <span className="font-bold text-violet-450">{usageStats.enhanceRequests} reqs</span>
                      </div>
                    </div>
                  </div>

                  {usageStats.lastRequestTime && (
                    <div className="text-[9px] text-right font-mono text-slate-500 italic mt-0.5">
                      Last request: {new Date(usageStats.lastRequestTime).toLocaleTimeString()}
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 gap-3 font-sans">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Loading Gemini developer quota rates...</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* PRIMARY COMPACT FLOATING BAR CONTROLS */}
        <div 
          className="sticky bottom-4 z-40 glass border border-white/5 p-4 rounded-3xl shadow-2xl shadow-slate-950/40 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4 w-full" 
          id="floating-playback-master-bar"
        >
          {/* Left panel: Active Specs Summary */}
          <div className="flex items-center gap-3.5 select-none self-start md:self-auto font-sans">
            <div className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
              isPlaying ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse" : "bg-white/5 text-slate-500"
            }`}>
              {engine === "gemini" ? <Sparkles size={16} /> : <Tv size={16} />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-none text-slate-200">
                Playing via: {engine === "gemini" ? "Gemini Neural Voice" : "Browser TTS Drivers"}
              </span>
              <span className="text-[11px] leading-snug text-slate-400 tracking-wide mt-1.5 truncate max-w-[280px]">
                Active profile: {engine === "gemini" ? selectedVoiceId : selectedBrowserVoiceName}
              </span>
            </div>
          </div>

          {/* Center Playback Control Triggers */}
          <div className="flex items-center gap-3" id="master-audioplayer-triggers">
            <button
              onClick={handleToggleSpeak}
              disabled={isProcessing}
              className={`p-3 px-8 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 select-none cursor-pointer font-sans ${
                isPlaying
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                  : "bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white"
              }`}
              id="master-btn-play-pause"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Audio...
                </>
              ) : isPlaying ? (
                <>
                  <Pause size={15} fill="currentColor" />
                  Pause Output
                </>
              ) : (
                <>
                  <Play size={15} fill="currentColor" />
                  Speak Malayalam
                </>
              )}
            </button>

            <button
              onClick={stopAllPlayback}
              disabled={!isPlaying && !isPaused}
              className="p-3 bg-white/5 border border-white/5 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Reset Output"
              id="master-btn-stop"
            >
              <Square size={15} fill="currentColor" />
            </button>
          </div>

          {/* Right Action: Save or Download file */}
          <div className="flex items-center gap-2 self-end md:self-auto font-sans">
            {engine === "gemini" && (
              <div className="text-[10px] text-slate-500 tracking-wider mr-2 uppercase font-bold font-mono hidden xl:block">
                Unlimited Vocal use cached
              </div>
            )}
            
            <button
              onClick={handleSaveToLibrary}
              disabled={isProcessing || !text.trim() || (engine === "gemini" && !activeGeminiBase64)}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-sky-500/30 text-slate-300 hover:text-sky-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-30 select-none cursor-pointer font-sans"
              title={engine === "gemini" && !activeGeminiBase64 ? "Speak/generate the text first to cache and save" : "Save this vocal recording to library"}
              id="master-btn-save-library"
            >
              <Save size={14} />
              Save to Library
            </button>

            {/* Direct WAV Download button */}
            <button
              onClick={handleDownloadCurrentAudio}
              disabled={isProcessing || !text.trim() || (engine === "gemini" && !activeGeminiBase64)}
              className="p-3 bg-sky-500 hover:bg-sky-400 disabled:bg-white/5 disabled:hover:bg-white/5 disabled:border-white/5 border border-sky-400/20 text-slate-950 disabled:text-slate-500 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-30 select-none cursor-pointer font-sans"
              title={engine === "gemini" && !activeGeminiBase64 ? "Speak/generate the text first to download WAV" : "Download current audio as WAV file"}
              id="master-btn-download-wav"
            >
              <Download size={14} />
              Download WAV
            </button>
          </div>
        </div>

        {/* BOTTOM: LOCAL SYNTHESIS VOICE LIBRARY */}
        <section className="mt-4 pb-12" id="voice-library-sect">
          <VoiceLibrary
            items={library}
            onDelete={handleDeleteLibraryItem}
            onSelect={handleSelectLibraryItem}
            onPlayItem={handlePlayLibraryItem}
            playingItemId={playingItemId}
            isAudioPlaying={isPlaying}
          />
        </section>

      </div>
    </div>
  );
}
