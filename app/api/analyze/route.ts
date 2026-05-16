import { GoogleGenAI, Type } from "@google/genai";
import type { TranscriptLine } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-2.5-flash";

const UNICODE_ESCAPE = /\\u([0-9a-fA-F]{4})/g;
function deepUnescape(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(UNICODE_ESCAPE, (_, c) => String.fromCharCode(parseInt(c, 16)));
  }
  if (Array.isArray(value)) return value.map(deepUnescape);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepUnescape(v);
    return out;
  }
  return value;
}

type Body = {
  transcript: TranscriptLine[];
  characterName: string;
  characterPersona: string;
  scene: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.transcript) || body.transcript.length === 0) {
    return Response.json({ error: "transcript is required" }, { status: 400 });
  }
  const characterName = (body.characterName || "Them").trim();
  const characterPersona = (body.characterPersona || "Stranger").trim();
  const scene = (body.scene || "a tech afterparty").trim();

  const transcriptText = body.transcript
    .map((t) => (t.role === "user" ? `User: ${t.content}` : `${characterName}: ${t.content}`))
    .join("\n");

  const prompt = `Analyze this small talk conversation. USER was practicing social skills with ${characterName} (${characterPersona}) at ${scene}.

Transcript:
${transcriptText}

Return ONLY valid JSON. No markdown fences. No explanation. Just JSON.

Rules:
- Filler words to count: um, uh, like, you know, so, yeah, I mean, kind of, sort of, basically, literally
- Quote EXACT user phrases, never paraphrase
- Best/worst moments must be DIFFERENT quotes
- Phrase improvements: 2-3 items, focus on most impactful
- Be brutally honest in inner thought — that's the wow moment. Speak as ${characterName} in first person, reference what the user actually said. Not flattering. Can be savage if deserved.`;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            engagement_score: { type: Type.INTEGER },
            verdict: { type: Type.STRING },
            talk_ratio: {
              type: Type.OBJECT,
              properties: {
                user: { type: Type.INTEGER },
                character: { type: Type.INTEGER },
              },
              required: ["user", "character"],
              propertyOrdering: ["user", "character"],
            },
            questions_asked_by_user: { type: Type.INTEGER },
            filler_words: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  count: { type: Type.INTEGER },
                },
                required: ["word", "count"],
                propertyOrdering: ["word", "count"],
              },
            },
            best_moment: {
              type: Type.OBJECT,
              properties: {
                user_quote: { type: Type.STRING },
                why: { type: Type.STRING },
              },
              required: ["user_quote", "why"],
              propertyOrdering: ["user_quote", "why"],
            },
            worst_moment: {
              type: Type.OBJECT,
              properties: {
                user_quote: { type: Type.STRING },
                why: { type: Type.STRING },
              },
              required: ["user_quote", "why"],
              propertyOrdering: ["user_quote", "why"],
            },
            phrase_improvements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  better: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["original", "better", "reason"],
                propertyOrdering: ["original", "better", "reason"],
              },
            },
            character_inner_thought: { type: Type.STRING },
          },
          required: [
            "engagement_score",
            "verdict",
            "talk_ratio",
            "questions_asked_by_user",
            "filler_words",
            "best_moment",
            "worst_moment",
            "phrase_improvements",
            "character_inner_thought",
          ],
          propertyOrdering: [
            "engagement_score",
            "verdict",
            "talk_ratio",
            "questions_asked_by_user",
            "filler_words",
            "best_moment",
            "worst_moment",
            "phrase_improvements",
            "character_inner_thought",
          ],
        },
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      return Response.json({ error: "empty analytics response" }, { status: 502 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json({ error: "analytics returned invalid JSON", detail: text }, { status: 502 });
    }
    return Response.json(deepUnescape(parsed));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "gemini analyze failed", detail: message }, { status: 502 });
  }
}
