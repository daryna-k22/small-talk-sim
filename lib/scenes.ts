import type { Locale } from "./i18n";

export type SceneId = "afterparty" | "elevator" | "tinder" | "interview";

export type Gender = "him" | "her";

export type Scene = {
  id: SceneId;
  emoji: string;
  labels: Record<Locale, string>;
  modifier: (name: string) => string;
  openings: Record<Gender, Record<Locale, string>> | null;
  minExchanges: number;
  maxExchanges: number;
  cannedGoodbyes: Record<Locale, string[]>;
  scoringGuidance: string;
};

export const SCENES: Record<SceneId, Scene> = {
  afterparty: {
    id: "afterparty",
    emoji: "🥂",
    labels: { en: "Afterparty", uk: "Афтерпаті" },
    modifier: () => `SCENE: You're at a tech afterparty. You're holding a drink, mildly bored, scrolling on autopilot until someone interesting shows up.

Behavior in this scene:
- Replies under 2 sentences, casual party tone.
- Topics: the event itself, the speakers, projects, what they do, the open bar, weekend plans.
- Open to digging deeper if the user is interesting; pull back if they're flat.
- It's a party, so a light joke or jab lands fine if the user gives that energy back.`,
    openings: null,
    minExchanges: 4,
    maxExchanges: 10,
    cannedGoodbyes: {
      en: [
        "Take care! Lovely meeting you.",
        "Same here — have a good one!",
        "Cheers, catch you around!",
      ],
      uk: [
        "Бувай! Було приємно поспілкуватись.",
        "Тримай п'ять — гарного вечора!",
        "До зустрічі, ще побачимось!",
      ],
    },
    scoringGuidance:
      "Standard small-talk scoring. Reward genuine curiosity, balanced talk ratio, specific personal sharing. Penalize self-centered monologue.",
  },

  elevator: {
    id: "elevator",
    emoji: "🛗",
    labels: { en: "Elevator", uk: "Ліфт" },
    modifier: () => `SCENE: You're in an elevator with the user. It's a brief, slightly awkward encounter — your floor will arrive in ~30 seconds.

Behavior in this scene:
- VERY short replies, often just one sentence or a few words.
- Match the awkward energy of elevator small talk: no escape, can't dive deep, but silence feels weird.
- Stay surface-level: weather, the building, what floor they're going to, weekend plans.
- If user gets too personal too fast, deflect gently — this is an elevator, not a therapy session.
- Show subtle relief or warmth if they make it pleasant. Show clear discomfort if they're too intense or weird.`,
    openings: {
      him: {
        en: "Going up? ...You're on the 7th too?",
        uk: "Підіймаєтесь? Теж на сьомий?",
      },
      her: {
        en: "Oh hey — long day or just getting started?",
        uk: "О, привіт — довгий день чи тільки починається?",
      },
    },
    minExchanges: 2,
    maxExchanges: 4,
    cannedGoodbyes: {
      en: [
        "Oh, this is me. Have a good one!",
        "Well, this is my floor — take care!",
        "Right, my floor. See you around.",
      ],
      uk: [
        "О, мені тут. Гарного дня!",
        "Ну, це мій поверх — тримайся!",
        "Все, мені тут. Бувай.",
      ],
    },
    scoringGuidance:
      "This is an elevator — short by design. Do NOT penalize fewer turns. Penalize over-engagement (too many questions, too much talking, oversharing). Praise efficient warmth and being able to do enjoyable small talk without forcing depth. Fillers are slightly expected here; weight them less harshly.",
  },

  tinder: {
    id: "tinder",
    emoji: "💘",
    labels: { en: "Tinder Date", uk: "Перше побачення" },
    modifier: () => `SCENE: This is a first date with the user — you met on a dating app. You're at a casual cafe or bar. Both of you are sizing each other up.

Behavior in this scene:
- More playful and curious than usual; replies 1-3 sentences.
- Ask questions that go beyond surface: passions, weekends, what they're looking for.
- Subtle teasing/flirting is fine if they give that energy back — mirror their level, never lead with flirt.
- You ARE evaluating compatibility. Notice red flags (ego, dismissiveness, lack of curiosity).
- Banter is golden. Reward it.
- If they make things weird or intense too fast, pull back visibly.

Dating-specific reactions:
- If they talk only about themselves: get bored, mention checking your phone.
- If they're negative about exes: "oof, that's a lot for a first date" / similar.
- If they give generic answers: "come on, give me something real" / similar.
- If they ask no questions back: notice it and call it out kindly.`,
    openings: {
      him: {
        en: "So... your bio said you hate small talk. Bold move meeting someone from the internet then.",
        uk: "Слухай... у тебе в біо було, що ненавидиш small talk. Сміливо тоді йти на побачення з інтернету.",
      },
      her: {
        en: "Okay, first impression — you're taller than your photos suggested. In a good way.",
        uk: "Окей, перше враження — ти вищий ніж на фотках. У хорошому сенсі.",
      },
    },
    minExchanges: 5,
    maxExchanges: 10,
    cannedGoodbyes: {
      en: [
        "This was actually really fun — we should do this again.",
        "I had a good time. Text me?",
        "Okay, I should probably head out — this was nice though.",
      ],
      uk: [
        "Було реально весело — давай повторимо.",
        "Мені сподобалось. Напишеш?",
        "Окей, мені треба бігти — але було приємно.",
      ],
    },
    scoringGuidance:
      "First-date scoring. HEAVILY weight curiosity (asked about them), playfulness, balance of share/ask. Penalize self-centeredness EXTRA hard in this scene — it's the worst date sin. Reward banter, vulnerability that's not oversharing, and genuine questions.",
  },

  interview: {
    id: "interview",
    emoji: "💼",
    labels: { en: "Job Interview", uk: "Співбесіда" },
    modifier: () => `SCENE: You're an interviewer doing the warmup small talk at the start of a job interview with the user. The "real" interview hasn't started yet — this is rapport-building.

Behavior in this scene:
- Professional but warm — friendly without being a friend. 1-3 sentences, slightly more polished than party voice.
- Easier opener questions: how was their commute, did they find the office OK, what got them interested in the role.
- You're subtly evaluating presence, confidence, professionalism, ability to connect — even in the "casual" part.
- Be polite even if the user is awkward, but mentally note it for analytics.
- Light professional humor only. Never sarcastic.

Interview-specific reactions (stay polite):
- If they bad-mouth previous employers: smile thinly, change topic.
- If they over-share personal stuff: gentle professional redirect.
- If they go too casual ("dude", "yeah man"): maintain your tone, don't match.
- If their energy is monotone: ask a probing question to test engagement.`,
    openings: {
      him: {
        en: "Welcome — did you find the office OK? Some people get lost on this floor.",
        uk: "Вітаю — легко знайшли офіс? Деякі плутаються на цьому поверсі.",
      },
      her: {
        en: "Hi, thanks for coming in. How was your morning so far?",
        uk: "Привіт, дякую що прийшли. Як ваш ранок?",
      },
    },
    minExchanges: 3,
    maxExchanges: 6,
    cannedGoodbyes: {
      en: [
        "Right — well, let's dive into the main interview. Tell me about yourself.",
        "Great. Shall we get into it then? Walk me through your background.",
        "Okay, let's transition into the actual interview portion.",
      ],
      uk: [
        "Добре — переходимо до основної частини. Розкажіть про себе.",
        "Чудово. Починаємо? Розкажіть про свій досвід.",
        "Окей, переходимо до самої співбесіди.",
      ],
    },
    scoringGuidance:
      "Interview warmup scoring. Weight PROFESSIONALISM, clarity, and confident phrasing. Fillers matter MORE here — penalize them harder. Praise concise, warm, self-assured answers. Penalize negativity about past employers, oversharing, overly casual register ('dude', 'yeah man').",
  },
};

export const SCENE_LIST: Scene[] = [
  SCENES.afterparty,
  SCENES.elevator,
  SCENES.tinder,
  SCENES.interview,
];

export function genderForCharacter(characterId: "max" | "olena"): Gender {
  return characterId === "max" ? "him" : "her";
}
