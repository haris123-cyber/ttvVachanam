/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PresetText, VoiceProfile, MoodProfile } from "./types";

export const PRESET_TEXTS: PresetText[] = [
  {
    id: "news_1",
    category: "News",
    label: "IT Growth in Kerala",
    text: "കേരളത്തിൽ ഡിജിറ്റൽ സാങ്കേതിക വിദ്യകൾക്കും പുതിയ വ്യവസായ സംരംഭങ്ങൾക്കും മികച്ച വളർച്ചയാണ് ഉണ്ടായിക്കൊണ്ടിരിക്കുന്നത് എന്ന് ഐടി വകുപ്പ് അറിയിച്ചു. കൂടുതൽ യുവാക്കൾ സ്റ്റാർട്ടപ്പുകളിലേക്ക് വരുന്നത് സംസ്ഥാനത്തിന്റെ പുരോഗതിക്ക് വൻ കരുത്താകും."
  },
  {
    id: "news_2",
    category: "News",
    label: "Sports Event in Kochi",
    text: "കായിക സൗഹൃദങ്ങൾക്ക് മുൻഗണന നൽകിക്കൊണ്ട് കൊച്ചിയിൽ സംഘടിപ്പിച്ച അന്താരാഷ്ട്ര മറാത്തൺ മത്സരത്തിൽ നൂറുകണക്കിന് കായിക താരങ്ങളും സാധാരണ ജനങ്ങളും പങ്കെടുത്തു. ആരോഗ്യ പൂർണ്ണമായ ഒരു സമൂഹ സൃഷ്‌ടിയാണ് മേള ലക്ഷ്യമിട്ടത്."
  },
  {
    id: "story_1",
    category: "Storytelling",
    label: "The Little Owl",
    text: "ഒരിടത്ത് ഒരിടത്ത് ഒരു ചെറിയ കാട്ടിൽ സന്തോഷത്തോടെയും സമാധാനത്തോടെയും ജീവിച്ചിരുന്ന ഒരു കുഞ്ഞു മൂങ്ങ ഉണ്ടായിരുന്നു. അവൾ രാത്രികളിൽ നക്ഷത്രങ്ങളെ നോക്കി മനോഹരമായ പാട്ടുകൾ പാടുമായിരുന്നു. കാട്ടിലെ എല്ലാ ജീവികളും ആ പാട്ടുകൾ കേൾക്കാൻ കൊതിച്ചിരുന്നു."
  },
  {
    id: "story_2",
    category: "Storytelling",
    label: "Simple Friendship",
    text: "പണ്ടൊരിക്കൽ ഒരു കാട്ടിലെ വലിയ സിംഹവും ഒരു ചെറിയ എലിയും തമ്മിൽ ഗാഢമായ സൗഹൃദത്തിലായി. വലുപ്പത്തിലോ കരുത്തിലോ അല്ല, മനസ്സിലെ സ്നേഹത്തിലാണ് യഥാർത്ഥ സൗഹൃദം കുടികൊള്ളുന്നത് എന്ന് അവർ മറ്റ് ജീവികളെ കാണിച്ചു കൊടുത്തു."
  },
  {
    id: "welcome_1",
    category: "Greetings",
    label: "Welcome Speech Opening",
    text: "പ്രിയപ്പെട്ട മാന്യ ജനങ്ങളെ, ഞങ്ങളുടെ പുതിയ സംരംഭത്തിന്റെ ഉദ്ഘാടന ചടങ്ങിലേക്ക് കടന്നുവന്ന നിങ്ങളെല്ലാവരെയും ഹൃദയത്തിന്റെ ഭാഷയിൽ സ്വാഗതം ചെയ്യുന്നു. നിങ്ങളുടെ സാന്നിധ്യമാണ് ഞങ്ങളുടെ വിജയം."
  },
  {
    id: "welcome_2",
    category: "Greetings",
    label: "Formal Vote of Thanks",
    text: "നിങ്ങളുടെ വിലയേറിയ സമയവും സഹായ സഹകരണങ്ങളും ഞങ്ങൾ നന്ദിയോടെ സ്മരിക്കുന്നു. വരും ദിവസങ്ങളിലും കൂടുതൽ നല്ല കാര്യങ്ങൾ ഒരുമിച്ച് ചെയ്യാൻ സാധിക്കട്ടെ എന്ന് ഞങ്ങൾ ആഗ്രഹിക്കുന്നു."
  },
  {
    id: "conv_1",
    category: "Conversational",
    label: "How are you?",
    text: "ഹലോ സുഹൃത്തേ, സുഖമാണോ? നിങ്ങളെ നേരിൽ കാണാൻ സാധിച്ചതിൽ എനിക്ക് വലിയ സന്തോഷമുണ്ട്. ഇന്നത്തെ ദിവസം എങ്ങനെയുണ്ടായിരുന്നു? എന്തൊക്കെയാണ് പുതിയ വിശേഷങ്ങൾ?"
  },
  {
    id: "conv_2",
    category: "Conversational",
    label: "Morning Greetings",
    text: "സുപ്രഭാതം! ചായ കുടിച്ചോ? ഇന്നെന്താണ് പരിപാടികൾ? പുറത്ത് ഇന്നത്തെ ദിവസം വളരെ മനോഹരമായ കാലാവസ്ഥയാണ് കാണാൻ സാധിക്കുന്നത്."
  }
];

export const GEMINI_VOICES: VoiceProfile[] = [
  { id: "Kore", name: "കൗമുദി (Kore)", gender: "Female", description: "Smooth, professional female voice. Outstanding for formal reading, broadcasts, and articles." },
  { id: "Zephyr", name: "വസന്ത (Zephyr)", gender: "Female", description: "Bright, lively female voice. Ideal for commercial recordings, announcements, and engaging narrations." },
  { id: "Charon", name: "സൂര്യൻ (Charon)", gender: "Male", description: "Warm, medium-pitch friendly male voice. Ideal for dialogue and audiobooks." },
  { id: "Puck", name: "ഭീമൻ (Puck)", gender: "Male", description: "Deep, powerful, resonant male voice. Excellent for serious messages, narrations, and stories." },
  { id: "Fenrir", name: "ധ്രുവൻ (Fenrir)", gender: "Male", description: "Rich, textured mature male voice. Great for storytelling, classical poetry, and deep dialogues." }
];

export const BROWSER_VOICES: VoiceProfile[] = [
  { id: "default_browser", name: "Browser Default Voice", gender: "Female", description: "Built-in synthesis engine. Instantly responsive offline voice." }
];

export const AUDIO_MOODS: MoodProfile[] = [
  { id: "cheerful", name: "സന്തോഷം (Cheerful)", description: "Bright, happy, and positive speech tone.", instruction: "cheerful and energetic" },
  { id: "professional", name: "പക്വതയുള്ള (Professional)", description: "Clear, measured tone of a news caster.", instruction: "calm, highly professional, news anchor style" },
  { id: "story", name: "കഥ പറയുന്ന (Storyteller)", description: "Gentle pacing with emotive storytelling voice.", instruction: "storytelling, expressive, emotional" },
  { id: "calm", name: "ശാന്തമായ (Calm)", description: "Soft, gentle whispered style.", instruction: "soft, gentle, comforting" },
  { id: "neutral", name: "സാധാരണ (Neutral)", description: "Standard conversational flow.", instruction: "standard clear speech" }
];
