"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CHARACTERS, ZODIACS, avatarUrl } from "@/lib/characters";
import { loadSession, saveSession, type Session, type Turn } from "@/lib/session";
import type { Analytics, TranscriptLine } from "@/lib/analytics";
import { T, type Locale } from "@/lib/i18n";
import { SCENES, genderForCharacter } from "@/lib/scenes";
import AnalyticsModal from "@/components/AnalyticsModal";

type Status = "idle" | "recording" | "thinking" | "speaking" | "ended";

type TurnResponse = {
  transcript: string;
  voice_analysis: {
    confidence: "low" | "medium" | "high";
    energy: "low" | "medium" | "high";
    filler_words: string[];
    notable_tone: string;
  };
  character_reply: string;
  should_exit: boolean;
  exit_reason: string;
};

const SILENCE_RMS_THRESHOLD = 0.01;
const SILENCE_MAX_MS = 3000;
const SILENCE_GRACE_MS = 1500;
const VAD_POLL_MS = 100;

const MALE_VOICE_NAMES = [
  "Daniel",
  "Alex",
  "Aaron",
  "Fred",
  "Google UK English Male",
  "Microsoft Guy",
  "Microsoft Davis",
  "Microsoft Tony",
];

const FEMALE_VOICE_NAMES = [
  "Samantha",
  "Karen",
  "Victoria",
  "Google US English",
  "Microsoft Aria",
  "Microsoft Jenny",
  "Microsoft Zira",
];

const MALE_PATTERN = /\b(male|man|guy|david|john|james|daniel|alex|aaron|fred|tony|davis|anatol|ostap)\b/i;
const FEMALE_PATTERN = /\b(female|woman|girl|aria|jenny|samantha|karen|victoria|emma|zira|lesya|solomiya|polina)\b/i;

const UK_MALE_VOICE_NAMES = ["Anatol", "Ostap"];
const UK_FEMALE_VOICE_NAMES = ["Lesya", "Solomiya", "Polina"];

type VoicePick = { voice: SpeechSynthesisVoice | null; genderMatched: boolean };

function pickVoice(
  voices: SpeechSynthesisVoice[],
  isHim: boolean,
  locale: Locale,
): VoicePick {
  if (locale === "uk") {
    const uk = voices.filter((v) => v.lang.startsWith("uk"));
    if (uk.length > 0) {
      const candidates = isHim ? UK_MALE_VOICE_NAMES : UK_FEMALE_VOICE_NAMES;
      for (const name of candidates) {
        const found = uk.find((v) => v.name.includes(name));
        if (found) return { voice: found, genderMatched: true };
      }
      const heuristic = uk.find((v) =>
        isHim
          ? MALE_PATTERN.test(v.name) && !FEMALE_PATTERN.test(v.name)
          : FEMALE_PATTERN.test(v.name),
      );
      if (heuristic) return { voice: heuristic, genderMatched: true };
      return { voice: uk[0], genderMatched: false };
    }
    console.warn("No Ukrainian TTS voice available, falling back to English");
  }

  const en = voices.filter((v) => v.lang.startsWith("en-"));
  if (en.length === 0) return { voice: null, genderMatched: false };

  const candidates = isHim ? MALE_VOICE_NAMES : FEMALE_VOICE_NAMES;
  for (const name of candidates) {
    const found = en.find((v) => v.name.includes(name));
    if (found) return { voice: found, genderMatched: true };
  }

  const heuristic = en.find((v) =>
    isHim
      ? MALE_PATTERN.test(v.name) && !FEMALE_PATTERN.test(v.name)
      : FEMALE_PATTERN.test(v.name),
  );
  if (heuristic) return { voice: heuristic, genderMatched: true };

  return { voice: en.find((v) => v.lang === "en-US") ?? en[0], genderMatched: false };
}

function speakReply(text: string, isHim: boolean, locale: Locale): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    const synth = window.speechSynthesis;

    const trySpeak = () => {
      const { voice, genderMatched } = pickVoice(synth.getVoices(), isHim, locale);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale === "uk" && voice?.lang.startsWith("uk") ? "uk-UA" : "en-US";
      utterance.rate = 1.0;
      // When the available voice doesn't match the character's gender (most
      // commonly UK on Mac where only Lesya is installed), shift pitch as a
      // perceptual hack so Him and Her sound distinguishable.
      if (!genderMatched) {
        utterance.pitch = isHim ? 0.7 : 1.15;
      } else {
        utterance.pitch = 1.0;
      }
      if (voice) utterance.voice = voice;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    };

    if (synth.getVoices().length > 0) {
      trySpeak();
      return;
    }
    let fired = false;
    const handler = () => {
      if (fired) return;
      fired = true;
      synth.removeEventListener("voiceschanged", handler);
      trySpeak();
    };
    synth.addEventListener("voiceschanged", handler);
    setTimeout(() => {
      if (fired) return;
      fired = true;
      synth.removeEventListener("voiceschanged", handler);
      trySpeak();
    }, 1500);
  });
}

