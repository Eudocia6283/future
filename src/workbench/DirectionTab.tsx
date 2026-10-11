import { cn } from "../../shared/oracle";
import { Empty, LineButton, Card, Chip } from "./chrome";
import type { WorkbenchData } from "./data";

// Where the reading is headed over the next year or two: the goals it rests on,
// the milestones it sets, and the abilities those milestones build on. The
// milestones are the prophecy's learning stages read as a schedule rather than
// as a reading list — the two chapters are the same sentences seen twice.

export function DirectionTab({ data, onResume }: { data: WorkbenchData; onResume: () => void }) {
  const { prophecy, profile, portrait } = data;
  if (!prophecy && !profile.vision) {
    return (
      <Empty
        title="还没有可以称作方向的东西。"
        hint="方向由两处合成：你亲口说过的五年图景与担忧，以及预言书据此排出的阶段。先把画像补全吧。"
        action={<LineButton onClick={onResume}>回到书中继续 ›</LineButton>}
      />
    );
  }

  const stack = (portrait?.keywords ?? [])
    .filter((k) => (k.dim === "academics" || k.dim === "interest") && k.weight >= 3)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 14);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-6">
      <Card latin="PROPOSITUM" title="目标" className="lg:col-span-3">
        <dl className="flex flex-col gap-4">
          <div>
            <dt className="font-sans text-[0.58rem] tracking-[0.25em] text-ink/40 uppercase">五年图景</dt>
            <dd className="mt-1 font-song text-[0.85rem] leading-[1.9] text-ink/80">{profile.vision?.value ?? "尚未谈及。"}</dd>
          </div>
          <div>
            <dt className="font-sans text-[0.58rem] tracking-[0.25em] text-ink/40 uppercase">最担心的</dt>
            <dd className="mt-1 font-song text-[0.85rem] leading-[1.9] text-ink/80">{profile.worry?.value ?? "尚未谈及。"}</dd>
          </div>
          <div>
            <dt className="font-sans text-[0.58rem] tracking-[0.25em] text-ink/40 uppercase">看重的</dt>
            <dd className="mt-1 font-song text-[0.85rem] leading-[1.9] text-ink/80">{profile.priorities?.value ?? "尚未谈及。"}</dd>
          </div>
        </dl>
        {prophecy && (
          <ul className="mt-5 flex flex-wrap gap-2 border-t border-jacaranda-light/20 pt-4">
            {prophecy.paths.map((p) => (
              <li key={p.name}>
                <Chip tone="gold">{p.name}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card latin="MILIA" title="里程碑" className="lg:col-span-3">
        {prophecy ? (
          <ol className="flex flex-col gap-6 border-l border-jacaranda-light/25 pl-5">
            {prophecy.learning.map((stage, i) => (
              <li key={stage.stage} className="relative">
                <span className="absolute top-[0.3rem] -left-[1.62rem] font-song text-[0.68rem] text-peach-gold">{cn(i + 1)}</span>
                <h4 className="font-song text-[0.7rem] tracking-[0.25em] text-jacaranda">{stage.stage}</h4>
                <p className="mt-1 font-song text-[0.88rem] leading-relaxed text-ink">{stage.focus}</p>
                <p className="mt-1 font-sans text-[0.6rem] tracking-[0.15em] text-ink/35">{stage.items.length} 项学习内容 · 见「学习资源」</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-song text-[0.78rem] text-ink/45">阶段尚未排出。</p>
        )}
      </Card>

      <Card latin="ARTES" title="技能栈" className="lg:col-span-6">
        {stack.length ? (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {stack.map((k) => (
              <li
                key={k.word}
                className={`font-song ${k.weight >= 5 ? "text-[1.05rem] text-ink" : k.weight >= 4 ? "text-[0.92rem] text-ink/80" : "text-[0.8rem] text-ink/60"}`}
                title={`突出程度 ${k.weight} / 5`}
              >
                {k.word}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-song text-[0.78rem] text-ink/45">画像绘成后，这里会列出与方向相关的关键词。</p>
        )}
      </Card>
    </div>
  );
}
