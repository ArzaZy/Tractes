import { Check, Circle } from 'lucide-react'
import { completeness, type CompletenessInput } from '../../lib/completeness'

function tone(score: number): string {
  if (score >= 100) return 'bg-emerald-500'
  if (score >= 60) return 'bg-accent'
  return 'bg-amber-500'
}

export function CompletenessBar({ score, className = '' }: { score: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        role="progressbar"
        aria-label="Publish readiness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2"
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${tone(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-9 text-xs tabular-nums text-muted">{score}%</span>
    </div>
  )
}

/** Live checklist shown on the project form; updates as the owner types. */
export function CompletenessCard({ input }: { input: CompletenessInput }) {
  const c = completeness(input)
  return (
    <section className="card p-5" aria-labelledby="readiness">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="readiness" className="text-base font-semibold text-fg">
            Publish readiness
          </h2>
          <p className="text-xs text-muted">
            {c.score === 100 ? 'Everything is filled in. Ready to publish.' : `${c.done} of ${c.total} done. A guide only, you can still publish.`}
          </p>
        </div>
        <CompletenessBar score={c.score} />
      </div>
      <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {c.items.map((i) => (
          <li key={i.key} className={`flex items-center gap-2 text-sm ${i.ok ? 'text-fg' : 'text-muted'}`}>
            {i.ok ? <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden /> : <Circle className="h-4 w-4 shrink-0" aria-hidden />}
            <span>{i.label}</span>
            <span className="sr-only">{i.ok ? ' (done)' : ' (missing)'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
