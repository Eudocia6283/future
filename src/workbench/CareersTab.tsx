import { PATHS, cn } from "../../shared/oracle";
import { Card, Chip, Empty, LineButton, Meter } from "./chrome";
import type { WorkbenchData } from "./data";

// Where the reading says the seeker's strengths point, and which of the paths
// the book could have foretold it left aside.

export function CareersTab({ data, onResume }: { data: WorkbenchData; onResume: () => void }) {
  const { prophecy } = data;
  if (!prophecy?.paths.length) {
    return (
      <Empty
        title="命途尚未推演。"
        hint="职业筛选要看画像。等画像绘成、你认下之后，预言书才会以它为凭列出适合你的方向与匹配程度。"
        action={<LineButton onClick={onResume}>回到书中继续 ›</LineButton>}
      />
    );
  }
  const chosen = new Set(prophecy.paths.map((p) => p.name));
  const others = PATHS.filter((p) => !chosen.has(p));

  return (
    <div className="flex flex-col gap-5">
      <Card latin="VIAE" title="推荐方向" aside={<span className="font-sans text-[0.62rem] tracking-[0.15em] text-ink/45">按匹配度排序</span>}>
        <ol className="flex flex-col gap-6">
          {prophecy.paths.map((p, i) => (
            <li key={p.name}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-song text-[1.05rem] tracking-[0.1em] text-ink">
                  <span className="mr-2 font-song text-[0.78rem] text-peach-gold">{cn(i + 1)}</span>
                  {p.name}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-serif text-[0.68rem] tracking-[0.2em] text-ink/35 uppercase">match</span>
                  <span className="font-sans text-[1rem] text-jacaranda">{p.match}</span>
                </span>
              </div>
              <div className="my-2.5">
                <Meter value={p.match} />
              </div>
              <p className="font-song text-[0.78rem] leading-[1.9] text-ink/60">{p.reason}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card latin="OMISSA" title="未入选的方向">
        <p className="mb-3 font-song text-[0.72rem] leading-relaxed text-ink/45">
          预言书从同一份画像出发，只留下匹配度最高的几条。其余方向并非不能走，只是此刻看不出比上面更合适。
        </p>
        <ul className="flex flex-wrap gap-2">
          {others.map((p) => (
            <li key={p}>
              <Chip tone="plain">{p}</Chip>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
