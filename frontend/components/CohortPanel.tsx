import type { CallRecord } from "@/lib/api";
import { Glass } from "@/components/ui/Glass";

const OUTCOME_META: Record<
  string,
  { label: string; color: string; glow: string; chip: string }
> = {
  recovered: {
    label: "Recovered",
    color: "#34D399",
    glow: "rgba(52,211,153,0.45)",
    chip: "bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/40",
  },
  readmitted: {
    label: "Readmitted",
    color: "#FBBF24",
    glow: "rgba(251,191,36,0.45)",
    chip: "bg-amber-500/15 text-amber-200 ring-1 ring-inset ring-amber-400/40",
  },
  sepsis: {
    label: "Sepsis",
    color: "#FB923C",
    glow: "rgba(251,146,60,0.5)",
    chip: "bg-orange-500/15 text-orange-200 ring-1 ring-inset ring-orange-400/40",
  },
  died: {
    label: "Died",
    color: "#F43F5E",
    glow: "rgba(244,63,94,0.55)",
    chip: "bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-400/40",
  },
};

function meta(outcome: string) {
  return (
    OUTCOME_META[outcome] ?? {
      label: outcome,
      color: "#94A3B8",
      glow: "rgba(148,163,184,0.4)",
      chip: "bg-white/5 text-slate-300 ring-1 ring-inset ring-white/10",
    }
  );
}

export function CohortPanel({ last }: { last: CallRecord | null }) {
  const sims = last?.similar_calls ?? [];
  const outcomes = sims.reduce<Record<string, number>>((acc, s) => {
    acc[s.outcome] = (acc[s.outcome] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Glass className="overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight text-white text-on-glass">
            Similar prior cases
          </div>
          <div className="text-[11px] text-slate-400">
            Vector match across cohort_outcomes
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          {sims.length} {sims.length === 1 ? "match" : "matches"}
        </div>
      </div>

      {sims.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-8 text-center">
          <div className="text-sm font-medium text-slate-200">
            No similar cases yet
          </div>
          <div className="text-xs text-slate-500">
            A scored call is needed before cohort lookup runs.
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {sims.map((s) => {
            const m = meta(s.outcome);
            const widthPct = Math.max(2, Math.min(100, s.similarity * 100));
            return (
              <li
                key={s.case_id}
                className="group rounded-xl border border-white/10 bg-white/[0.025] p-3 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                    <span className="text-slate-500">case</span>
                    <span>{s.case_id.slice(0, 10)}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${m.chip}`}
                  >
                    {m.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${widthPct}%`,
                        background: `linear-gradient(90deg, ${m.color}, ${m.color}88)`,
                        boxShadow: `0 0 8px ${m.glow}`,
                      }}
                    />
                  </div>
                  <span className="num w-12 text-right text-xs text-slate-300">
                    {s.similarity.toFixed(2)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {Object.keys(outcomes).length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
            Outcome mix
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(outcomes).map(([outcome, count]) => {
              const m = meta(outcome);
              return (
                <span
                  key={outcome}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${m.chip}`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: m.color, boxShadow: `0 0 6px ${m.glow}` }}
                  />
                  {m.label}
                  <span className="num text-slate-400">· {count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </Glass>
  );
}
