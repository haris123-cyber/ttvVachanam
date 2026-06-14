/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TtsEngine = "gemini" | "browser";

export interface VoiceProfile {
  id: string;
  name: string;
  gender: "Male" | "Female";
  description: string;
}

export interface MoodProfile {
  id: string;
  name: string;
  description: string;
  instruction: string;
}

export interface LibraryItem {
  id: string;
  text: string;
  engine: TtsEngine;
  voiceId: string;
  voiceName: string;
  moodId?: string;
  audioUrl?: string; // Cache local blob or base64 audio Url
  base64Audio?: string; // Persistent PCM base64 (only for Gemini audio to allow redownload)
  sampleRate?: number;
  date: string;
  title: string;
}

export interface PresetText {
  id: string;
  category: "News" | "Greetings" | "Poetry" | "Storytelling" | "Conversational";
  label: string;
  text: string;
}
