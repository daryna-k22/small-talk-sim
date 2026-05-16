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

export default function OnboardingPage() {
  const router = useRouter();
  const [picked, setPicked] = useState<CharacterId | null>(null);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroupId>("young");
  const [zodiac, setZodiac] = useState<Zodiac>("aries");

  useEffect(() => {
    const random = ZODIACS[Math.floor(Math.random() * ZODIACS.length)].id;
    setZodiac(random);
  }, []);

  const trimmedName = name.trim();
  const canStart = picked !== null && trimmedName.length > 0;

  const start = () => {
    if (!picked || !trimmedName) return;
    saveSession({
      characterId: picked,
      characterName: trimmedName,
      ageGroup,
      zodiac,
      turns: [],
      ended: false,
    });
    router.push("/scene");
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-2xl">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Small Talk Simulator</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Practice small talk at a tech afterparty. Who are you walking up to?
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {Object.values(CHARACTERS).map((c) => {
            const selected = picked === c.id;
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
                  alt={c.cardLabel}
                  className="mb-2 h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-900"
                />
                <div className="text-base font-semibold">{c.cardLabel}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="text-xs font-medium text-zinc-500 mb-2">Age</div>
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
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-zinc-500 mb-2">Zodiac</div>
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
          <label className="block text-xs font-medium text-zinc-500 mb-2">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Give them a name"
            className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-base outline-none focus:border-black dark:border-zinc-700 dark:focus:border-white"
          />
        </div>

        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="mt-6 w-full rounded-xl bg-black px-5 py-3 text-white font-medium transition disabled:opacity-40 dark:bg-white dark:text-black"
        >
          Walk up to them
        </button>
      </div>
    </main>
  );
}
