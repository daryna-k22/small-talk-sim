"use client";

import { useEffect } from "react";
import type { Analytics } from "@/lib/analytics";
import { T, type Locale } from "@/lib/i18n";

type Props = {
  analytics: Analytics | null;
  loading: boolean;
  error: string | null;
  characterName: string;
  avatarUrl: string;
  locale: Locale;
  onClose: () => void;
  onTryAgain: () => void;
  onNewCharacter: () => void;
};

function scoreColor(score: number): { bg: string; glow: string } {
  if (score < 40)
    return {
      bg: "bg-gradient-to-br from-red-400 to-rose-600",
      glow: "shadow-[0_0_60px_-10px_rgba(239,68,68,0.55)]",
    };
  if (score < 70)
    return {
      bg: "bg-gradient-to-br from-amber-400 to-orange-500",
      glow: "shadow-[0_0_60px_-10px_rgba(251,146,60,0.55)]",
    };
  return {
    bg: "bg-gradient-to-br from-emerald-400 to-teal-500",
    glow: "shadow-[0_0_60px_-10px_rgba(16,185,129,0.55)]",
  };
}

function fillerTotalColor(total: number): string {
  if (total > 5) return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200";
  if (total >= 3) return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200";
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200";
}

function fillerChipColor(count: number): string {
  if (count > 2) return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100";
  if (count >= 1) return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
}

