export type TalkRatio = { user: number; character: number };

export type FillerWordEntry = { word: string; count: number };

export type Moment = { user_quote: string; why: string };

export type PhraseImprovement = {
  original: string;
  better: string;
  reason: string;
};

export type Analytics = {
  engagement_score: number;
  verdict: string;
  talk_ratio: TalkRatio;
  questions_asked_by_user: number;
  filler_words: FillerWordEntry[];
  best_moment: Moment;
  worst_moment: Moment;
  phrase_improvements: PhraseImprovement[];
  character_inner_thought: string;
};

export type TranscriptLine = { role: "user" | "character"; content: string };
