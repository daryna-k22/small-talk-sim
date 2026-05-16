import type { AgeGroupId, CharacterId, Zodiac } from "./characters";
import type { Locale } from "./i18n";
import type { SceneId } from "./scenes";

export type Turn = {
  speaker: "user" | "character";
  text: string;
  voiceAnalysis?: VoiceAnalysis;
};

export type VoiceAnalysis = {
  confidence: "low" | "medium" | "high";
  energy: "low" | "medium" | "high";
  fillerWords: string[];
  notableTone: string;
};

export type Session = {
  characterId: CharacterId;
  characterName: string;
  ageGroup: AgeGroupId;
  zodiac: Zodiac;
  locale: Locale;
  scene: SceneId;
  turns: Turn[];
  ended: boolean;
  endReason?: string;
};

const KEY = "smalltalk-session";

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(s: Session): void {
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession(): void {
  window.localStorage.removeItem(KEY);
}
