"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AGE_GROUPS,
  CHARACTERS,
  ZODIACS,
  avatarUrl,
  type AgeGroupId,
  type CharacterId,
  type Zodiac,
} from "@/lib/characters";
import { saveSession } from "@/lib/session";
import { LOCALES, T, getLocale, setLocale, type Locale } from "@/lib/i18n";

function ageLabelFor(t: (typeof T)["en"], id: AgeGroupId): string {
  if (id === "young") return t.ageYoung;
  if (id === "mid") return t.ageMid;
  return t.ageOlder;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>("en");
  const [picked, setPicked] = useState<CharacterId | null>(null);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroupId>("young");
  const [zodiac, setZodiac] = useState<Zodiac>("aries");

  useEffect(() => {
    setLocaleState(getLocale());
    const random = ZODIACS[Math.floor(Math.random() * ZODIACS.length)].id;
    setZodiac(random);
  }, []);

  const t = T[locale];

  const changeLocale = (l: Locale) => {
    setLocaleState(l);
    setLocale(l);
  };

  const trimmedName = name.trim();
  const canStart = picked !== null && trimmedName.length > 0;

  const start = () => {
    if (!picked || !trimmedName) return;
    saveSession({
      characterId: picked,
      characterName: trimmedName,
      ageGroup,
      zodiac,
      locale,
      turns: [],
      ended: false,
    });
    router.push("/scene");
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-2xl animate-fade-in-up">
        <div className="mb-6 flex justify-center gap-1">
          {LOCALES.map((l) => {
            const active = locale === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => changeLocale(l.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs cursor-pointer transition-all duration-300 ${
                  active
                    ? "bg-black text-white shadow-md dark:bg-white dark:text-black"
                    : "bg-white/60 text-zinc-600 hover:bg-white hover:shadow-sm border border-black/5 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>

        <header className="mb-8 text-center">
          <div className="text-[10px] font-medium tracking-[0.2em] text-zinc-500 uppercase mb-3">
            Voice-first · AI-powered
          </div>
          <h1 className="font-display text-5xl md:text-6xl leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50">
            Small Talk Simulator
          </h1>
          <p className="mt-4 text-base text-zinc-500 max-w-md mx-auto leading-relaxed">{t.subtitle}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {Object.values(CHARACTERS).map((c) => {
            const selected = picked === c.id;
            const label = c.id === "max" ? t.him : t.her;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setPicked(c.id)}
                className={`group flex flex-col items-center text-center rounded-3xl border bg-white p-5 cursor-pointer transition-all duration-300 dark:bg-zinc-900 ${
                  selected
                    ? "border-orange-300 ring-2 ring-orange-400 ring-offset-2 ring-offset-transparent shadow-xl shadow-orange-500/10 scale-[1.02]"
                    : "border-black/5 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.02] hover:border-black/10 dark:border-white/5 dark:hover:border-white/10"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(c.id)}
                  alt={label}
                  className="mb-3 h-20 w-20 rounded-full object-cover bg-zinc-100 transition-transform duration-300 group-hover:scale-105 dark:bg-zinc-800"
                />
                <div className="text-lg font-semibold tracking-tight">{label}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase mb-2.5">{t.age}</div>
          <div className="grid grid-cols-3 gap-2">
            {AGE_GROUPS.map((g) => {
              const selected = ageGroup === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setAgeGroup(g.id)}
                  className={`rounded-2xl border px-3 py-2.5 text-sm font-medium cursor-pointer transition-all duration-300 ${
                    selected
                      ? "border-orange-300 bg-orange-50 text-orange-900 shadow-sm dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200"
                      : "border-black/5 bg-white text-zinc-700 hover:border-black/10 hover:shadow-sm dark:border-white/5 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white/10"
                  }`}
                >
                  {ageLabelFor(t, g.id)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase mb-2.5">{t.zodiac}</div>
          <select
            value={zodiac}
            onChange={(e) => setZodiac(e.target.value as Zodiac)}
            className="w-full rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm cursor-pointer outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-200 dark:border-white/5 dark:bg-zinc-900 dark:focus:ring-orange-500/30"
          >
            {ZODIACS.map((z) => (
              <option key={z.id} value={z.id} className="bg-white dark:bg-zinc-900">
                {z.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase mb-2.5">{t.name}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="w-full rounded-2xl border border-black/5 bg-white px-4 py-3 text-base outline-none transition-all duration-300 placeholder:text-zinc-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-200 dark:border-white/5 dark:bg-zinc-900 dark:focus:ring-orange-500/30"
          />
        </div>

        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className={`mt-7 w-full rounded-full px-5 py-4 text-base font-semibold tracking-tight transition-all duration-300 ${
            canStart
              ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-xl shadow-orange-500/30 cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/40 active:scale-[0.98]"
              : "bg-gradient-to-r from-zinc-200 to-zinc-300 text-zinc-500 cursor-not-allowed dark:from-zinc-800 dark:to-zinc-700 dark:text-zinc-500"
          }`}
        >
          {t.walkUp}
        </button>
      </div>
    </main>
  );
}