export default function AnalyticsModal({
  analytics,
  loading,
  error,
  characterName,
  avatarUrl,
  locale,
  onClose,
  onTryAgain,
  onNewCharacter,
}: Props) {
  const t = T[locale];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalFillers = analytics?.filler_words.reduce((s, f) => s + f.count, 0) ?? 0;
  const colors = analytics ? scoreColor(analytics.engagement_score) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="relative w-full max-w-[640px] max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-950 dark:ring-white/5">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-zinc-500 backdrop-blur cursor-pointer transition-all duration-300 hover:bg-zinc-100 hover:text-zinc-900 dark:bg-zinc-900/80 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          ✕
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={characterName}
              className="mb-5 h-20 w-20 rounded-full bg-zinc-100 ring-4 ring-orange-100 animate-soft-glow dark:bg-zinc-900 dark:ring-orange-500/20"
            />
            <div className="h-7 w-7 mb-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
            <div className="text-sm text-zinc-500 max-w-xs leading-relaxed">{t.aThinkingAbout(characterName)}</div>
          </div>
        )}

        {!loading && error && (
          <div className="px-6 py-16 text-center">
            <div className="mb-3 text-sm font-medium text-red-600 dark:text-red-300">{t.aCouldntLoad}</div>
            <div className="mb-6 text-xs text-zinc-500">{error}</div>
            <div className="flex justify-center gap-2">
              <button onClick={onTryAgain} className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900">
                {t.aTryAgain}
              </button>
              <button onClick={onNewCharacter} className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-orange-500/30 cursor-pointer transition-all duration-300 hover:scale-105">
                {t.aNewCharacter}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && analytics && colors && (
          <div className="p-6 sm:p-8 pb-6">
            {/* 1. Score */}
            <div className="mb-8 flex flex-col items-center text-center">
              <div className={`relative h-36 w-36 rounded-full ${colors.bg} ${colors.glow} flex items-center justify-center ring-1 ring-white/40`}>
                <span className="text-5xl font-bold text-white tracking-tight drop-shadow-sm">{analytics.engagement_score}</span>
                <span className="absolute bottom-3 text-[11px] font-medium text-white/80 tracking-wider">/100</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt={characterName}
                  className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-white ring-4 ring-white shadow-lg dark:bg-zinc-900 dark:ring-zinc-950"
                />
              </div>
              <div className="mt-5 text-lg font-medium text-zinc-900 leading-snug max-w-md dark:text-zinc-100">
                {analytics.verdict}
              </div>
            </div>

            {/* 2. Stats row */}
            <div className="mb-8 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-zinc-50 px-3 py-3 text-center border border-black/5 dark:bg-zinc-900 dark:border-white/5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{t.aTalkRatio}</div>
                <div className="mt-1 text-sm font-semibold tracking-tight">
                  {t.aTalkRatioValue(analytics.talk_ratio.user, characterName, analytics.talk_ratio.character)}
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-3 py-3 text-center border border-black/5 dark:bg-zinc-900 dark:border-white/5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{t.aCuriosity}</div>
                <div className="mt-1 text-sm font-semibold tracking-tight">{t.aQuestions(analytics.questions_asked_by_user)}</div>
              </div>
              <div className={`rounded-2xl px-3 py-3 text-center border border-black/5 dark:border-white/5 ${fillerTotalColor(totalFillers)}`}>
                <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70">{t.aFillers}</div>
                <div className="mt-1 text-sm font-semibold tracking-tight">{t.aFillersValue(totalFillers)}</div>
              </div>
            </div>

            {/* 3. Inner thought */}
            <div className="mb-8 rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-5 sm:p-6 ring-1 ring-purple-200/40 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-fuchsia-950/30 dark:ring-purple-500/20">
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt={characterName} className="h-14 w-14 flex-shrink-0 rounded-full bg-white ring-2 ring-white shadow-md dark:bg-zinc-900 dark:ring-zinc-900" />
                <div className="flex-1">
                  <div className="mb-2 text-[10px] uppercase tracking-wider font-semibold text-purple-600 dark:text-purple-300">
                    {t.aThoughtLabel(characterName)}
                  </div>
                  <blockquote className="font-display text-lg italic leading-relaxed text-zinc-900 dark:text-zinc-50">
                    “{analytics.character_inner_thought}”
                  </blockquote>
                </div>
              </div>
            </div>

            {/* 4. Best / worst */}
            <div className="mb-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50/70 p-4 dark:border-emerald-400 dark:bg-emerald-950/30">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span>✓</span> {t.aBest}
                </div>
                <blockquote className="mb-1.5 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                  &ldquo;{analytics.best_moment.user_quote}&rdquo;
                </blockquote>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">{analytics.best_moment.why}</div>
              </div>
              <div className="rounded-2xl border-l-4 border-red-500 bg-red-50/70 p-4 dark:border-red-400 dark:bg-red-950/30">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
                  <span>✗</span> {t.aWorst}
                </div>
                <blockquote className="mb-1.5 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                  &ldquo;{analytics.worst_moment.user_quote}&rdquo;
                </blockquote>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">{analytics.worst_moment.why}</div>
              </div>
            </div>

            {/* 5. Filler chips */}
            {analytics.filler_words.length > 0 && (
              <div className="mb-8">
                <div className="mb-3 text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                  {t.aFillersDetected}
                </div>
                <div className="flex flex-wrap gap-2">
                  {analytics.filler_words.map((f, i) => (
                    <span
                      key={`${f.word}-${i}`}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${fillerChipColor(f.count)}`}
                    >
                      {f.word} × {f.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Phrase upgrades */}
            {analytics.phrase_improvements.length > 0 && (
              <div className="mb-8">
                <div className="mb-3 text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                  {t.aTrySaying}
                </div>
                <div className="space-y-3">
                  {analytics.phrase_improvements.map((p, i) => (
                    <div key={i} className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 p-4 ring-1 ring-amber-200/50 dark:from-amber-950/30 dark:to-yellow-950/30 dark:ring-amber-500/20">
                      <div className="text-sm">
                        <span className="text-red-500">❌</span>{" "}
                        <span className="line-through text-zinc-500">{p.original}</span>
                      </div>
                      <div className="text-sm mt-1.5">
                        <span className="text-emerald-500">✅</span>{" "}
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{p.better}</span>
                      </div>
                      <div className="mt-2 text-xs italic text-zinc-600 dark:text-zinc-400">{p.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. CTAs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onTryAgain}
                className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3.5 text-sm font-semibold text-white shadow-xl shadow-orange-500/30 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/40 active:scale-[0.98]"
              >
                {t.aTryAgain}
              </button>
              <button
                onClick={onNewCharacter}
                className="rounded-full border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-zinc-50 hover:scale-[1.02] active:scale-[0.98] dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                {t.aNewCharacter}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
