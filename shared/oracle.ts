// Types and vocabulary shared by the book (browser) and the oracle (server).

/** The reading's stages, in order; the book works through them one chapter at a time. */
export const STAGES = ["portrait", "careers", "direction", "learning", "practice"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  portrait: "个人画像",
  careers: "职业筛选",
  direction: "发展方向",
  learning: "学习资源",
  practice: "实践机会",
};

/** The sides of the seeker the portrait is drawn from. */
export const DIMENSIONS = ["situation", "academics", "experience", "interest", "style", "values", "constraints"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  situation: "基本处境",
  academics: "学业基础",
  experience: "实践经历",
  interest: "兴趣倾向",
  style: "工作风格",
  values: "价值目标",
  constraints: "资源约束",
};

type FacetSpec = { dim: Dimension; label: string; hint: string; required: boolean };

/**
 * The portrait's entries, each one thing the book tries to learn. It keeps
 * asking until every required entry is known (see `KNOWN`); "none" is an
 * answer too, as for a freshman's internships.
 */
export const FACETS = {
  grade: { dim: "situation", label: "年级", hint: "大几，是否已分流或选定方向", required: true },
  school: { dim: "situation", label: "院校与专业", hint: "学校层次、所在专业或方向", required: false },
  plan: { dim: "situation", label: "升学意向", hint: "保研、考研、出国、就业或未定，以及原因", required: true },
  math: { dim: "academics", label: "数学基础", hint: "高数、线代、概率的掌握程度，能否推导常见公式", required: true },
  coding: { dim: "academics", label: "编程能力", hint: "熟悉的语言与框架，写过的最大程序", required: true },
  coursework: { dim: "academics", label: "AI 课程", hint: "学过的机器学习、深度学习等课程或自学内容", required: true },
  grades: { dim: "academics", label: "成绩排名", hint: "绩点或排名的大致区间", required: false },
  projects: { dim: "experience", label: "项目", hint: "课程外的项目：做了什么、角色、技术、产出", required: true },
  competitions: { dim: "experience", label: "竞赛", hint: "参加过的竞赛、负责的部分、名次", required: true },
  research: { dim: "experience", label: "科研", hint: "实验室、论文、导师，做到了哪一步", required: true },
  internship: { dim: "experience", label: "实习", hint: "公司、岗位、做的事", required: true },
  fields: { dim: "interest", label: "感兴趣的领域", hint: "视觉、语言与大模型、多模态、强化学习、推荐与数据、AI 系统等", required: true },
  work: { dim: "interest", label: "偏好的工作", hint: "研究、工程、产品、分析中更享受哪一种", required: true },
  origin: { dim: "interest", label: "兴趣来源", hint: "兴趣从何而来，持续了多久", required: false },
  solo: { dim: "style", label: "独立与协作", hint: "独自钻研还是与人协作", required: true },
  expression: { dim: "style", label: "表达", hint: "向别人讲清一件事、写文档、上台汇报", required: true },
  pace: { dim: "style", label: "节奏与抗压", hint: "计划性、面对压力与截止日期的状态", required: false },
  explore: { dim: "style", label: "探索与稳定", hint: "喜欢尝试新事物，还是在一件事上做深", required: false },
  priorities: { dim: "values", label: "看重什么", hint: "收入、稳定、成长、兴趣、影响力、生活", required: true },
  city: { dim: "values", label: "城市", hint: "想去或必须留在的城市", required: false },
  vision: { dim: "values", label: "五年图景", hint: "五年后在哪里、做什么", required: true },
  worry: { dim: "values", label: "担忧", hint: "此刻最担心的事", required: true },
  time: { dim: "constraints", label: "可投入时间", hint: "课程之外每周能投入多少时间", required: true },
  compute: { dim: "constraints", label: "设备与算力", hint: "有无独立显卡、实验室或云算力", required: false },
  english: { dim: "constraints", label: "英语", hint: "读论文与文档、听课、写作的能力", required: true },
  family: { dim: "constraints", label: "家庭与经济", hint: "家庭期望、经济压力等影响选择的因素", required: false },
} as const satisfies Record<string, FacetSpec>;

export type Facet = keyof typeof FACETS;
export const FACET_KEYS = Object.keys(FACETS) as Facet[];

/**
 * One entry of the portrait. `confidence`: 1 a guess, 2 grounded in what
 * the seeker said, 3 confirmed or borne out by specifics. What the book only
 * inferred is never more than 2.
 */
