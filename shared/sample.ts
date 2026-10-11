// A complete, canned reading — the one thing the book can show without
// hearing anything from the seeker. Two callers draw on it:
//
//   · the cover's direct entry and `?workbench=1`, which open the workbench
//     on a finished reading so the result can be seen at a glance;
//   · the server's mock mode (see `server/mock.ts`), whose scripted reading
//     ends in exactly this profile, portrait and prophecy.
//
// Keeping both on one copy means a scripted reading and the demonstration
// can never drift apart. This file is plain data: it imports types only, so
// the browser bundle can take it without pulling in any server code.

import type { Portrait, Profile, Prophecy } from "./oracle.ts";

/**
 * The portrait's entries after the scripted thirteen answers: every required
 * entry known (18 of 26), plus the city, which the seeker happened to let
 * slip. The seven left out are optional ones the script never asked about.
 * Values must match `profileAfter` in `server/mock.ts` — that function
 * returns this object once the script runs out of questions.
 */
export const SAMPLE_PROFILE: Profile = {
  grade: { value: "大三", evidence: "第一问", confidence: 2, source: "stated" },
  plan: { value: "倾向读研，尚未确定保研或考研", evidence: "第一问", confidence: 2, source: "stated" },
  math: { value: "线代尚可，概率论推导吃力", evidence: "第二问：刻度 3", confidence: 2, source: "stated" },
  coding: { value: "熟悉 Python 与 PyTorch 入门，写过千行级课设", evidence: "第三问", confidence: 3, source: "stated" },
  coursework: { value: "修过机器学习导论，自学过吴恩达公开课", evidence: "第四问", confidence: 3, source: "stated" },
  projects: { value: "课程外做过一个图像分类小项目", evidence: "第五问", confidence: 2, source: "stated" },
  competitions: { value: "数学建模省二，负责建模与代码", evidence: "第六问", confidence: 3, source: "stated" },
  research: { value: "暂无", evidence: "第五问", confidence: 2, source: "stated" },
  internship: { value: "暂无", evidence: "第五问", confidence: 2, source: "stated" },
  fields: { value: "视觉与大模型应用", evidence: "第七问", confidence: 2, source: "stated" },
  work: { value: "偏好把模型做成可用的工具", evidence: "第八问", confidence: 3, source: "stated" },
  solo: { value: "习惯组队讨论", evidence: "第九问", confidence: 2, source: "stated" },
  expression: { value: "讲解清楚，乐于表达", evidence: "第九问", confidence: 2, source: "stated" },
  priorities: { value: "成长速度与兴趣", evidence: "第十问", confidence: 2, source: "stated" },
  vision: { value: "在一线城市做模型相关的工程工作", evidence: "第十一问", confidence: 2, source: "stated" },
  worry: { value: "担心没有拿得出手的作品", evidence: "第十一问", confidence: 2, source: "stated" },
  city: { value: "一线城市", evidence: "第十一问", confidence: 2, source: "stated" },
  time: { value: "每周约十小时", evidence: "第十二问：刻度 3", confidence: 2, source: "stated" },
  english: { value: "借助翻译能读论文", evidence: "第十三问", confidence: 2, source: "stated" },
};

/** The written portrait that goes with `SAMPLE_PROFILE`. */
export const SAMPLE_PORTRAIT: Portrait = {
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
  uncertain: ["保研还是考研，似乎仍在犹豫", "图像分类项目做到了哪一步"],
};

/** The prophecy that goes with `SAMPLE_PORTRAIT`. */
export const SAMPLE_PROPHECY: Prophecy = {
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
