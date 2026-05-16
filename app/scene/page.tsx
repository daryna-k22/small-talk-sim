"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CHARACTERS, avatarUrl } from "@/lib/characters";
import { loadSession, saveSession, type Session, type Turn } from "@/lib/session";
import type { Analytics, TranscriptLine } from "@/lib/analytics";
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

function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => v.lang.startsWith("en-"));
  if (en.length === 0) return null;
  return (
    en.find((v) => /samantha/i.test(v.name)) ??
    en.find((v) => /google.*us english/i.test(v.name)) ??
    en.find((v) => /microsoft.*(aria|jenny)/i.test(v.name)) ??
    en.find((v) => v.lang === "en-US") ??
    en[0]
  );
}

function speakReply(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    const synth = window.speechSynthesis;

    const trySpeak = () => {
      const voice = pickEnglishVoice(synth.getVoices());
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
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

  useEffect(() => {
    const s = loadSession();
    if (!s || !s.ageGroup || !s.zodiac) {
      if (typeof window !== "undefined") window.localStorage.removeItem("smalltalk-session");
      router.replace("/");
      return;
    }
    setSession(s);
    if (s.ended) setStatus("ended");
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
          scene: "a tech afterparty",
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
      await speakReply(data.character_reply);
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
  };

  if (!session) {
    return <main className="flex-1 flex items-center justify-center text-zinc-500">Loading…</main>;
  }

  const character = CHARACTERS[session.characterId];
  const showModal = status === "ended" && session.turns.length > 0;

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex items-center gap-3 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl(session.characterId)} alt={session.characterName} className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-900" />
        <div>
          <div className="font-semibold">{session.characterName}</div>
          <div className="text-xs text-zinc-500">{character.role} · Afterparty</div>
        </div>
        <button onClick={handleNewCharacter} className="ml-auto text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Restart
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 mb-6">
        {session.turns.length === 0 && (
          <div className="text-center text-sm text-zinc-500 py-12">
            Tap the mic to say hi. They&apos;re right in front of you.
          </div>
        )}
        {session.turns.map((t, i) => (
          <div key={i} className={`flex ${t.speaker === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                t.speaker === "user"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}
        {status === "thinking" && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm text-zinc-400 dark:bg-zinc-900">…</div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {status !== "ended" && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={status === "recording" ? stopRecording : startRecording}
            disabled={status === "thinking" || status === "speaking"}
            className={`h-20 w-20 rounded-full text-white text-sm font-medium transition disabled:opacity-50 ${
              status === "recording"
                ? "bg-red-500 animate-pulse"
                : "bg-black dark:bg-white dark:text-black"
            }`}
          >
            {status === "recording" ? "Stop" : status === "speaking" ? "…" : "Talk"}
          </button>
          <div className="text-xs text-zinc-500 h-4">
            {status === "recording" && "Recording… (auto-stops after 3s silence)"}
            {status === "thinking" && "Listening to you…"}
            {status === "speaking" && "They're replying…"}
            {status === "idle" && "Tap to speak"}
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
          onClose={handleNewCharacter}
          onTryAgain={handleTryAgain}
          onNewCharacter={handleNewCharacter}
        />
      )}
    </main>
  );
}
