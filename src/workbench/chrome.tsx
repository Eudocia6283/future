import type { ReactNode } from "react";

// The workbench's own furniture: hairline panels and small data marks, in the
// Atelier's palette but laid out as a console rather than a book page. Sizes
// are ordinary CSS sizes here — the book's `em`-off-the-page-width scaling
// stops at the book, and the workbench fills the window instead.

/** A Latin rubric over a Chinese heading, as on the book's own pages. */
export function SectionTitle({ latin, children, aside }: { latin: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col items-start">
        <span className="font-serif text-[0.6rem] tracking-[0.35em] text-jacaranda uppercase">{latin}</span>
        <span className="my-1.5 h-px w-10 bg-peach-gold" />
        <h2 className="font-song text-base tracking-[0.18em] text-ink/85">{children}</h2>
      </div>
      {aside}
    </div>
  );
}

/** A bordered panel, with an optional rubric heading along its top. */
export function Card({ latin, title, aside, children, className = "" }: { latin?: string; title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col border border-jacaranda-light/25 bg-white/75 ${className}`}>
      {(latin || title || aside) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-jacaranda-light/20 px-4 py-2.5">
          <div className="flex items-baseline gap-3">
            {latin && <span className="font-serif text-[0.58rem] tracking-[0.3em] text-jacaranda uppercase">{latin}</span>}
            {title && <h3 className="font-song text-[0.82rem] tracking-[0.15em] text-ink/80">{title}</h3>}
          </div>
          {aside}
        </header>
      )}
      <div className="min-w-0 flex-1 p-4">{children}</div>
    </section>
  );
}

/** One figure of the seeker's situation. An unknown entry stays a dash, and says so. */
export function Stat({ label, value, hint }: { label: string; value?: string; hint?: string }) {
  const known = !!value;
  return (
    <div className="flex flex-col gap-1 border border-jacaranda-light/20 bg-white/70 px-3 py-2.5">
      <span className="font-sans text-[0.58rem] tracking-[0.2em] text-ink/40 uppercase">{label}</span>
      <span className={`font-song text-[0.95rem] leading-snug tracking-[0.06em] ${known ? "text-ink" : "text-ink/25"}`}>{known ? value : "—"}</span>
      {hint && <span className="font-song text-[0.62rem] leading-relaxed text-ink/45">{hint}</span>}
    </div>
  );
}

/** A hairline measure, filled from the left. */
export function Meter({ value, tone = "gold" }: { value: number; tone?: "gold" | "violet" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className="relative block h-px w-full bg-jacaranda-light/25" role="img" aria-label={`${Math.round(pct)}%`}>
      <span className={`absolute inset-y-0 left-0 ${tone === "gold" ? "bg-peach-gold" : "bg-jacaranda"}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

/** A small bordered label. */
export function Chip({ children, tone = "violet" }: { children: ReactNode; tone?: "violet" | "gold" | "plain" }) {
  const tones = {
    violet: "border-jacaranda-light/60 text-jacaranda",
    gold: "border-peach-gold text-[#a07a5f]",
    plain: "border-ink/15 text-ink/50",
  } as const;
  return <span className={`inline-block border px-2 py-0.5 font-song text-[0.62rem] leading-relaxed tracking-[0.16em] ${tones[tone]}`}>{children}</span>;
}

/** How well grounded an entry is: three diamonds, gilded when confirmed. */
export function Dots({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-1" title={`把握 ${level} / 3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`size-1.5 shrink-0 rotate-45 border ${
            i <= level ? (level >= 3 ? "border-peach-gold bg-peach-gold" : "border-jacaranda bg-jacaranda/70") : "border-ink/20 bg-transparent"
          }`}
        />
      ))}
    </span>
  );
}

/** What a page shows while the book has not reached it yet. */
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-jacaranda-light/40 bg-white/60 px-6 py-10">
      <p className="font-song text-[0.95rem] tracking-[0.12em] text-ink/60">{title}</p>
      {hint && <p className="max-w-[38em] font-song text-[0.75rem] leading-relaxed text-ink/45">{hint}</p>}
      {action}
    </div>
  );
}

/** A quiet button: a gold hairline, then its label, which glows on hover. */
export function LineButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group flex cursor-pointer items-center gap-2 font-song text-[0.78rem] tracking-[0.2em] text-jacaranda transition-opacity disabled:cursor-default disabled:opacity-30"
    >
      <span className="h-px w-6 bg-peach-gold" />
      <span className="glow-text-group">{children}</span>
    </button>
  );
}
