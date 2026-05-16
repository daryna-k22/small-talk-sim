export type Locale = "en" | "uk";

const LOCALE_KEY = "smalltalk-locale";

export const LOCALES: { id: Locale; label: string; flag: string }[] = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "uk", label: "Українська", flag: "🇺🇦" },
];

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem(LOCALE_KEY);
  return v === "uk" ? "uk" : "en";
}

export function setLocale(l: Locale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCALE_KEY, l);
}

export type Dict = {
  subtitle: string;
  him: string;
  her: string;
  age: string;
  ageYoung: string;
  ageMid: string;
  ageOlder: string;
  scene: string;
  sceneComingSoon: string;
  zodiac: string;
  name: string;
  namePlaceholder: string;
  walkUp: string;
  talk: string;
  stop: string;
  tapToSpeak: string;
  recordingHint: string;
  thinkingHint: string;
  speakingHint: string;
  restart: string;
  emptyState: string;
  afterparty: string;
  aThinkingAbout: (name: string) => string;
  aTalkRatio: string;
  aTalkRatioValue: (you: number, name: string, them: number) => string;
  aCuriosity: string;
  aQuestions: (n: number) => string;
  aFillers: string;
  aFillersValue: (n: number) => string;
  aThoughtLabel: (name: string) => string;
  aBest: string;
  aWorst: string;
  aFillersDetected: string;
  aTrySaying: string;
  aTryAgain: string;
  aNewCharacter: string;
  aCouldntLoad: string;
};

export const T: Record<Locale, Dict> = {
  en: {
    subtitle: "Who do you want to practice small talk with?",
    him: "Him",
    her: "Her",
    age: "Age",
    ageYoung: "Young (20s)",
    ageMid: "Mid (30s)",
    ageOlder: "Older (40s+)",
    scene: "Scene",
    sceneComingSoon: "Coming soon",
    zodiac: "Zodiac",
    name: "Name",
    namePlaceholder: "Give them a name",
    walkUp: "Walk up to them",
    talk: "Talk",
    stop: "Stop",
    tapToSpeak: "Tap to speak",
    recordingHint: "Recording… (auto-stops after 3s silence)",
    thinkingHint: "Listening to you…",
    speakingHint: "They're replying…",
    restart: "Restart",
    emptyState: "Tap the mic to say hi. They're right in front of you.",
    afterparty: "Afterparty",
    aThinkingAbout: (name) => `${name} is thinking about your conversation…`,
    aTalkRatio: "Talk ratio",
    aTalkRatioValue: (you, name, them) => `You ${you}% · ${name} ${them}%`,
    aCuriosity: "Curiosity",
    aQuestions: (n) => `${n} questions`,
    aFillers: "Fillers",
    aFillersValue: (n) => `${n} total`,
    aThoughtLabel: (name) => `What ${name} really thought`,
    aBest: "Best moment",
    aWorst: "Worst moment",
    aFillersDetected: "Filler words detected",
    aTrySaying: "Try saying instead",
    aTryAgain: "Try again",
    aNewCharacter: "New character",
    aCouldntLoad: "Couldn't load analytics",
  },
  uk: {
    subtitle: "З ким хочеш потренувати small talk?",
    him: "Він",
    her: "Вона",
    age: "Вік",
    ageYoung: "Молодий (20+)",
    ageMid: "Середній (30+)",
    ageOlder: "Старший (40+)",
    scene: "Ситуація",
    sceneComingSoon: "Скоро",
    zodiac: "Знак зодіаку",
    name: "Ім'я",
    namePlaceholder: "Дай ім'я",
    walkUp: "Підійти",
    talk: "Говорити",
    stop: "Стоп",
    tapToSpeak: "Натисни щоб говорити",
    recordingHint: "Запис… (зупиниться після 3с тиші)",
    thinkingHint: "Слухаю…",
    speakingHint: "Відповідає…",
    restart: "Почати заново",
    emptyState: "Натисни мікрофон щоб привітатись. Вони прямо перед тобою.",
    afterparty: "Афтерпаті",
    aThinkingAbout: (name) => `${name} обмірковує вашу розмову…`,
    aTalkRatio: "Хто говорив",
    aTalkRatioValue: (you, name, them) => `Ти ${you}% · ${name} ${them}%`,
    aCuriosity: "Цікавість",
    aQuestions: (n) => `${n} запитань`,
    aFillers: "Слова-паразити",
    aFillersValue: (n) => `${n} разом`,
    aThoughtLabel: (name) => `Що ${name} насправді думає`,
    aBest: "Найкращий момент",
    aWorst: "Найгірший момент",
    aFillersDetected: "Знайдено слова-паразити",
    aTrySaying: "Спробуй сказати так",
    aTryAgain: "Спробувати знову",
    aNewCharacter: "Інший персонаж",
    aCouldntLoad: "Не вдалося завантажити аналітику",
  },
};
