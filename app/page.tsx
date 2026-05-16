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
    <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="absolute right-4 top-4 flex gap-1 rounded-full bg-white/80 backdrop-blur px-1 py-1 shadow-sm ring-1 ring-black/5">
        {LOCALES.map((l) => {
          const active = locale === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => changeLocale(l.id)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs cursor-pointer transition-all duration-200 ${
                active
                  ? "bg-purple-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <span>{l.flag}</span>
              <span className="font-medium">{l.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-2xl animate-fade-in-up">
        <header className="mb-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Small Talk Simulator
          </h1>
          <p className="mt-3 text-base text-zinc-600 max-w-md mx-auto dark:text-zinc-400">{t.subtitle}</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {Object.values(CHARACTERS).map((c) => {
            const selected = picked === c.id;
            const label = c.id === "max" ? t.him : t.her;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setPicked(c.id)}
                className={`group flex flex-col items-center text-center rounded-3xl border bg-white p-6 cursor-pointer transition-all duration-300 ${
                  selected
                    ? "border-purple-300 ring-2 ring-purple-500 ring-offset-2 ring-offset-transparent shadow-xl shadow-purple-300/40 scale-[1.03]"
                    : "border-purple-100 shadow-xl shadow-purple-200/40 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-300/50 dark:border-purple-900/30"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(c.id)}
                  alt={label}
                  className="mb-3 h-[140px] w-[140px] rounded-full object-cover bg-zinc-100 dark:bg-zinc-800"
                />
                <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{label}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          <div className="text-sm font-medium text-zinc-700 mb-2.5 dark:text-zinc-300">{t.scene}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              className="rounded-2xl bg-purple-600 px-3 py-2.5 text-sm font-medium text-white shadow-md shadow-purple-500/30 cursor-pointer"
            >
              🥂 Afterparty
            </button>
            <button
              type="button"
              disabled
              title={t.sceneComingSoon}
              className="rounded-2xl bg-white border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-400 opacity-60 cursor-not-allowed dark:bg-zinc-900 dark:border-zinc-800"
            >
              🛗 Elevator
            </button>
            <button
              type="button"
              disabled
              title={t.sceneComingSoon}
              className="rounded-2xl bg-white border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-400 opacity-60 cursor-not-allowed dark:bg-zinc-900 dark:border-zinc-800"
            >
              💘 Tinder Date
            </button>
            <button
              type="button"
              disabled
              title={t.sceneComingSoon}
              className="rounded-2xl bg-white border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-400 opacity-60 cursor-not-allowed dark:bg-zinc-900 dark:border-zinc-800"
            >
              💼 Job Interview
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-sm font-medium text-zinc-700 mb-2.5 dark:text-zinc-300">{t.age}</div>
          <div className="flex flex-wrap gap-2">
            {AGE_GROUPS.map((g) => {
              const selected = ageGroup === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setAgeGroup(g.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-200 ${
                    selected
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                      : "bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {ageLabelFor(t, g.id)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-sm font-medium text-zinc-700 mb-2.5 dark:text-zinc-300">{t.zodiac}</div>
          <select
            value={zodiac}
            onChange={(e) => setZodiac(e.target.value as Zodiac)}
            className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm cursor-pointer outline-none transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-purple-900/50"
          >
            {ZODIACS.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <div className="text-sm font-medium text-zinc-700 mb-2.5 dark:text-zinc-300">{t.name}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-base outline-none transition-all duration-200 placeholder:text-zinc-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-purple-900/50"
          />
        </div>

        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className={`mt-7 w-full rounded-2xl py-4 px-6 text-lg font-semibold transition-all duration-300 ${
            canStart
              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30 cursor-pointer hover:bg-purple-700 hover:scale-[1.01] active:scale-[0.99]"
              : "bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500"
          }`}
        >
          {t.walkUp}
        </button>
      </div>
    </main>
  );
}
