import { GoogleGenAI, type Content } from "@google/genai";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  FACET_KEYS,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  askedOut,
  missingFacets,
  type Exchange,
  type Facet,
  type OracleRequest,
  type OracleResponse,
  type Profile,
} from "../shared/oracle.ts";
import { mockPortrait, mockProphecy, mockQuestion } from "./mock.ts";
import { ASK_INSTRUCTION, OPENING_WORDS, PORTRAY_INSTRUCTION, PROPHESY_INSTRUCTION, askState, portraySource, prophesySource } from "./prompts.ts";
import {
  PORTRAIT_SCHEMA,
  PROPHECY_SCHEMA,
  QUESTION_SCHEMA,
  normalizePortrait,
  normalizeProfile,
  normalizeProphecy,
  normalizeQuestion,
} from "./schema.ts";

const MAX_BODY = 64 * 1024;
// Model output that fails validation is asked for again this many times.
const RETRIES = 1;
// Mock replies wait this long, so the book's thinking can be seen.
const MOCK_DELAY = 1200;

type Env = Record<string, string | undefined>;

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > MAX_BODY) reject(new Error("request too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseRequest(body: string): OracleRequest {
  const r = JSON.parse(body) as Record<string, any>;
  const profile = normalizeProfile(r.profile);
  if (r.mode === "prophesy") {
    const portrait = r.portrait ?? {};
    return {
      mode: "prophesy",
      profile,
      portrait: {
        title: String(portrait.title ?? "").slice(0, 60),
        summary: String(portrait.summary ?? "").slice(0, 4000),
        keywords: (Array.isArray(portrait.keywords) ? portrait.keywords : []).slice(0, 40),
        uncertain: [],
      },
    };
  }
  if (r.mode !== "ask" && r.mode !== "portray") throw new Error("unknown mode");
  if (!Array.isArray(r.history) || r.history.length > MAX_QUESTIONS + 1) throw new Error("bad history");
  const history = r.history.map((e: any) => ({ question: String(e?.question ?? ""), answer: String(e?.answer ?? "").slice(0, 2000) }));
  if (r.mode === "ask") {
    const asked = (Array.isArray(r.asked) ? r.asked : []).filter((f: unknown): f is Facet => FACET_KEYS.includes(f as Facet)).slice(0, MAX_QUESTIONS + 1);
    return { mode: "ask", history, profile, asked };
  }
  const notes = (Array.isArray(r.notes) ? r.notes : []).map((n: unknown) => String(n).slice(0, 600)).slice(0, 12);
  return { mode: "portray", history, profile, notes };
}

/** The conversation as Gemini turns: the book speaks as the model, the seeker as the user. */
function askContents(history: Exchange[], profile: Profile, asked: Facet[]): Content[] {
  const contents: Content[] = [{ role: "user", parts: [{ text: OPENING_WORDS }] }];
  for (const e of history) {
    contents.push({ role: "model", parts: [{ text: e.question }] }, { role: "user", parts: [{ text: e.answer }] });
  }
  contents[contents.length - 1].parts!.push({ text: askState(profile, history.length, asked) });
  return contents;
}

async function useProxy(url: string) {
  const { ProxyAgent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new ProxyAgent(url));
}

export function createOracleHandler(env: Env) {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
  const baseUrl = env.GEMINI_BASE_URL?.trim();
  const proxy = (env.HTTPS_PROXY || env.HTTP_PROXY)?.trim();
  const ai = apiKey ? new GoogleGenAI({ apiKey, httpOptions: baseUrl ? { baseUrl } : undefined }) : null;
  const ready = proxy && ai ? useProxy(proxy) : Promise.resolve();

  console.log(ai ? `[oracle] Gemini model ${model}${proxy ? ` via ${proxy}` : ""}` : "[oracle] no GEMINI_API_KEY, running in mock mode");

  async function generate<T>(systemInstruction: string, contents: Content[], schema: object, normalize: (raw: unknown) => T) {
    await ready;
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      const res = await ai!.models.generateContent({
        model,
        contents,
        config: { systemInstruction, responseMimeType: "application/json", responseJsonSchema: schema, temperature: 0.8 },
      });
      try {
        return normalize(JSON.parse(res.text ?? ""));
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }

  async function answer(request: OracleRequest) {
    if (!ai) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY));
      if (request.mode === "ask") return mockQuestion(request.history);
      return request.mode === "portray" ? mockPortrait(request.notes) : mockProphecy();
    }
    if (request.mode === "ask") {
      const { history, profile, asked } = request;
      const contents = askContents(history, profile, asked);
      const ask = () => generate(ASK_INSTRUCTION, contents, QUESTION_SCHEMA, (raw) => normalizeQuestion(raw, profile));
      let q = await ask();
      // The book must not stop before it has heard enough, nor dwell on what it has
      // asked about enough: told what is wrong, it asks again.
      const missing = missingFacets(q.profile, asked);
      const early = q.ready && (history.length < MIN_QUESTIONS || missing.length > 0);
      const dwelling = !q.ready && askedOut(asked).includes(q.target);
      if ((early || dwelling) && history.length < MAX_QUESTIONS) {
        contents[contents.length - 1].parts!.push({
          text: early
            ? `（还不能收尾：${missing.length ? `仍有必需条目未了解：${missing.join("、")}` : `求问者只回答了 ${history.length} 次，至少需要 ${MIN_QUESTIONS} 次`}。请继续提问，ready 为 false。）`
            : `（${q.target} 已经问过 ${asked.filter((f) => f === q.target).length} 次，不要再问。请换一个条目${missing.length ? `，如：${missing.join("、")}` : ""}。）`,
        });
        q = await ask();
        if (early) q.ready = false;
      }
      // Asked about all it can, the book draws what it has.
      if (!q.ready && history.length >= MIN_QUESTIONS && missing.length === 0 && askedOut(asked).includes(q.target)) {
        return { ...q, question: "我已看清你的轮廓。现在，让我为你描绘你的模样……", kind: "open" as const, ready: true, options: [], scale: undefined };
      }
      if (!q.ready && history.length >= MAX_QUESTIONS) {
        return { ...q, question: "我已听得足够多了。现在，让我为你描绘你的模样……", kind: "open" as const, ready: true, options: [], scale: undefined };
      }
      return q;
    }
    if (request.mode === "portray") {
      const contents: Content[] = [{ role: "user", parts: [{ text: portraySource(request.history, request.profile, request.notes) }] }];
      return generate(PORTRAY_INSTRUCTION, contents, PORTRAIT_SCHEMA, normalizePortrait);
    }
    const contents: Content[] = [{ role: "user", parts: [{ text: prophesySource(request.portrait, request.profile) }] }];
    return generate(PROPHESY_INSTRUCTION, contents, PROPHECY_SCHEMA, normalizeProphecy);
  }

  return async (req: IncomingMessage, res: ServerResponse) => {
    const send = (status: number, body: OracleResponse<unknown>) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(body));
    };
    if (req.method !== "POST") return send(405, { ok: false, error: "请以 POST 求问" });

    let request: OracleRequest;
    try {
      request = parseRequest(await readBody(req));
    } catch {
      return send(400, { ok: false, error: "书页上的字迹无法辨认" });
    }
    try {
      send(200, { ok: true, data: await answer(request), mock: !ai });
    } catch (e) {
      console.error("[oracle]", e);
      send(502, { ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  };
}
