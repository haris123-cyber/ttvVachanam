/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { PRESET_TEXTS } from "../presetData";
import { PresetText } from "../types";
import { 
  Keyboard, 
  Sparkles, 
  BookOpen, 
  FileText, 
  Languages, 
  RotateCcw, 
  Copy, 
  Check, 
  CornerDownRight 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TextControlPanelProps {
  value: string;
  onChange: (text: string) => void;
  onEnhanceStart: () => void;
  onEnhanceEnd: (newText: string) => void;
  onEnhanceError: (errorMessage: string) => void;
  disabled?: boolean;
}

// Malayalam Alphabet Arrays for the Glyph Pad
const VOWELS = [
  "അ", "ആ", "ഇ", "ഈ", "ഉ", "ഊ", "ഋ", "എ", "ഏ", "ഐ", "ഒ", "ഓ", "ഔ", "അം", "അഃ"
];

const CONSONANTS = [
  "ക", "ഖ", "ഗ", "ഘ", "ങ",
  "ച", "ഛ", "ജ", "ഝ", "ഞ",
  "ട", "ഠ", "ഡ", "ഢ", "ണ",
  "ത", "ഥ", "ദ", "ധ", "ന",
  "പ", "ഫ", "ബ", "ഭ", "മ",
  "യ", "ര", "ല", "വ", "ശ",
  "ഷ", "സ", "ഹ", "ള", "ഴ", "റ"
];

const SPECIALS = [
  "ൻ", "ർ", "ൽ", "ൾ", "ൺ", // Chillus
  "ാ", "ി", "ീ", "ു", "ൂ", "ൃ", "െ", "േ", "ൈ", "ൊ", "ോ", "ൌ", "്", "ം", "ഃ" // Signs
];

export default function TextControlPanel({
  value,
  onChange,
  onEnhanceStart,
  onEnhanceEnd,
  onEnhanceError,
  disabled = false
}: TextControlPanelProps) {
  const [activeTab, setActiveTab] = useState<"compose" | "transliterate" | "translate">("compose");
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGlyphPad, setShowGlyphPad] = useState(false);
  const [glyphTab, setGlyphTab] = useState<"vowels" | "consonants" | "specials">("vowels");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  const categories = ["All", "News", "Greetings", "Poetry", "Storytelling", "Conversational"];

  const filteredPresets = categoryFilter === "All" 
    ? PRESET_TEXTS 
    : PRESET_TEXTS.filter(p => p.category === categoryFilter);

  // Trigger copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Preset Selection
  const handleSelectPreset = (preset: PresetText) => {
    onChange(preset.text);
  };

  // Convert Manglish to Malayalam Script via server-side Gemini
  const handleTransliterate = async () => {
    if (!inputText.trim()) return;
    if (inputText.length > 6500) {
      onEnhanceError("Phonetic input exceeds the safe limit of 6,500 characters.");
      return;
    }
    setIsProcessing(true);
    onEnhanceStart();
    try {
      const response = await fetch("/api/transliterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await response.json();
      if (response.ok && data.text) {
        onChange(data.text);
        setActiveTab("compose"); // Switch to compose after success
      } else {
        onEnhanceError(data.error || "Transliteration failed.");
      }
    } catch (err: any) {
      onEnhanceError(err.message || "Network error. Transliteration pipeline failed.");
    } finally {
      setIsProcessing(false);
      onEnhanceEnd(value);
    }
  };

  // Translate English to Malayalam via server-side Gemini
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    if (inputText.length > 6500) {
      onEnhanceError("English input exceeds the safe limit of 6,500 characters.");
      return;
    }
    setIsProcessing(true);
    onEnhanceStart();
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, mode: "translate" }),
      });
      const data = await response.json();
      if (response.ok && data.text) {
        onChange(data.text);
        setActiveTab("compose"); // Switch to editor
      } else {
        onEnhanceError(data.error || "Translation failed.");
      }
    } catch (err: any) {
      onEnhanceError(err.message || "Network error during translation.");
    } finally {
      setIsProcessing(false);
      onEnhanceEnd(value);
    }
  };

  // Style Enhancements (SpellCheck/News caster style/Literary style)
  const handleEnhanceText = async (mode: "formal" | "news" | "literary") => {
    if (!value.trim()) return;
    if (value.length > 6500) {
      onEnhanceError("Vachanam editor content exceeds the maximum limit of 6,500 characters.");
      return;
    }
    setIsProcessing(true);
    onEnhanceStart();
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, mode }),
      });
      const data = await response.json();
      if (response.ok && data.text) {
        onChange(data.text);
      } else {
        onEnhanceError(data.error || "Enhancement failed.");
      }
    } catch (err: any) {
      onEnhanceError(err.message || "Network error. AI style enhancement failed.");
    } finally {
      setIsProcessing(false);
      onEnhanceEnd(value);
    }
  };

  // Glyph insert in editor at current text cursor location (simple append)
  const insertGlyph = (char: string) => {
    onChange(value + char);
  };

  return (
    <div className="glass rounded-3xl overflow-hidden flex flex-col h-full shadow-xl shadow-slate-950/40" id="text-control-panel">
      
      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-black/20 p-1" id="text-tabs">
        <button
          onClick={() => setActiveTab("compose")}
          className={`flex-1 py-3 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "compose"
              ? "bg-white/10 text-sky-400 border-b-2 border-sky-400"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
          id="tab-compose"
        >
          <FileText size={14} />
          Malayalam Editor
        </button>
        <button
          onClick={() => {
            setActiveTab("transliterate");
            if (inputText === "") setInputText("");
          }}
          className={`flex-1 py-3 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "transliterate"
              ? "bg-white/10 text-sky-400 border-b-2 border-sky-400"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
          id="tab-transliterate"
        >
          <Keyboard size={14} />
          Manglish to Malayalam
        </button>
        <button
          onClick={() => {
            setActiveTab("translate");
            if (inputText === "") setInputText("");
          }}
          className={`flex-1 py-3 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "translate"
              ? "bg-white/10 text-sky-400 border-b-2 border-sky-400"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
          id="tab-translate"
        >
          <Languages size={14} />
          English Translate
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        
        {/* Render Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === "compose" ? (
            <motion.div
              key="compose-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col gap-3 min-h-[300px]"
            >
              <div className="relative flex-1 group">
                <textarea
                  className="w-full h-full min-h-[160px] p-4 pr-12 bg-black/20 rounded-xl border border-white/5 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/20 text-slate-100 placeholder-slate-500 text-lg leading-relaxed resize-none scrollbar-thin overflow-y-auto custom-scrollbar"
                  placeholder="ഇവിടെ മലയാളം ടൈപ്പ് ചെയ്യുക... (Type or edit your Malayalam content here, or select a sample preset below)"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled || isProcessing}
                  maxLength={6500}
                  id="main-malayalam-textarea"
                />

                {/* Copy Text Button */}
                <button
                  onClick={handleCopy}
                  disabled={!value.trim()}
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-white/10 text-slate-400 hover:text-sky-300 rounded-lg border border-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Copy to clipboard"
                  id="copy-text-btn"
                >
                  {copied ? <Check size={14} className="text-sky-400" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Character Details & Trigger Glyph Pad */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-400 font-mono">
                <div className="flex gap-4">
                  <span>Words: <strong className="text-slate-200">{wordCount}</strong></span>
                  <span>
                    Characters:{" "}
                    <strong className={charCount >= 6500 ? "text-red-400 font-black animate-pulse" : charCount >= 5500 ? "text-amber-400 font-bold" : "text-sky-450"}>
                      {charCount} / 6500
                    </strong>
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowGlyphPad(!showGlyphPad)}
                    className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                      showGlyphPad 
                        ? "bg-sky-500/15 border-sky-500/40 text-sky-300 font-semibold" 
                        : "bg-white/5 border-white/5 hover:border-white/10 text-slate-350 font-sans cursor-pointer"
                    }`}
                    id="glyphpad-toggle"
                  >
                    <Keyboard size={12} />
                    {showGlyphPad ? "Hide Malayalam Glyphs" : "Malayalam Character Tool"}
                  </button>
                  <button
                    onClick={() => onChange("")}
                    disabled={!value.trim() || disabled}
                    className="p-1 px-2.5 bg-white/5 border border-white/5 hover:border-red-950 hover:bg-red-950/20 hover:text-red-400 text-slate-300 rounded-lg transition-colors cursor-pointer"
                    title="Clear content"
                    id="clear-text-btn"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              {/* Malayalam Glyph Pad */}
              {showGlyphPad && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card rounded-xl p-3 flex flex-col gap-3 shadow-inner"
                  id="malayalam-glyph-pad"
                >
                  {/* Sub tabs */}
                  <div className="flex gap-2 text-[10px] uppercase font-bold border-b border-white/5 pb-2">
                    <button
                      onClick={() => setGlyphTab("vowels")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${glyphTab === "vowels" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" : "text-slate-400"}`}
                      id="glyph-vowels-tab"
                    >
                      Vowels (സ്വരാക്ഷരങ്ങൾ)
                    </button>
                    <button
                      onClick={() => setGlyphTab("consonants")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${glyphTab === "consonants" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" : "text-slate-400"}`}
                      id="glyph-consonants-tab"
                    >
                      Consonants (വ്യഞ്ജനങ്ങൾ)
                    </button>
                    <button
                      onClick={() => setGlyphTab("specials")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${glyphTab === "specials" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" : "text-slate-400"}`}
                      id="glyph-specials-tab"
                    >
                      Chillus & Signs (ചില്ലുകൾ)
                    </button>
                  </div>

                  {/* Character Grid */}
                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-36 overflow-y-auto pr-1 text-sm custom-scrollbar">
                    {(glyphTab === "vowels" ? VOWELS : glyphTab === "consonants" ? CONSONANTS : SPECIALS).map((char, index) => (
                      <button
                        key={index}
                        onClick={() => insertGlyph(char)}
                        className="h-8 flex items-center justify-center bg-white/5 border border-white/5 hover:bg-sky-500/10 hover:border-sky-500/30 text-slate-100 hover:text-sky-200 rounded font-semibold transition-all active:scale-95 cursor-pointer font-sans"
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* AI Enhancers Bar */}
              <div className="glass-card p-4 rounded-2xl flex flex-col gap-2.5" id="ai-enhancers">
                <div className="flex items-center gap-1.5 text-xs text-sky-300 font-semibold uppercase tracking-wider">
                  <Sparkles size={13} className="text-sky-400 animate-pulse" />
                  AI Writing Stylist & Polisher (Gemini)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleEnhanceText("formal")}
                    disabled={!value.trim() || isProcessing}
                    className="py-1.5 px-2 bg-white/5 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/20 text-slate-300 hover:text-sky-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                    id="btn-enhance-grammar"
                  >
                    💡 Correct Grammar & Spellings
                  </button>
                  <button
                    onClick={() => handleEnhanceText("news")}
                    disabled={!value.trim() || isProcessing}
                    className="py-1.5 px-2 bg-white/5 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/20 text-slate-300 hover:text-sky-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                    id="btn-enhance-news"
                  >
                    📻 News Broadcaster Tone
                  </button>
                  <button
                    onClick={() => handleEnhanceText("literary")}
                    disabled={!value.trim() || isProcessing}
                    className="py-1.5 px-2 bg-white/5 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/20 text-slate-300 hover:text-sky-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                    id="btn-enhance-poetry"
                  >
                    ✍️ Poetic & Literary Style
                  </button>
                </div>
              </div>

            </motion.div>
          ) : activeTab === "transliterate" ? (
            <motion.div
              key="trans-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col gap-4"
            >
              <div className="text-xs text-slate-350 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/5 font-sans">
                ✏️ <strong>Manglish Mode:</strong> Type Malayalam using phonetic English letters (e.g., <code className="text-sky-400 bg-black/40 px-1 py-0.5 rounded font-mono">"namaskaram sugamano"</code> or <code className="text-sky-400 bg-black/40 px-1 py-0.5 rounded font-mono">"ente peru anil"</code>), then convert instantly to exquisite Malayalam script.
              </div>

              <textarea
                className="w-full min-h-[142px] p-4 bg-black/20 rounded-xl border border-white/5 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/20 text-slate-100 placeholder-slate-500 text-base resize-none"
                placeholder="Type phonetic Malayalam in English (e.g., sugamano chaya kudichor?)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={6500}
                id="transliterate-textarea"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setInputText("")}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl hover:bg-white/10 hover:text-slate-200 transition-colors cursor-pointer"
                  id="reset-trans-btn"
                >
                  Clear
                </button>
                <button
                  onClick={handleTransliterate}
                  disabled={isProcessing || !inputText.trim()}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/30 transition-all disabled:opacity-50 cursor-pointer"
                  id="run-trans-btn"
                >
                  <Sparkles size={14} className={isProcessing ? "animate-spin" : ""} />
                  {isProcessing ? "Transcending to Malayalam..." : "Convert to Malayalam Script"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="translate-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col gap-4"
            >
              <div className="text-xs text-slate-350 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/5 font-sans">
                🌐 <strong>English to Malayalam Translation:</strong> Input English statements below, and Gemini AI will translate and polish it into exquisite Malayalam text ready for voice output.
              </div>

              <textarea
                className="w-full min-h-[142px] p-4 bg-black/20 rounded-xl border border-white/5 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/20 text-slate-100 placeholder-slate-500 text-base resize-none"
                placeholder="Type English text to translate (e.g., Welcome everyone to this wonderful business gathering today...)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={6500}
                id="translate-textarea"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setInputText("")}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl hover:bg-white/10 hover:text-slate-200 transition-colors cursor-pointer"
                  id="reset-translate-btn"
                >
                  Clear
                </button>
                <button
                  onClick={handleTranslate}
                  disabled={isProcessing || !inputText.trim()}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/30 transition-all disabled:opacity-50 cursor-pointer"
                  id="run-translate-btn"
                >
                  <Sparkles size={14} className={isProcessing ? "animate-spin" : ""} />
                  {isProcessing ? "Translating English..." : "Translate to Malayalam"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preset Samples Selector Grid */}
        <div className="border-t border-white/5 pt-4 flex flex-col gap-3" id="preset-selector-wrapper">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 flex items-center gap-1">
              <BookOpen size={13} className="text-sky-400" />
              Featured Sample Pronunciations
            </span>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1" id="category-filter-chips">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-[10px] rounded-lg transition-all font-semibold uppercase tracking-wider cursor-pointer ${
                    categoryFilter === cat 
                      ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20" 
                      : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[148px] overflow-y-auto custom-scrollbar pr-1" id="preset-grid">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className="group flex flex-col items-start gap-1 p-2.5 glass-card hover:bg-white/10 border-white/5 hover:border-sky-500/35 rounded-xl text-left transition-all hover:scale-[1.01] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[9px] tracking-wider uppercase font-bold px-1.5 py-0.5 rounded bg-sky-950/40 border border-sky-500/20 text-sky-400">
                    {preset.category}
                  </span>
                  <CornerDownRight size={11} className="opacity-0 group-hover:opacity-100 text-sky-400 transition-opacity" />
                </div>
                <strong className="text-xs font-semibold text-slate-200 truncate w-full mt-1.5 font-sans">
                  {preset.label}
                </strong>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 w-full p-0 font-sans">
                  {preset.text}
                </p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
