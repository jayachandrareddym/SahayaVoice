import type { VoiceResult } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Turns a FastAPI error body ({ detail }) into a readable message. */
async function errorFrom(res: Response, label: string): Promise<Error> {
  let detail = "";
  try {
    const body = await res.json();
    detail = typeof body?.detail === "string" ? body.detail : "";
  } catch {
    /* body was not JSON */
  }
  return new Error(detail ? `${label}: ${detail}` : `${label} failed (HTTP ${res.status})`);
}

async function postJSON(path: string, body: unknown, label: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`Can't reach the SahayaVoice server at ${API_URL}. Is the backend running?`);
  }
  if (!res.ok) throw await errorFrom(res, label);
  return res;
}

export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function transcribe(
  blob: Blob,
  filename: string,
  language: string,
): Promise<{ transcript: string; language?: string; confidence?: number }> {
  const form = new FormData();
  form.append("audio", blob, filename);
  form.append("language", language);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/transcribe`, { method: "POST", body: form });
  } catch {
    throw new Error(`Can't reach the SahayaVoice server at ${API_URL}. Is the backend running?`);
  }
  if (!res.ok) throw await errorFrom(res, "Transcription");
  return res.json();
}

export async function processVoice(params: {
  transcript: string;
  language: string;
  session_id: string;
  context?: { role: string; content: string }[];
}): Promise<Partial<VoiceResult>> {
  const res = await postJSON("/api/process-voice", params, "Processing");
  return res.json();
}

export async function demoPreset(preset_id: string, language: string): Promise<VoiceResult> {
  const res = await postJSON("/api/demo-preset", { preset_id, language }, "Demo");
  return res.json();
}

export async function speak(text: string, language: string): Promise<Blob> {
  const res = await postJSON("/api/speak", { text, language }, "Speech");
  return res.blob();
}

export async function downloadPdf(kannada_letter: string, summary: string): Promise<Blob> {
  const res = await postJSON("/api/download-pdf", { kannada_letter, summary }, "PDF");
  return res.blob();
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
