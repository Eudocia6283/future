import type { Exchange, Facet, Fact, OracleQuestion, Portrait, Profile, Prophecy, QuestionKind } from "../shared/oracle.ts";
import { SAMPLE_PORTRAIT, SAMPLE_PROFILE, SAMPLE_PROPHECY } from "../shared/sample.ts";

// A scripted reading for when no API key is set, so the book can be shown offline.
// Its portrait and prophecy are the shared sample, so the scripted reading and
// the workbench's demonstration always end on the same result; only the
// questions and the entries they pick up step by step live here.

type Step = {
  reply: string;
  question: string;
  target: Facet;
  kind: QuestionKind;
  options?: string[];
  scale?: { low: string; high: string };
  /** What the book takes from the answer to the question before this one, whatever it was. */
  learnt?: Partial<Record<Facet, [string, string, Fact["confidence"]?]>>;
};

const SCRIPT: Step[] = [
  {
    reply: "你终于来了。我已在此静候许久。",
    question: "先告诉我，你如今是大几的学生？毕业之后，更想读研深造，还是直接工作？",
    target: "grade",
    kind: "single",
    options: ["大二，还没想好", "大三，准备保研", "大三，想直接工作", "大四，正在找实习"],
  },
  {
    reply: "每一条路都有它的风景，不必急着定下。",
    question: "若让你手推一遍逻辑回归的梯度，或解释一个矩阵的特征值意味着什么，你有几分把握？",
    target: "math",
    kind: "scale",
    scale: { low: "毫无头绪", high: "信手拈来" },
    learnt: { grade: ["大三", "第一问"], plan: ["倾向读研，尚未确定保研或考研", "第一问"] },
  },
  {
    reply: "数学是魔法的文法，薄弱之处可以慢慢补上。",
    question: "编程呢？你最熟悉哪门语言和框架？写过的最大的一个程序是什么，大约多少行？",
    target: "coding",
    kind: "open",
    options: ["我最常用……", "写过最大的是……"],
    learnt: { math: ["线代尚可，概率论推导吃力", "第二问：刻度 3"] },
  },
  {
    reply: "亲手写下的代码，比读过的书更能说明你。",
    question: "课堂内外，你学过哪些与 AI 有关的课程或教程？",
    target: "coursework",
    kind: "multi",
    options: ["机器学习导论", "深度学习", "吴恩达公开课", "CS231n / CS224n", "《动手学深度学习》", "都还没学过"],
    learnt: { coding: ["熟悉 Python 与 PyTorch 入门，写过千行级课设", "第三问", 3] },
  },
  {
    reply: "这些墨迹已足以打下根基。",
    question: "课堂之外，你参加过哪些竞赛、科研或实习？挑一段说说你在其中具体做了什么。",
    target: "projects",
    kind: "open",
    options: ["我参加过……", "我在实验室……", "还没有这样的经历"],
    learnt: { coursework: ["修过机器学习导论，自学过吴恩达公开课", "第四问", 3] },
  },
  {
    reply: "从数据清洗做起，是许多人真正的入门。",
    question: "那次建模里，你是怎样分工的？最后的成绩如何？",
    target: "competitions",
    kind: "single",
    options: ["我负责建模与代码", "我负责写论文", "我负责数据处理", "大家一起做"],
    learnt: {
      projects: ["课程外做过一个图像分类小项目", "第五问"],
      competitions: ["参加过数学建模", "第五问"],
      research: ["暂无", "第五问"],
      internship: ["暂无", "第五问"],
    },
  },
  {
    reply: "肯承担代码的人，往往是队伍的脊梁。",
    question: "在 AI 的诸多领域里，哪几类最让你心动？",
    target: "fields",
    kind: "multi",
    options: ["图像与视觉", "语言与大模型", "多模态", "强化学习", "推荐与数据", "AI 系统与部署"],
    learnt: { competitions: ["数学建模省二，负责建模与代码", "第六问", 3] },
  },
  {
    reply: "心之所向，便是星辰指引的方向。",
    question: "一个周末，你更愿意把模型的准确率再提一个点，还是把它做成同学都在用的小工具？",
    target: "work",
    kind: "single",
    options: ["再提一个点", "做成小工具", "都想试试", "都不太想"],
    learnt: { fields: ["视觉与大模型应用", "第七问"] },
  },
  {
    reply: "想让东西被人用上，这是工程师的本心。",
    question: "你习惯怎样做事？独自钻研，还是与人协作？向别人讲清一件事，对你来说难吗？",
    target: "solo",
    kind: "single",
    options: ["喜欢独自钻研", "习惯组队讨论", "表达是我的强项", "不太擅长讲解"],
    learnt: { work: ["偏好把模型做成可用的工具", "第八问", 3] },
  },
  {
    reply: "能与人同行，路便不会太孤单。",
    question: "选择未来的去处时，你最看重哪些？",
    target: "priorities",
    kind: "multi",
    options: ["收入", "稳定", "成长速度", "兴趣", "城市与生活", "社会影响"],
    learnt: { solo: ["习惯组队讨论", "第九问"], expression: ["讲解清楚，乐于表达", "第九问"] },
  },
  {
    reply: "看重什么，便会在哪里停留。",
    question: "想象五年后的你：在哪座城市、什么样的地方，做着怎样的事？此刻你最担心的又是什么？",
    target: "vision",
    kind: "open",
    options: ["五年后我想……", "我最担心……"],
    learnt: { priorities: ["成长速度与兴趣", "第十问"] },
  },
  {
    reply: "担忧也是一种清醒，它说明你在认真对待未来。",
    question: "课程之外，你每周大约能拿出多少时间，投入到 AI 的学习与实践中？",
    target: "time",
    kind: "scale",
    scale: { low: "几乎没有", high: "二十小时以上" },
    learnt: {
      vision: ["在一线城市做模型相关的工程工作", "第十一问"],
      worry: ["担心没有拿得出手的作品", "第十一问"],
      city: ["一线城市", "第十一问"],
    },
  },
  {
    reply: "时间是最公平的资源，就看如何安放。",
    question: "最后，读英文论文和文档对你来说如何？",
    target: "english",
    kind: "single",
    options: ["读得很顺", "借助翻译能读", "很吃力", "几乎没读过"],
    learnt: { time: ["每周约十小时", "第十二问：刻度 3"] },
  },
];

