"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CHARACTERS, type CharacterId, avatarUrl } from "@/lib/characters";
import { saveSession } from "@/lib/session";

export default function OnboardingPage() {
  const router = useRouter();
  const [picked, setPicked] = useState<CharacterId | null>(null);
  const [name, setName] = useState("");

  const start = () => {
    if (!picked) return;
    const finalName = name.trim() || CHARACTERS[picked].defaultName;
    saveSession({
      characterId: picked,
      characterName: finalName,
      turns: [],
      ended: false,
    });
    router.push("/scene");
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Small Talk Simulator</h1>
          <p className="mt-3 text-zinc-500">
            Practice small talk with a real person at an afterparty.
            Pick who you want to meet.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.values(CHARACTERS)).map((c) => {
            const selected = picked === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setPicked(c.id)}
                className={`text-left rounded-2xl border p-5 transition ${
                  selected
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(c.id)}
                  alt={c.defaultName}
                  className="mb-3 h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-900"
                />
                <div className="text-lg font-semibold">{c.defaultName}</div>
                <div className={`text-sm ${selected ? "opacity-80" : "text-zinc-500"}`}>
                  {c.role}
                </div>
                <p className={`mt-2 text-sm ${selected ? "opacity-80" : "text-zinc-500"}`}>
                  {c.vibe}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <label className="block text-sm font-medium">
            Give them a name (optional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={picked ? CHARACTERS[picked].defaultName : "Max or Olena"}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:focus:border-white"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={start}
          disabled={!picked}
          className="mt-8 w-full rounded-xl bg-black px-5 py-4 text-white font-medium transition disabled:opacity-40 dark:bg-white dark:text-black"
        >
          Walk up to them
        </button>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Scene: Tech afterparty. They&apos;re holding a drink and not in a rush — yet.
        </p>
      </div>
    </main>
  );
}
