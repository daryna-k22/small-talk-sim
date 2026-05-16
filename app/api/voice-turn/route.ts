import { GoogleGenAI, Type } from "@google/genai";
import { CHARACTERS, type CharacterId } from "@/lib/characters";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-2.5-flash";

type HistoryTurn = { speaker: "user" | "character"; text: string };

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  const characterId = form.get("characterId") as CharacterId | null;
  const characterName = (form.get("characterName") as string | null) ?? "";
  const historyJson = (form.get("history") as string | null) ?? "[]";

  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "audio is required" }, { status: 400 });
  }
  if (!characterId || !(characterId in CHARACTERS)) {
    return Response.json({ error: "invalid characterId" }, { status: 400 });
  }

  let history: HistoryTurn[] = [];
  try {
    history = JSON.parse(historyJson);
  } catch {
    return Response.json({ error: "invalid history JSON" }, { status: 400 });
  }

  const character = CHARACTERS[characterId];
  const finalName = characterName.trim() || character.defaultName;

  const buf = Buffer.from(await audio.arrayBuffer());
  const audioBase64 = buf.toString("base64");
  const mimeType = audio.type || "audio/webm";

  const historyText = history.length
    ? history.map((t) => (t.speaker === "user" ? `User: ${t.text}` : `${finalName}: ${t.text}`)).join("\n")
    : "(this is the very first thing the user says)";

  const taskPrompt = `${character.systemPrompt(finalName)}

Conversation so far:
${historyText}

The user just said something — listen to the attached audio. Then produce a JSON response with:
- transcript: faithful transcription of what the user said (English).
- voice_analysis: confidence ("low"|"medium"|"high"), energy ("low"|"medium"|"high"), filler_words (array of literal fillers heard like "um", "uh", "like", "you know"), notable_tone (one short sentence — e.g. "rehearsed", "warm", "anxious", "flat").
- character_reply: your in-character reply, max 2 sentences, plain speech only.
- should_exit: true ONLY if the last two user turns (including this one) have been low-energy/vague/closed-off; otherwise false.
- exit_reason: if should_exit is true, a one-sentence in-character explanation. Otherwise empty string.

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
    return new Response(text, {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "gemini call failed", detail: message }, { status: 502 });
  }
}
