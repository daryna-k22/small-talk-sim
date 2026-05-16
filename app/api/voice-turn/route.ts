import { GoogleGenAI, Type } from "@google/genai";
import {
  AGE_GROUPS,
  CHARACTERS,
  ZODIACS,
  type AgeGroupId,
  type CharacterId,
  type Zodiac,
} from "@/lib/characters";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-2.5-flash";

type HistoryTurn = { speaker: "user" | "character"; text: string };

const VALID_AGE_GROUPS = new Set(AGE_GROUPS.map((g) => g.id));
const VALID_ZODIACS = new Set(ZODIACS.map((z) => z.id));

const UNICODE_ESCAPE = /\\u([0-9a-fA-F]{4})/g;

const USER_GOODBYE_RE_EN =
  /\b(i\s+(need|gotta|have|got)\s+to\s+(go|leave|run)|gotta\s+(go|run)|need\s+to\s+head\s+out|bye\b|goodbye|see\s+(you|ya)|nice\s+(talking|chatting)|good\s+(talking|chatting)|catch\s+you\s+later|take\s+care|have\s+a\s+(good|nice)\s+(one|night|evening))/i;

const CHAR_GOODBYE_RE_EN =
  /\b(grab\s+(another|a)?\s*drink|see\s+my\s+friend|i'?ll\s+catch\s+you|brb|good\s+(talking|chatting)|catch\s+you\s+later|i\s+(need|gotta|have)\s+to\s+(go|run|head)|excuse\s+me)/i;

const USER_GOODBYE_RE_UK =
  /(бувай|до\s+зустріч|па-?па|побіг|треба\s+(йти|бігти)|маю\s+(йти|бігти)|приємно\s+було|на\s+цьому\s+все|ну\s+все|до\s+побачен)/i;

const CHAR_GOODBYE_RE_UK =
  /(піду|побіг|треба\s+(йти|бігти)|маю\s+йти|приємно\s+(було|поговорили)|перепрошую|вибач|зараз\s+підійду)/i;

const CANNED_GOODBYES_EN = [
  "Take care! Lovely meeting you.",
  "Same here — have a good one!",
  "Cheers, catch you around!",
];

const CANNED_GOODBYES_UK = [
  "Бувай! Було приємно поспілкуватись.",
  "Тримай п'ять — гарного вечора!",
  "До зустрічі, ще побачимось!",
];

function deepUnescape(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(UNICODE_ESCAPE, (_, code) => String.fromCharCode(parseInt(code, 16)));
  }
  if (Array.isArray(value)) {
    return value.map(deepUnescape);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepUnescape(v);
    }
    return out;
  }
  return value;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  const characterId = form.get("characterId") as CharacterId | null;
  const characterName = (form.get("characterName") as string | null) ?? "";
  const ageGroupRaw = form.get("ageGroup") as string | null;
  const zodiacRaw = form.get("zodiac") as string | null;
  const localeRaw = (form.get("locale") as string | null) ?? "en";
  const locale: Locale = localeRaw === "uk" ? "uk" : "en";
  const historyJson = (form.get("history") as string | null) ?? "[]";

  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "audio is required" }, { status: 400 });
  }
  if (!characterId || !(characterId in CHARACTERS)) {
    return Response.json({ error: "invalid characterId" }, { status: 400 });
  }
  if (!ageGroupRaw || !VALID_AGE_GROUPS.has(ageGroupRaw as AgeGroupId)) {
    return Response.json({ error: "invalid ageGroup" }, { status: 400 });
  }
  if (!zodiacRaw || !VALID_ZODIACS.has(zodiacRaw as Zodiac)) {
    return Response.json({ error: "invalid zodiac" }, { status: 400 });
  }
  const ageGroup = ageGroupRaw as AgeGroupId;
  const zodiac = zodiacRaw as Zodiac;

  let history: HistoryTurn[] = [];
  try {
    history = JSON.parse(historyJson);
  } catch {
    return Response.json({ error: "invalid history JSON" }, { status: 400 });
  }

  const character = CHARACTERS[characterId];
  const finalName = characterName.trim() || character.cardLabel;

  const buf = Buffer.from(await audio.arrayBuffer());
  const audioBase64 = buf.toString("base64");
  const mimeType = audio.type || "audio/webm";

  const historyText = history.length
    ? history
        .map((t) => (t.speaker === "user" ? `User: ${t.text}` : `${finalName}: ${t.text}`))
        .join("\n")
    : "(this is the very first thing the user says)";

  const userTurnsSoFar = history.filter((t) => t.speaker === "user").length;
  const characterTurnsSoFar = history.filter((t) => t.speaker === "character").length;
  const nextUserTurn = userTurnsSoFar + 1;

  const personaPrompt = character.systemPrompt({ name: finalName, ageGroup, zodiac });

  const languageName = locale === "uk" ? "Ukrainian" : "English";
  const fillerExamples =
    locale === "uk"
      ? '"ну", "типу", "як би", "коротше", "в принципі", "такий", "оце"'
      : '"um", "uh", "like", "you know"';

  const taskPrompt = `${personaPrompt}

LANGUAGE: The user is speaking in ${languageName}. Transcribe the audio in ${languageName}. Your character_reply MUST also be in ${languageName}. The exit_reason MUST be in ${languageName}. Stay in character regardless of language.

Conversation so far:
${historyText}

Exchange count: ${userTurnsSoFar} user messages and ${characterTurnsSoFar} of your replies have happened. This incoming audio is user message #${nextUserTurn}.
Rules: should_exit MUST be false while user message # is below 6. Between 6 and 8, only exit if user is repeatedly vague/closed-off/self-centered. By user message #10, you must find a natural reason to wrap up (should_exit=true) regardless of how it's going.

The user just said something — listen to the attached audio. Then produce a JSON response with:
- transcript: faithful transcription of what the user said, in ${languageName}.
- voice_analysis: confidence ("low"|"medium"|"high"), energy ("low"|"medium"|"high"), filler_words (array of literal fillers heard like ${fillerExamples}), notable_tone (one short sentence in English — e.g. "rehearsed", "warm", "anxious", "flat").
- character_reply: your in-character reply in ${languageName}, max 2 sentences, plain speech only.
- should_exit: true ONLY if the last two user turns (including this one) have been low-energy/vague/closed-off; otherwise false.
- exit_reason: if should_exit is true, a one-sentence in-character explanation in ${languageName}. Otherwise empty string.

Stay strictly in character as ${finalName}. Never break character. Never narrate actions.`;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: taskPrompt },
            { inlineData: { data: audioBase64, mimeType } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            voice_analysis: {
              type: Type.OBJECT,
              properties: {
                confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
                energy: { type: Type.STRING, enum: ["low", "medium", "high"] },
                filler_words: { type: Type.ARRAY, items: { type: Type.STRING } },
                notable_tone: { type: Type.STRING },
              },
              required: ["confidence", "energy", "filler_words", "notable_tone"],
              propertyOrdering: ["confidence", "energy", "filler_words", "notable_tone"],
            },
            character_reply: { type: Type.STRING },
            should_exit: { type: Type.BOOLEAN },
            exit_reason: { type: Type.STRING },
          },
          required: ["transcript", "voice_analysis", "character_reply", "should_exit", "exit_reason"],
          propertyOrdering: ["transcript", "voice_analysis", "character_reply", "should_exit", "exit_reason"],
        },
        temperature: 0.9,
      },
    });

    const text = response.text;
    if (!text) {
      return Response.json({ error: "empty response from model" }, { status: 502 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json({ error: "model returned invalid JSON", detail: text }, { status: 502 });
    }
    const decoded = deepUnescape(parsed) as {
      transcript?: string;
      character_reply?: string;
      should_exit?: boolean;
      exit_reason?: string;
      [key: string]: unknown;
    };

    const transcript = (decoded.transcript ?? "").trim();
    const characterReply = (decoded.character_reply ?? "").trim();

    const userGoodbyeRe = locale === "uk" ? USER_GOODBYE_RE_UK : USER_GOODBYE_RE_EN;
    const charGoodbyeRe = locale === "uk" ? CHAR_GOODBYE_RE_UK : CHAR_GOODBYE_RE_EN;
    const cannedGoodbyes = locale === "uk" ? CANNED_GOODBYES_UK : CANNED_GOODBYES_EN;
    const fallbackExit = locale === "uk" ? "Ви попрощались." : "You said your goodbyes.";

    if (transcript && userGoodbyeRe.test(transcript)) {
      const canned = cannedGoodbyes[Math.floor(Math.random() * cannedGoodbyes.length)];
      decoded.character_reply = canned;
      decoded.should_exit = true;
      decoded.exit_reason = decoded.exit_reason || fallbackExit;
    } else if (characterReply && charGoodbyeRe.test(characterReply)) {
      decoded.should_exit = true;
      decoded.exit_reason = decoded.exit_reason || characterReply;
    }

    return Response.json(decoded);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "gemini call failed", detail: message }, { status: 502 });
  }
}
