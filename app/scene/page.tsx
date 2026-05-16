"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CHARACTERS, avatarUrl } from "@/lib/characters";
import { loadSession, saveSession, type Session, type Turn } from "@/lib/session";

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

export default function ScenePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

  const speakReply = (text: string, voicePref: "max" | "olena") =>
    new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = voicePref === "max" ? 0.85 : 1.15;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        voicePref === "max"
          ? /male|daniel|alex/i.test(v.name)
          : /female|samantha|karen|victoria/i.test(v.name),
      );
      if (preferred) utterance.voice = preferred;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });

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
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        void sendTurn(blob);
      };
      recorderRef.current = mr;
      mr.start();
      setStatus("recording");
    } catch (e) {
      setError(e instanceof Error ? e.message : "microphone access failed");
      setStatus("idle");
    }
  };

  const stopRecording = () => {
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
      setStatus("thinking");
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
      await speakReply(data.character_reply, session.characterId);
      if (ended) {
        const exitLine = data.exit_reason || "They walked away.";
        await speakReply(exitLine, session.characterId);
        setStatus("ended");
      } else {
        setStatus("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "voice turn failed");
      setStatus("idle");
    }
  };

  const restart = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem("smalltalk-session");
    router.push("/");
  };

  if (!session) {
    return <main className="flex-1 flex items-center justify-center text-zinc-500">Loading…</main>;
  }

  const character = CHARACTERS[session.characterId];

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex items-center gap-3 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl(session.characterId)} alt={session.characterName} className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-900" />
        <div>
          <div className="font-semibold">{session.characterName}</div>
          <div className="text-xs text-zinc-500">{character.role} · Afterparty</div>
        </div>
        <button onClick={restart} className="ml-auto text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
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

      {status === "ended" ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
            <span className="font-semibold">{session.characterName} left.</span>{" "}
            {session.endReason}
          </div>
          <button
            disabled
            className="w-full rounded-xl bg-zinc-300 px-5 py-4 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500"
          >
            Results screen (coming in hour 3)
          </button>
          <button
            onClick={restart}
            className="w-full rounded-xl border border-zinc-300 px-5 py-4 dark:border-zinc-700"
          >
            Try again
          </button>
        </div>
      ) : (
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
            {status === "recording" && "Recording…"}
            {status === "thinking" && "Listening to you…"}
            {status === "speaking" && "They're replying…"}
            {status === "idle" && "Tap to speak"}
          </div>
        </div>
      )}
    </main>
  );
}
