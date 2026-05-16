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
      <div className="w-full max-w-2xl">
        <div className="mb-4 flex justify-center gap-1">
          {LOCALES.map((l) => {
            const active = locale === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => changeLocale(l.id)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
                  active
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>

        <header className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Small Talk Simulator</h1>
          <p className="mt-2 text-sm text-zinc-500">{t.subtitle}</p>
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
                className={`flex flex-col items-center text-center rounded-2xl border p-4 transition ${
                  selected
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(c.id)}
                  alt={label}
                  className="mb-2 h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-900"
                />
                <div className="text-base font-semibold">{label}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="text-xs font-medium text-zinc-500 mb-2">{t.age}</div>
          <div className="grid grid-cols-3 gap-2">
            {AGE_GROUPS.map((g) => {
              const selected = ageGroup === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setAgeGroup(g.id)}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    selected
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  }`}
                >
                  {ageLabelFor(t, g.id)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-zinc-500 mb-2">{t.zodiac}</div>
          <select
            value={zodiac}
            onChange={(e) => setZodiac(e.target.value as Zodiac)}
            className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-zinc-700 dark:focus:border-white"
          >
            {ZODIACS.map((z) => (
              <option key={z.id} value={z.id} className="bg-white dark:bg-black">
                {z.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-zinc-500 mb-2">{t.name}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-base outline-none focus:border-black dark:border-zinc-700 dark:focus:border-white"
          />
        </div>

        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="mt-6 w-full rounded-xl bg-black px-5 py-3 text-white font-medium transition disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {t.walkUp}
        </button>
      </div>
    </main>
  );
}