const CLOSING = {
  reply: "我已看清你的轮廓。",
  question: "现在，让我为你描绘你的模样……",
};

/**
 * The portrait after the first `answered` answers, taken in step by step.
 * Once the script has run out of questions it returns the shared sample, so
 * a scripted reading and the workbench's demonstration end on one profile.
 */
function profileAfter(answered: number): Profile {
  if (answered >= SCRIPT.length) return SAMPLE_PROFILE;
  const profile: Profile = {};
  for (const step of SCRIPT.slice(1, answered + 1)) {
    for (const [facet, [value, evidence, confidence = 2]] of Object.entries(step.learnt ?? {})) {
      profile[facet as Facet] = { value, evidence, confidence, source: "stated" };
    }
  }
  return profile;
}

export function mockQuestion(history: Exchange[]): OracleQuestion {
  const step = SCRIPT[history.length];
  const profile = profileAfter(history.length);
  if (!step) return { reply: CLOSING.reply, question: CLOSING.question, target: "english", kind: "open", options: [], profile, ready: true };
  const { learnt: _, ...question } = step;
  return { ...question, options: step.options ?? [], profile, ready: false };
}

export function mockPortrait(notes: string[]): Portrait {
  // Corrected once, the book has nothing left to be unsure of.
  return { ...SAMPLE_PORTRAIT, uncertain: notes.length ? [] : SAMPLE_PORTRAIT.uncertain };
}

export function mockProphecy(): Prophecy {
  return SAMPLE_PROPHECY;
}
