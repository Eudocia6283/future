import { Card, Chip, Empty, LineButton } from "./chrome";
import type { WorkbenchData } from "./data";

// The prophecy's practical suggestions, grouped by what kind of thing they are,
// so it is obvious at a glance what can be done this term and what needs asking.

const KINDS = ["项目", "竞赛", "科研", "实习"] as const;

export function PracticeTab({ data, onResume }: { data: WorkbenchData; onResume: () => void }) {
  const { prophecy } = data;
  if (!prophecy?.practice.length) {
    return (
      <Empty
        title="还没有实践建议。"
        hint="实践建议要看你的年级、已有经历与可用资源。画像与命途都齐了之后，这里会给出具体可做的事。"
        action={<LineButton onClick={onResume}>回到书中继续 ›</LineButton>}
      />
    );
  }

  const known = new Set(prophecy.practice.map((x) => x.kind));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {prophecy.practice.map((x, i) => (
          <Card key={x.name} latin={`OPUS ${["I", "II", "III", "IV"][i] ?? i + 1}`} className="min-w-0">
            <p className="font-song text-[1rem] leading-snug tracking-[0.08em] text-ink">{x.name}</p>
            <div className="mt-2 mb-3">
              <Chip tone="gold">{x.kind}</Chip>
            </div>
            <p className="font-song text-[0.75rem] leading-[1.9] text-ink/60">{x.why}</p>
          </Card>
        ))}
      </div>

      <Card latin="GENERA" title="按类型看">
        <ul className="flex flex-col gap-3">
          {KINDS.map((kind) => {
            const items = prophecy.practice.filter((x) => x.kind === kind);
            return (
              <li key={kind} className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-jacaranda-light/15 pb-3 last:border-0 last:pb-0">
                <span className="w-[3.5rem] shrink-0 font-song text-[0.78rem] tracking-[0.15em] text-ink/60">{kind}</span>
                <span className="flex min-w-0 flex-1 flex-wrap gap-2">
                  {items.length ? (
                    items.map((x) => (
                      <span key={x.name} className="font-song text-[0.78rem] text-ink/75">
                        {x.name}
                      </span>
                    ))
                  ) : (
                    <span className="font-song text-[0.72rem] text-ink/30">这一阶段暂无</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        {known.size < KINDS.length && (
          <p className="mt-4 border-t border-jacaranda-light/20 pt-3 font-song text-[0.65rem] leading-relaxed text-ink/40">
            并非四类都要做。预言书只挑了此刻对你最有用的事。
          </p>
        )}
      </Card>
    </div>
  );
}
