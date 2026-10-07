import type { Exchange, Facet, Fact, OracleQuestion, Portrait, Profile, Prophecy, QuestionKind } from "../shared/oracle.ts";

// A scripted reading for when no API key is set, so the book can be shown offline.

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
  learnt: { english: ["借助翻译能读论文", "第十三问"] },
};

/** The portrait after the first `answered` answers, taken in step by step. */
function profileAfter(answered: number): Profile {
  const profile: Profile = {};
  for (const step of [...SCRIPT.slice(1, answered + 1), ...(answered >= SCRIPT.length ? [CLOSING] : [])]) {
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
  return {
    title: "静水深流的模型工匠",
    summary: [
      "你正读大三，倾向于继续读研，但保研还是考研尚未定下。你希望几年后在一线城市做模型相关的工程工作，把学到的东西变成真正被人使用的东西。",
      "你的编程是最可靠的支点：熟悉 Python，入门了 PyTorch，写过千行级的课设，在数学建模中负责建模与代码并拿到省二。线性代数尚可，概率论的推导仍然吃力；机器学习学过导论课与公开课，但还没有独立训练过一个像样的深度模型，也还没有科研与实习经历。",
      "吸引你的是视觉与大模型应用，比起把指标再提一个点，你更愿意把模型做成同学都在用的小工具。你习惯与人组队讨论，讲解清楚，看重成长的速度与兴趣本身。",
      "你每周大约能拿出十小时，英文论文要借助翻译才能读下来。你最担心的是没有拿得出手的作品——这份担忧是对的，它或许正是接下来一年最该回应的事。",
    ].join("\n"),
    keywords: [
      { word: "模型落地", weight: 5, dim: "interest" },
      { word: "Python 熟练", weight: 5, dim: "academics" },
      { word: "数学建模省二", weight: 4, dim: "experience" },
      { word: "缺少作品", weight: 5, dim: "values" },
      { word: "大三", weight: 3, dim: "situation" },
      { word: "倾向读研", weight: 4, dim: "situation" },
      { word: "概率论吃力", weight: 3, dim: "academics" },
      { word: "线代尚可", weight: 2, dim: "academics" },
      { word: "PyTorch 入门", weight: 3, dim: "academics" },
      { word: "图像分类项目", weight: 2, dim: "experience" },
      { word: "暂无科研", weight: 3, dim: "experience" },
      { word: "暂无实习", weight: 2, dim: "experience" },
      { word: "计算机视觉", weight: 4, dim: "interest" },
      { word: "大模型应用", weight: 4, dim: "interest" },
      { word: "做成小工具", weight: 3, dim: "interest" },
      { word: "组队讨论", weight: 3, dim: "style" },
      { word: "讲解清楚", weight: 3, dim: "style" },
      { word: "看重成长", weight: 4, dim: "values" },
      { word: "一线城市", weight: 2, dim: "values" },
      { word: "工程岗位", weight: 3, dim: "values" },
      { word: "每周十小时", weight: 2, dim: "constraints" },
      { word: "英文借助翻译", weight: 2, dim: "constraints" },
    ],
    uncertain: notes.length ? [] : ["保研还是考研，似乎仍在犹豫", "图像分类项目做到了哪一步"],
  };
}

export function mockProphecy(): Prophecy {
  return {
    paths: [
      { name: "机器学习工程", match: 82, reason: "你擅长把事情落地，工程能力是你最可靠的支点，可以向模型训练与部署延伸。" },
      { name: "AI 应用开发", match: 74, reason: "想做出能用的东西，大模型应用正需要懂模型又能写产品的人。" },
      { name: "计算机视觉", match: 61, reason: "若补上深度学习实践，视觉方向的项目最容易看到成果。" },
    ],
    learning: [
      {
        stage: "接下来一个学期",
        focus: "补上概率论，建立深度学习的动手能力",
        items: ["重修概率论与数理统计的核心章节", "《动手学深度学习》第 1–7 章，边读边跑代码", "吴恩达《Machine Learning Specialization》", "学会用 Git 管理每一个项目"],
      },
      {
        stage: "再往后一学年",
        focus: "选定方向，做出一件完整的作品",
        items: ["CS231n 或 CS224n 选修其一", "学习 PyTorch Lightning 与实验管理", "了解 Docker 与模型部署", "读 5 篇所选方向的经典论文"],
      },
    ],
    practice: [
      { name: "复现一个图像分类模型", kind: "项目", why: "从数据到训练再到评估走完一遍，补上深度学习实践这块短板。" },
      { name: "参加一次 Kaggle 或天池比赛", kind: "竞赛", why: "在真实数据上和别人比较，最快知道自己的位置。" },
      { name: "做一个大模型问答小应用", kind: "项目", why: "结合你的工程能力与兴趣，完成后可以直接放进简历。" },
    ],
    counsel: "不必羡慕走得快的人。你只需每一学期都比上一学期多留下一件作品，命途自会显形。",
  };
}
