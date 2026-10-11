import { useState } from "react";
import { Card, Empty, LineButton } from "./chrome";
import type { WorkbenchData, WorkbenchSource } from "./data";

// The prophecy's reading list, turned into something that can be worked
// through: each item may be ticked off, and the ticks are kept in this browser
// so they survive closing the book. They are a study aid, not part of the
// reading — they never travel to the oracle.

const STORE = "prophecy-book/learning-checks";

function read(key: string): Record<string, boolean> {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "{}") as unknown;
    return raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function write(key: string, checks: Record<string, boolean>) {
  try {
    localStorage.setItem(key, JSON.stringify(checks));
  } catch {
    // A full or disabled localStorage costs the ticks, nothing else.
  }
}

export function LearningTab({ data, source, onResume }: { data: WorkbenchData; source: WorkbenchSource; onResume: () => void }) {
  const key = `${STORE}/${source}`;
  const [checks, setChecks] = useState<Record<string, boolean>>(() => read(key));

  if (!data.prophecy?.learning.length) {
    return (
      <Empty
        title="还没有学习清单。"
        hint="预言书认下画像之后，会针对你的短板、目标方向与每周能投入的时间，分阶段列出该读的书与该上的课。"
        action={<LineButton onClick={onResume}>回到书中继续 ›</LineButton>}
      />
    );
  }

  const toggle = (item: string) =>
    setChecks((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      write(key, next);
      return next;
    });

  const all = data.prophecy.learning.flatMap((s) => s.items);
  const doneAll = all.filter((i) => checks[i]).length;

  return (
    <div className="flex flex-col gap-5">
      <Card
        latin="STUDIA"
        title="分阶段的学习清单"
        aside={
          <span className="font-sans text-[0.62rem] tracking-[0.15em] text-ink/45">
            {doneAll} / {all.length} 已读 · 记在这台浏览器上
          </span>
        }
        >
        <div className="flex flex-col gap-6">
          {data.prophecy.learning.map((stage) => {
            const done = stage.items.filter((i) => checks[i]).length;
            return (
              <section key={stage.stage}>
                <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-jacaranda-light/20 pb-1.5">
                  <h4 className="font-song text-[0.78rem] tracking-[0.2em] text-ink/75">{stage.stage}</h4>
                  <span className="font-sans text-[0.6rem] tracking-[0.15em] text-ink/35">
                    {done} / {stage.items.length}
                  </span>
                </header>
                <p className="mt-2 mb-3 font-song text-[0.85rem] leading-relaxed text-jacaranda">{stage.focus}</p>
                <ul className="flex flex-col gap-1">
                  {stage.items.map((item) => {
                    const on = !!checks[item];
                    return (
                      <li key={item}>
                        <button
                          onClick={() => toggle(item)}
                          aria-pressed={on}
                          className="group flex w-full cursor-pointer items-start gap-3 px-1 py-1.5 text-left"
                        >
                          <span
                            className={`mt-[0.3rem] size-2 shrink-0 rotate-45 border transition-colors ${
                              on ? "border-peach-gold bg-peach-gold" : "border-jacaranda-light group-hover:border-peach-gold"
                            }`}
                          />
                          <span className={`min-w-0 flex-1 font-song text-[0.8rem] leading-[1.8] ${on ? "text-ink/40 line-through" : "text-ink/75"}`}>
                            {item}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <p className="mt-5 border-t border-jacaranda-light/20 pt-3 font-song text-[0.65rem] leading-relaxed text-ink/40">
          勾选只是给自己看的进度，不会影响画像，也不会回传给预言书。
        </p>
      </Card>
    </div>
  );
}
