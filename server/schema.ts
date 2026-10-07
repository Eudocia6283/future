import {
  DIMENSIONS,
  FACET_KEYS,
  missingFacets,
  type Dimension,
  type Facet,
  type Fact,
  type OracleQuestion,
  type Portrait,
  type Profile,
  type Prophecy,
  type QuestionKind,
} from "../shared/oracle.ts";

// JSON Schemas handed to Gemini for structured output.

const str = { type: "string" } as const;
const KINDS: QuestionKind[] = ["single", "multi", "scale", "open"];

export const QUESTION_SCHEMA = {
  type: "object",
  properties: {
    updates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          facet: { type: "string", enum: FACET_KEYS },
          value: str,
          evidence: str,
          source: { type: "string", enum: ["stated", "inferred"] },
          confidence: { type: "integer", minimum: 1, maximum: 3 },
        },
        required: ["facet", "value", "evidence", "source", "confidence"],
      },
    },
    target: { type: "string", enum: FACET_KEYS },
    kind: { type: "string", enum: KINDS },
    reply: str,
    question: str,
    options: { type: "array", items: str },
    scale: { type: "object", properties: { low: str, high: str }, required: ["low", "high"] },
    ready: { type: "boolean" },
  },
  required: ["updates", "target", "kind", "reply", "question", "options", "ready"],
};

export const PORTRAIT_SCHEMA = {
  type: "object",
  properties: {
    title: str,
    summary: str,
    keywords: {
      type: "array",
      items: {
        type: "object",
        properties: { word: str, weight: { type: "integer", minimum: 1, maximum: 5 }, dim: { type: "string", enum: [...DIMENSIONS] } },
        required: ["word", "weight", "dim"],
      },
    },
    uncertain: { type: "array", items: str },
  },
  required: ["title", "summary", "keywords", "uncertain"],
};

export const PROPHECY_SCHEMA = {
  type: "object",
  properties: {
    paths: {
      type: "array",
      items: {
        type: "object",
        properties: { name: str, match: { type: "integer" }, reason: str },
        required: ["name", "match", "reason"],
      },
    },
    learning: {
      type: "array",
      items: {
        type: "object",
        properties: { stage: str, focus: str, items: { type: "array", items: str } },
        required: ["stage", "focus", "items"],
      },
    },
    practice: {
      type: "array",
      items: {
        type: "object",
        properties: { name: str, kind: str, why: str },
        required: ["name", "kind", "why"],
      },
    },
    counsel: str,
  },
  required: ["paths", "learning", "practice", "counsel"],
};

// Model output is checked and tidied before it reaches the book; anything
// unusable throws, so the caller can ask again.

class MalformedOutput extends Error {}

const text = (v: unknown, field: string, required = true) => {
  if (typeof v === "string" && (v.trim() || !required)) return v.trim();
  throw new MalformedOutput(`missing ${field}`);
};
const list = (v: unknown) => (Array.isArray(v) ? v : []);
const strings = (v: unknown) => list(v).filter((o): o is string => typeof o === "string" && !!o.trim()).map((o) => o.trim());
const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const isFacet = (v: unknown): v is Facet => FACET_KEYS.includes(v as Facet);
const isDimension = (v: unknown): v is Dimension => DIMENSIONS.includes(v as Dimension);

/**
 * The model's updates merged into the portrait. What was only inferred, or
 * rests on nothing the seeker said, can't count for more than it is.
 */
function mergeProfile(profile: Profile, updates: unknown): Profile {
  const next: Profile = { ...profile };
  for (const u of list(updates)) {
    const facet: unknown = u?.facet;
    if (!isFacet(facet) || typeof u.value !== "string" || !u.value.trim()) continue;
    const source: Fact["source"] = u.source === "inferred" ? "inferred" : "stated";
    const evidence = typeof u.evidence === "string" ? u.evidence.trim() : "";
    let confidence = clamp(u.confidence, 1, 3, 2);
    if (source === "inferred") confidence = Math.min(confidence, 2);
    if (!evidence) confidence = 1;
    next[facet] = { value: u.value.trim(), evidence, source, confidence: confidence as Fact["confidence"] };
  }
  return next;
}

/** Sanitises a profile sent up by the browser. */
export function normalizeProfile(raw: unknown): Profile {
  const p = (raw ?? {}) as Record<string, any>;
  return mergeProfile(
    {},
    Object.entries(p).map(([facet, f]) => ({ facet, ...f })),
  );
}

export function normalizeQuestion(raw: unknown, profile: Profile): OracleQuestion {
  const q = (raw ?? {}) as Record<string, any>;
  const merged = mergeProfile(profile, q.updates);
  const ready = q.ready === true;
  const kind: QuestionKind = ready ? "open" : KINDS.includes(q.kind) ? q.kind : "open";
  const options = ready || kind === "scale" ? [] : strings(q.options).slice(0, kind === "multi" ? 8 : 4);
  const low = typeof q.scale?.low === "string" ? q.scale.low.trim() : "";
  const high = typeof q.scale?.high === "string" ? q.scale.high.trim() : "";
  return {
    reply: text(q.reply, "reply", false),
    question: text(q.question, "question"),
    target: isFacet(q.target) ? q.target : (missingFacets(merged)[0] ?? "vision"),
    // A choice with nothing to choose from is asked in the seeker's own words.
    kind: (kind === "single" || kind === "multi") && options.length < 2 ? "open" : kind,
    options,
    scale: kind === "scale" ? { low: low || "毫无把握", high: high || "十分娴熟" } : undefined,
    profile: merged,
    ready,
  };
}

export function normalizePortrait(raw: unknown): Portrait {
  const p = (raw ?? {}) as Record<string, any>;
  const seen = new Set<string>();
  const keywords = list(p.keywords).flatMap((k) => {
    const word = typeof k?.word === "string" ? k.word.trim() : "";
    if (!word || seen.has(word)) return [];
    seen.add(word);
    return [{ word, weight: clamp(k.weight, 1, 5, 2), dim: isDimension(k.dim) ? k.dim : ("interest" as Dimension) }];
  });
  if (keywords.length < 6) throw new MalformedOutput("too few keywords");
  return {
    title: text(p.title, "title"),
    summary: text(p.summary, "summary"),
    keywords: keywords.slice(0, 32),
    uncertain: strings(p.uncertain).slice(0, 4),
  };
}

export function normalizeProphecy(raw: unknown): Prophecy {
  const p = (raw ?? {}) as Record<string, any>;
  const paths = list(p.paths)
    .filter((x) => typeof x?.name === "string")
    .map((x) => ({ name: x.name, match: clamp(x.match, 0, 100, 0), reason: String(x.reason ?? "") }))
    .sort((a, b) => b.match - a.match)
    .slice(0, 3);
  if (!paths.length) throw new MalformedOutput("no paths");

  return {
    paths,
    learning: list(p.learning)
      .slice(0, 3)
      .map((l) => ({
        stage: String(l?.stage ?? ""),
        focus: String(l?.focus ?? ""),
        items: list(l?.items).map(String).slice(0, 5),
      })),
    practice: list(p.practice)
      .slice(0, 4)
      .map((x) => ({ name: String(x?.name ?? ""), kind: String(x?.kind ?? "项目"), why: String(x?.why ?? "") })),
    counsel: text(p.counsel, "counsel"),
  };
}
