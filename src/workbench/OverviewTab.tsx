import { FACETS, cn, missingFacets, type Facet } from "../../shared/oracle";
import { Card, Chip, Dots, Empty, LineButton, Meter, Stat } from "./chrome";
import type { WorkbenchData } from "./data";

// The view the seeker's adviser is most likely to look at first: the whole
// reading on one screen, in the order the book itself works through it.

/** The entries a glance should cover. The rest live on the portrait's page. */
const KEY_FACETS: Facet[] = ["grade", "plan", "time", "english", "compute", "grades"];

export function OverviewTab({ data, onResume }: { data: WorkbenchData; onResume: () => void }) {
  const { portrait, prophecy, profile } = data;
  if (!portrait && !prophecy && Object.keys(profile).length === 0) {
    return (
      <Empty
        title="这次的占卜还没走到可以俯瞰的一步。"
        hint="继续作答，预言书会先把你的画像绘出来，再以它为凭推演命途；到那时这里会有一份完整的概览。"
        action={<LineButton onClick={onResume}>回到书中继续作答 ›</LineButton>}
      />
    );
  }

  const paragraphs = portrait?.summary.split(/\n+/).filter(Boolean) ?? [];
  const core = (portrait?.keywords ?? []).filter((k) => k.weight >= 4).slice(0, 10);
  const gaps = [...(portrait?.uncertain ?? []), ...missingFacets(profile).map((f) => `尚未了解：${FACETS[f].label}`)];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-6">
      {/* The epithet and the written portrait, with the words that weigh most. */}
      <Card latin="EFFIGIES" title="画像与称号" className="lg:col-span-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0">
            {portrait ? (
              <>
                <p className="font-song text-2xl tracking-[0.14em] text-ink">{portrait.title}</p>
                <div className="mt-4 flex flex-col gap-3">
                  {paragraphs.map((p, i) => (
                    <p key={i} className="font-song text-[0.82rem] leading-[2] tracking-[0.02em] text-ink/75 indent-[2em]">
                      {p}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <p className="font-song text-[0.82rem] leading-relaxed text-ink/50">画像尚未绘成，下面是已经了解到的条目。</p>
            )}
          </div>
          <div className="min-w-0">
            <p className="mb-3 font-sans text-[0.58rem] tracking-[0.25em] text-ink/40 uppercase">最突出的几点</p>
            {core.length ? (
              <ul className="flex flex-wrap gap-2">
                {core.map((k) => (
                  <li key={k.word}>
                    <Chip tone={k.weight >= 5 ? "gold" : "violet"}>{k.word}</Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-song text-[0.75rem] text-ink/40">尚未形成关键词。</p>
            )}
          </div>
        </div>
      </Card>

      {/* The figures a plan is actually built on. */}
      <div className="lg:col-span-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {KEY_FACETS.map((f) => (
            <Stat key={f} label={FACETS[f].label} value={profile[f]?.value} hint={profile[f] ? FACETS[f].hint : "画像尚未涉及这一项"} />
          ))}
        </div>
      </div>

      {/* Where the reading says to go, and what to study first. */}
      <Card latin="VIAE" title="推荐方向" className="lg:col-span-3" aside={prophecy && <span className="font-serif text-[0.6rem] text-ink/35">{prophecy.paths.length} 条</span>}>
        {prophecy ? (
          <ol className="flex flex-col gap-5">
            {prophecy.paths.map((p, i) => (
              <li key={p.name}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-song text-[0.95rem] tracking-[0.1em] text-ink">
                    <span className="mr-2 font-song text-[0.75rem] text-peach-gold">{cn(i + 1)}</span>
                    {p.name}
                  </span>
                  <span className="font-sans text-[0.8rem] text-jacaranda">{p.match}</span>
                </div>
                <div className="my-2">
                  <Meter value={p.match} />
                </div>
                <p className="font-song text-[0.75rem] leading-[1.9] text-ink/55">{p.reason}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-song text-[0.78rem] text-ink/45">命途尚未推演。</p>
        )}
      </Card>

      <Card latin="STUDIA" title="学习路线" className="lg:col-span-3">
        {prophecy ? (
          <ol className="flex flex-col gap-5 border-l border-jacaranda-light/25 pl-5">
            {prophecy.learning.map((stage) => (
              <li key={stage.stage} className="relative">
                <span className="absolute top-[0.45rem] -left-[1.4rem] size-1.5 rotate-45 border border-peach-gold bg-peach-gold" />
                <h4 className="font-song text-[0.7rem] tracking-[0.25em] text-jacaranda">{stage.stage}</h4>
                <p className="mt-1 mb-2 font-song text-[0.88rem] leading-relaxed text-ink">{stage.focus}</p>
                <ul className="flex flex-col gap-1">
                  {stage.items.map((item) => (
                    <li key={item} className="font-song text-[0.72rem] leading-[1.8] text-ink/55">
                      · {item}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-song text-[0.78rem] text-ink/45">命途尚未推演。</p>
        )}
      </Card>

      <Card latin="OPERA" title="实践机会" className="self-start lg:col-span-4">
        {prophecy ? (
          <ul className="flex flex-col gap-4">
            {prophecy.practice.map((x) => (
              <li key={x.name} className="flex gap-3">
                <span className="mt-[0.4rem] size-1.5 shrink-0 rotate-45 border border-peach-gold bg-peach-gold" />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-song text-[0.88rem] tracking-[0.06em] text-ink">
                    {x.name}
                    <Chip>{x.kind}</Chip>
                  </p>
                  <p className="mt-1 font-song text-[0.72rem] leading-[1.9] text-ink/55">{x.why}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-song text-[0.78rem] text-ink/45">命途尚未推演。</p>
        )}
      </Card>

      <div className="flex flex-col gap-5 lg:col-span-2">
        <Card latin="EMENDATIO" title="还要问清的">
          {gaps.length ? (
            <ul className="flex flex-col gap-2">
              {gaps.slice(0, 6).map((g) => (
                <li key={g} className="flex gap-2 font-song text-[0.75rem] leading-[1.8] text-ink/60">
                  <span className="mt-[0.5rem] size-1 shrink-0 rotate-45 border border-jacaranda-light" />
                  {g}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-song text-[0.75rem] leading-relaxed text-ink/45">画像里没有留下明显的疑问。</p>
          )}
          <div className="mt-4 flex items-center gap-2 border-t border-jacaranda-light/20 pt-3">
            <Dots level={3} />
            <span className="font-song text-[0.62rem] text-ink/40">亲述且有细节</span>
          </div>
        </Card>

        <Card latin="VERBUM" title="临别箴言">
          {prophecy ? (
            <p className="font-song text-[0.85rem] leading-[2] tracking-[0.04em] text-ink/80">{prophecy.counsel}</p>
          ) : (
            <p className="font-song text-[0.78rem] text-ink/45">命途尚未推演。</p>
          )}
        </Card>
      </div>
    </div>
  );
}
