/** Languages supported by SahayaVoice */
export const SUPPORTED_LANGUAGES = [
  { code: "kn", label: "ಕನ್ನಡ", name: "Kannada" },
  { code: "hi", label: "हिन्दी", name: "Hindi" },
  { code: "ta", label: "தமிழ்", name: "Tamil" },
  { code: "te", label: "తెలుగు", name: "Telugu" },
  { code: "en", label: "English", name: "English" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export interface VoiceResult {
  transcript: string;
  language: LanguageCode;
  kannada_letter: string;
  summary: string;
  next_steps: string;
  clarify_question?: string | null;
  intent?: string;
  action: "clarify" | "generate";
}

/** Where the request currently is in the STT → LLM → letter pipeline. */
export type Stage = "idle" | "listening" | "transcribing" | "understanding" | "drafting" | "done" | "error";

export interface Turn {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Assistant turns that produced a letter */
  kind?: "clarify" | "letter";
}

export interface HistoryItem {
  id: string;
  createdAt: number;
  title: string;
  result: VoiceResult;
}
