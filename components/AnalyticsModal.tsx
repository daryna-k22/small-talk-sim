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

function scoreColor(score: number): { bg: string; ring: string; text: string } {
  if (score < 40) return { bg: "bg-red-500", ring: "ring-red-200 dark:ring-red-900", text: "text-red-600 dark:text-red-300" };
  if (score < 70) return { bg: "bg-amber-500", ring: "ring-amber-200 dark:ring-amber-900", text: "text-amber-600 dark:text-amber-300" };
  return { bg: "bg-emerald-500", ring: "ring-emerald-200 dark:ring-emerald-900", text: "text-emerald-600 dark:text-emerald-300" };
}

function fillerTotalColor(total: number): string {
  if (total > 5) return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200";
  if (total >= 3) return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200";
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200";
}

function fillerChipColor(count: number): string {
  if (count > 2) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
  if (count >= 1) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-zinc-950">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          ✕
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt={characterName} className="mb-4 h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-8 w-8 mb-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100" />
            <div className="text-sm text-zinc-500">{t.aThinkingAbout(characterName)}</div>
          </div>
        )}

        {!loading && error && (
          <div className="px-6 py-12 text-center">
            <div className="mb-3 text-sm font-medium text-red-600 dark:text-red-300">{t.aCouldntLoad}</div>
            <div className="mb-6 text-xs text-zinc-500">{error}</div>
            <div className="flex justify-center gap-2">
              <button onClick={onTryAgain} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700">
                {t.aTryAgain}
              </button>
              <button onClick={onNewCharacter} className="rounded-xl bg-black px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
                {t.aNewCharacter}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && analytics && colors && (
          <div className="p-6 pb-4">
            {/* 1. Score */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className={`relative h-32 w-32 rounded-full ${colors.bg} ring-8 ${colors.ring} flex items-center justify-center`}>
                <span className="text-4xl font-bold text-white">{analytics.engagement_score}</span>
                <span className="absolute bottom-2 text-xs font-medium text-white/80">/100</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt={characterName} className="-mt-6 ml-24 h-10 w-10 rounded-full ring-2 ring-white bg-zinc-100 dark:bg-zinc-900 dark:ring-zinc-950" />
              <div className="mt-3 text-base font-medium text-zinc-900 dark:text-zinc-100">{analytics.verdict}</div>
            </div>

            {/* 2. Stats row */}
            <div className="mb-6 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-zinc-100 px-3 py-2 text-center dark:bg-zinc-900">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">{t.aTalkRatio}</div>
                <div className="text-sm font-semibold">
                  {t.aTalkRatioValue(analytics.talk_ratio.user, characterName, analytics.talk_ratio.character)}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-100 px-3 py-2 text-center dark:bg-zinc-900">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">{t.aCuriosity}</div>
                <div className="text-sm font-semibold">{t.aQuestions(analytics.questions_asked_by_user)}</div>
              </div>
              <div className={`rounded-xl px-3 py-2 text-center ${fillerTotalColor(totalFillers)}`}>
                <div className="text-[10px] uppercase tracking-wide opacity-70">{t.aFillers}</div>
                <div className="text-sm font-semibold">{t.aFillersValue(totalFillers)}</div>
              </div>
            </div>

            {/* 3. Inner thought (most prominent block) */}
            <div className="mb-6 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 p-5 dark:from-zinc-900 dark:to-zinc-900/40">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt={characterName} className="h-12 w-12 flex-shrink-0 rounded-full bg-white dark:bg-zinc-950" />
                <div className="flex-1">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
                    {t.aThoughtLabel(characterName)}
                  </div>
                  <blockquote className="text-base italic leading-relaxed text-zinc-900 dark:text-zinc-100">
                    “{analytics.character_inner_thought}”
                  </blockquote>
                </div>
              </div>
            </div>

            {/* 4. Best / worst moments */}
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50/40 p-3 dark:bg-emerald-950/30">
                <div className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <span>✓</span> {t.aBest}
                </div>
                <blockquote className="mb-1 text-sm text-zinc-900 dark:text-zinc-100">
                  &ldquo;{analytics.best_moment.user_quote}&rdquo;
                </blockquote>
                <div className="text-xs text-zinc-500">{analytics.best_moment.why}</div>
              </div>
              <div className="rounded-xl border-l-4 border-red-500 bg-red-50/40 p-3 dark:bg-red-950/30">
                <div className="mb-1 flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300">
                  <span>✗</span> {t.aWorst}
                </div>
                <blockquote className="mb-1 text-sm text-zinc-900 dark:text-zinc-100">
                  &ldquo;{analytics.worst_moment.user_quote}&rdquo;
                </blockquote>
                <div className="text-xs text-zinc-500">{analytics.worst_moment.why}</div>
              </div>
            </div>

            {/* 5. Filler words breakdown */}
            {analytics.filler_words.length > 0 && (
              <div className="mb-6">
                <div className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  {t.aFillersDetected}
                </div>
                <div className="flex flex-wrap gap-2">
                  {analytics.filler_words.map((f, i) => (
                    <span
                      key={`${f.word}-${i}`}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${fillerChipColor(f.count)}`}
                    >
                      {f.word} × {f.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Phrase upgrades */}
            {analytics.phrase_improvements.length > 0 && (
              <div className="mb-6">
                <div className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  {t.aTrySaying}
                </div>
                <div className="space-y-3">
                  {analytics.phrase_improvements.map((p, i) => (
                    <div key={i} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                      <div className="text-sm">
                        <span className="text-red-500">❌</span>{" "}
                        <span className="line-through text-zinc-500">{p.original}</span>
                      </div>
                      <div className="text-sm mt-1">
                        <span className="text-emerald-500">✅</span>{" "}
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">{p.better}</span>
                      </div>
                      <div className="mt-1 text-xs italic text-zinc-500">{p.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. CTAs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onTryAgain}
                className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                {t.aTryAgain}
              </button>
              <button
                onClick={onNewCharacter}
                className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium dark:border-zinc-700"
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