export type Fact = {
  value: string;
  /** The seeker's words it rests on, e.g. 第二问："只记得考前突击". */
  evidence: string;
  confidence: 1 | 2 | 3;
  source: "stated" | "inferred";
};

export type Profile = Partial<Record<Facet, Fact>>;

/** An entry counts as known at this confidence. */
export const KNOWN = 2;

export const isKnown = (profile: Profile, facet: Facet) => (profile[facet]?.confidence ?? 0) >= KNOWN;

/** Asked about this many times, an entry is let be however little is known of it. */
export const MAX_ASKS = 2;

/** The entries asked about as often as they may be. */
export const askedOut = (asked: Facet[]) => FACET_KEYS.filter((f) => asked.filter((a) => a === f).length >= MAX_ASKS);

/** The required entries not yet known, leaving out those already asked about enough. */
export const missingFacets = (profile: Profile, asked: Facet[] = []) => {
  const done = askedOut(asked);
  return FACET_KEYS.filter((f) => FACETS[f].required && !isKnown(profile, f) && !done.includes(f));
};

/** How much of a dimension is known, 0–1, counting its required entries. */
export function dimensionCoverage(profile: Profile, dim: Dimension) {
  const facets = FACET_KEYS.filter((f) => FACETS[f].dim === dim && FACETS[f].required);
  return facets.filter((f) => isKnown(profile, f)).length / facets.length;
}

/** The career paths the book may foretell. */
export const PATHS = [
  "算法研究",
  "计算机视觉",
  "自然语言处理与大模型",
  "机器学习工程",
  "AI 应用开发",
  "数据科学",
  "AI 产品",
] as const;

/** The book asks at least this many questions, and at most this many before it draws the portrait regardless. */
export const MIN_QUESTIONS = 8;
export const MAX_QUESTIONS = 24;

const CN_DIGITS = "零一二三四五六七八九十";
/** 1–99 in Chinese numerals, for 第三问 and the like. */
export function cn(n: number) {
  if (n <= 10) return CN_DIGITS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${tens > 1 ? CN_DIGITS[tens] : ""}十${ones ? CN_DIGITS[ones] : ""}`;
}

/** One page of the conversation: what the book said, and what the seeker wrote back. */
export type Exchange = { question: string; answer: string };

/**
 * How a question is answered: one option, several, a point on a 1–5 scale,
 * or in the seeker's own words. The seeker may always write more besides.
 */
export type QuestionKind = "single" | "multi" | "scale" | "open";

export type OracleQuestion = {
  /** A short response to the seeker's last answer; the opening words on the first page. */
  reply: string;
  /** The next question, or the book's closing words once `ready`. */
  question: string;
  /** The entry this question is after. */
  target: Facet;
  kind: QuestionKind;
  /** Options for `single` and `multi`; examples, if any, for `open`. */
  options: string[];
  /** What the ends of a `scale` mean. */
  scale?: { low: string; high: string };
  /** The portrait as it stands, with the last answer taken in. */
  profile: Profile;
  /** The book has heard enough and will draw the portrait next. */
  ready: boolean;
};

/** The portrait chapter: an epithet, a written summary later stages work from, and a cloud of keywords. */
export type Portrait = {
  /** An epithet for the seeker, e.g. 静水深流的模型工匠. */
  title: string;
  /** Paragraphs, separated by newlines. */
  summary: string;
  /** Weight 1–5: how much the word stands out in the seeker. */
  keywords: { word: string; weight: number; dim: Dimension }[];
  /** What the book is still unsure of, for the seeker to put right. */
  uncertain: string[];
};

/** The chapters after the portrait, foretold at once until each stage has its own. */
export type Prophecy = {
  paths: { name: string; match: number; reason: string }[];
  learning: { stage: string; focus: string; items: string[] }[];
  practice: { name: string; kind: string; why: string }[];
  counsel: string;
};

export type OracleRequest =
  /** `asked`: the entry each question so far was after, in order. */
  | { mode: "ask"; history: Exchange[]; profile: Profile; asked: Facet[] }
  /** `notes`: the seeker's corrections to an earlier portrait. */
  | { mode: "portray"; history: Exchange[]; profile: Profile; notes: string[] }
  | { mode: "prophesy"; portrait: Portrait; profile: Profile };

export type OracleResponse<T> = { ok: true; data: T; mock: boolean } | { ok: false; error: string };