export default function ScenePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyticsRequestedRef = useRef(false);
  const openingPlayedRef = useRef(false);

  useEffect(() => {
    const s = loadSession();
    if (!s || !s.ageGroup || !s.zodiac) {
      if (typeof window !== "undefined") window.localStorage.removeItem("smalltalk-session");
      router.replace("/");
      return;
    }
    const hydrated: Session = {
      ...s,
      locale: s.locale ?? "en",
      scene: s.scene ?? "afterparty",
    };
    setSession(hydrated);
    if (hydrated.ended) setStatus("ended");
  }, [router]);

  const fetchAnalytics = async (sessionForAnalytics: Session) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const transcript: TranscriptLine[] = sessionForAnalytics.turns.map((t) => ({
        role: t.speaker,
        content: t.text,
      }));
      const persona = CHARACTERS[sessionForAnalytics.characterId].role;
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript,
          characterName: sessionForAnalytics.characterName,
          characterPersona: persona,
          scene: sessionForAnalytics.scene,
          locale: sessionForAnalytics.locale,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const data = (await res.json()) as Analytics;
      setAnalytics(data);
    } catch (e) {
      setAnalyticsError(e instanceof Error ? e.message : "analytics failed");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "ended" || !session || analyticsRequestedRef.current) return;
    if (session.turns.length === 0) return;
    analyticsRequestedRef.current = true;
    void fetchAnalytics(session);
  }, [status, session]);

  useEffect(() => {
    if (!session || openingPlayedRef.current) return;
    if (session.ended) {
      openingPlayedRef.current = true;
      return;
    }
    if (session.turns.length > 0) {
      openingPlayedRef.current = true;
      return;
    }
    const sceneDef = SCENES[session.scene];
    if (!sceneDef.openings) {
      openingPlayedRef.current = true;
      return;
    }
    openingPlayedRef.current = true;
    const gender = genderForCharacter(session.characterId);
    const opening = sceneDef.openings[gender][session.locale];
    const charTurn: Turn = { speaker: "character", text: opening };
    const updated: Session = { ...session, turns: [charTurn] };
    setSession(updated);
    saveSession(updated);
    setStatus("speaking");
    void speakReply(opening, session.characterId === "max", session.locale).finally(() => {
      setStatus("idle");
    });
  }, [session]);

  const cleanupRecording = () => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const stopRecording = () => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
      setStatus("thinking");
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        cleanupRecording();
        void sendTurn(blob);
      };
      recorderRef.current = mr;

      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) {
        const ctx = new AudioCtor();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        const startedAt = Date.now();
        let silentSince: number | null = null;

        vadIntervalRef.current = setInterval(() => {
          analyser.getFloatTimeDomainData(buf);
          let sumSq = 0;
          for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
          const rms = Math.sqrt(sumSq / buf.length);
          const elapsed = Date.now() - startedAt;
          if (elapsed < SILENCE_GRACE_MS) return;
          if (rms < SILENCE_RMS_THRESHOLD) {
            if (silentSince === null) silentSince = Date.now();
            else if (Date.now() - silentSince >= SILENCE_MAX_MS) {
              stopRecording();
            }
          } else {
            silentSince = null;
          }
        }, VAD_POLL_MS);
      }

      mr.start();
      setStatus("recording");
    } catch (e) {
      cleanupRecording();
      setError(e instanceof Error ? e.message : "microphone access failed");
      setStatus("idle");
    }
  };

  const sendTurn = async (audioBlob: Blob) => {
    if (!session) return;
    try {
      const form = new FormData();
      form.append("audio", audioBlob, "turn.webm");
      form.append("characterId", session.characterId);
      form.append("characterName", session.characterName);
      form.append("ageGroup", session.ageGroup);
      form.append("zodiac", session.zodiac);
      form.append("locale", session.locale);
      form.append("scene", session.scene);
      form.append(
        "history",
        JSON.stringify(session.turns.map((t) => ({ speaker: t.speaker, text: t.text }))),
      );

      const res = await fetch("/api/voice-turn", { method: "POST", body: form });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API error: ${txt}`);
      }
      const data = (await res.json()) as TurnResponse;

      const userTurn: Turn = {
        speaker: "user",
        text: data.transcript,
        voiceAnalysis: {
          confidence: data.voice_analysis.confidence,
          energy: data.voice_analysis.energy,
          fillerWords: data.voice_analysis.filler_words,
          notableTone: data.voice_analysis.notable_tone,
        },
      };
      const charTurn: Turn = { speaker: "character", text: data.character_reply };

      const ended = data.should_exit === true;
      const updated: Session = {
        ...session,
        turns: [...session.turns, userTurn, charTurn],
        ended,
        endReason: ended ? data.exit_reason : undefined,
      };
      setSession(updated);
      saveSession(updated);

      setStatus("speaking");
      await speakReply(data.character_reply, session.characterId === "max", session.locale);
      if (ended) {
        setStatus("ended");
      } else {
        setStatus("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "voice turn failed");
      setStatus("idle");
    }
  };

  const handleNewCharacter = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem("smalltalk-session");
    router.push("/");
  };

  const handleTryAgain = () => {
    if (!session) return;
    const fresh: Session = {
      characterId: session.characterId,
      characterName: session.characterName,
      ageGroup: session.ageGroup,
      zodiac: session.zodiac,
      locale: session.locale,
      scene: session.scene,
      turns: [],
      ended: false,
    };
    saveSession(fresh);
    setSession(fresh);
    setStatus("idle");
    setAnalytics(null);
    setAnalyticsError(null);
    setAnalyticsLoading(false);
    analyticsRequestedRef.current = false;
    openingPlayedRef.current = false;
  };

  if (!session) {
    return <main className="flex-1 flex items-center justify-center text-zinc-500">Loading…</main>;
  }

  const t = T[session.locale];
  const ageLabel =
    session.ageGroup === "young" ? t.ageYoung : session.ageGroup === "mid" ? t.ageMid : t.ageOlder;
  const zodiacLabel = ZODIACS.find((z) => z.id === session.zodiac)?.label ?? session.zodiac;
  const sceneDef = SCENES[session.scene];
  const sceneLabel = `${sceneDef.emoji} ${sceneDef.labels[session.locale]}`;
  const showModal = status === "ended" && session.turns.length > 0;

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-2xl mx-auto w-full animate-fade-in-up">
      <header className="flex items-center gap-3 mb-6 rounded-2xl bg-white px-4 py-3 shadow-md dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl(session.characterId)} alt={session.characterName} className="h-12 w-12 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800" />
        <div className="min-w-0">
          <div className="font-bold tracking-tight truncate text-zinc-900 dark:text-zinc-50">{session.characterName}</div>
          <div className="text-sm text-zinc-500 truncate">{ageLabel} · {zodiacLabel} · {sceneLabel}</div>
        </div>
        <button onClick={handleNewCharacter} className="ml-auto text-xs font-medium text-zinc-500 cursor-pointer rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
          {t.restart}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1">
        {session.turns.length === 0 && (
          <div className="text-center text-sm text-zinc-500 py-12 max-w-xs mx-auto leading-relaxed">
            {t.emptyState}
          </div>
        )}
        {session.turns.map((turn, i) => (
          <div key={i} className={`flex animate-fade-in-up ${turn.speaker === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-3xl px-5 py-3 text-sm leading-relaxed ${
                turn.speaker === "user"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                  : "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
              }`}
            >
              {turn.text}
            </div>
          </div>
        ))}
        {status === "thinking" && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="rounded-3xl bg-white px-5 py-3 text-sm text-zinc-400 shadow-sm dark:bg-zinc-900">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {status !== "ended" && (
        <div className="flex flex-col items-center gap-3 pb-2">
          <button
            onClick={status === "recording" ? stopRecording : startRecording}
            disabled={status === "thinking" || status === "speaking"}
            aria-label={status === "recording" ? t.stop : t.talk}
            className={`relative flex items-center justify-center h-20 w-20 rounded-full text-white cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              status === "recording"
                ? "bg-red-500 shadow-xl shadow-red-500/40 before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-red-500 before:animate-ping before:opacity-30"
                : status === "idle"
                ? "bg-purple-600 shadow-xl shadow-purple-500/40 hover:bg-purple-700 hover:scale-105 active:scale-95"
                : "bg-zinc-400 shadow-lg"
            }`}
          >
            {status === "recording" ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            )}
          </button>
          <div className="text-xs text-zinc-500 h-4 font-medium">
            {status === "recording" && t.recordingHint}
            {status === "thinking" && t.thinkingHint}
            {status === "speaking" && t.speakingHint}
            {status === "idle" && t.tapToSpeak}
          </div>
        </div>
      )}

      {showModal && (
        <AnalyticsModal
          analytics={analytics}
          loading={analyticsLoading}
          error={analyticsError}
          characterName={session.characterName}
          avatarUrl={avatarUrl(session.characterId)}
          locale={session.locale}
          onClose={handleNewCharacter}
          onTryAgain={handleTryAgain}
          onNewCharacter={handleNewCharacter}
        />
      )}
    </main>
  );
}
