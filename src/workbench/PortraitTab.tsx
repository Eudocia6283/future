import { DIMENSIONS, DIMENSION_LABELS, FACETS, FACET_KEYS, isKnown } from "../../shared/oracle";
import { WordCloud } from "../prophecy/WordCloud";
import { Card, Chip, Dots, Empty, LineButton } from "./chrome";
import { DimensionChart } from "./DimensionChart";
import type { WorkbenchData } from "./data";

// The portrait's page in full: the cloud, how much of each side is known, and
// every entry the book wrote down with the seeker's own words behind it. This
// is the page that shows the questionnaire actually gathered something.

export function PortraitTab({ data, onResume }: { data: WorkbenchData; onResume: () => void }) {
  const { portrait, profile } = data;
  const total = FACET_KEYS.length;
  const known = FACET_KEYS.filter((f) => profile[f]).length;
  const required = FACET_KEYS.filter((f) => FACETS[f].required);
  const requiredKnown = required.filter((f) => isKnown(profile, f)).length;

  if (!portrait && known === 0) {
    return (
      <Empty
        title="画像还没有开始成形。"
        hint="预言书每听你说一句，就把它拆进画像的条目里。作答之后回到这里，就能看到完整的条目、依据与把握程度。"
        action={<LineButton onClick={onResume}>回到书中继续作答 ›</LineButton>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card latin="NUBES" title="关键词云">
          {portrait ? (
            <div className="h-[21rem]">
              <WordCloud keywords={portrait.keywords} />
            </div>
          ) : (
            <p className="font-song text-[0.78rem] leading-relaxed text-ink/45">画像尚未绘成，关键词云要等预言书收尾之后才会出现。</p>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card
            latin="COGNITIO"
            title="七个维度的了解程度"
            aside={
              <span className="font-sans text-[0.62rem] tracking-[0.15em] text-ink/45">
                条目 {known} / {total} · 必需 {requiredKnown} / {required.length}
              </span>
            }
          >
            <DimensionChart profile={profile} />
          </Card>
          <Card latin="NOMEN" title="称号">
            {portrait ? (
              <p className="font-song text-xl tracking-[0.14em] text-ink">{portrait.title}</p>
            ) : (
              <p className="font-song text-[0.78rem] text-ink/45">尚未定下称号。</p>
            )}
          </Card>
        </div>
      </div>

      <Card latin="TABULA" title="画像条目明细" aside={<span className="font-sans text-[0.62rem] tracking-[0.15em] text-ink/45">依据 · 把握 · 来源</span>}>
        <div className="flex flex-col gap-6">
          {DIMENSIONS.map((dim) => {
            const facets = FACET_KEYS.filter((f) => FACETS[f].dim === dim);
            const got = facets.filter((f) => profile[f]).length;
            if (got === 0) {
              return (
                <section key={dim}>
                  <h4 className="mb-1 flex items-baseline gap-3 border-b border-jacaranda-light/20 pb-1.5">
                    <span className="font-song text-[0.78rem] tracking-[0.2em] text-ink/70">{DIMENSION_LABELS[dim]}</span>
                    <span className="font-sans text-[0.6rem] text-ink/30">尚无条目</span>
                  </h4>
                </section>
              );
            }
            return (
              <section key={dim}>
                <h4 className="mb-1 flex items-baseline justify-between gap-3 border-b border-jacaranda-light/20 pb-1.5">
                  <span className="font-song text-[0.78rem] tracking-[0.2em] text-ink/70">{DIMENSION_LABELS[dim]}</span>
                  <span className="font-sans text-[0.6rem] tracking-[0.15em] text-ink/35">
                    {got} / {facets.length}
                  </span>
                </h4>
                <ul className="flex flex-col divide-y divide-jacaranda-light/15">
                  {facets.map((f) => {
                    const fact = profile[f];
                    return (
                      <li key={f} className="py-2.5">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                          <span className="w-[6.5rem] shrink-0 font-song text-[0.72rem] tracking-[0.08em] text-ink/45">
                            {FACETS[f].label}
                            {FACETS[f].required && <span className="ml-1 text-peach-gold">*</span>}
                          </span>
                          <span className={`min-w-0 flex-1 font-song text-[0.82rem] leading-relaxed ${fact ? "text-ink/85" : "text-ink/25"}`}>
                            {fact ? fact.value : "—（未了解）"}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {fact && <Dots level={fact.confidence} />}
                            {fact && <Chip tone={fact.source === "stated" ? "violet" : "plain"}>{fact.source === "stated" ? "亲述" : "推断"}</Chip>}
                          </span>
                        </div>
                        {fact?.evidence && <p className="mt-1 font-song text-[0.65rem] leading-relaxed text-ink/40 sm:pl-[6.5rem]">依据：{fact.evidence}</p>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <p className="mt-5 border-t border-jacaranda-light/20 pt-3 font-song text-[0.65rem] leading-relaxed text-ink/40">
          * 为必需条目。把握程度三档：三点全为桃金者，是求问者给出了具体细节或经追问确认；紫色两点者，是说过但较笼统；一点者，是由其他回答推断而来。
        </p>
      </Card>
    </div>
  );
}
