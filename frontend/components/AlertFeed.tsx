"use client";

import Link from "next/link";
import { api, type Alert } from "@/lib/api";
import { usePolling } from "@/lib/hooks/usePolling";
import { Glass } from "@/components/ui/Glass";
import { SeverityChip } from "@/components/ui/SeverityChip";
import {
  actionToSeverity,
  formatRelative,
  severityMeta,
} from "@/lib/format";

export function AlertFeed({ initial }: { initial?: Alert[] }) {
  const { data } = usePolling<Alert[]>(api.alerts, 5_000, initial ?? []);
  const alerts = data ?? initial ?? [];

  return (
    <Glass className="overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight text-white text-on-glass">
            Live alert feed
          </div>
          <div className="text-[11px] text-slate-400">
            Auto-refreshing every 5s
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
          </span>
          Live
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-emerald-300">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-sm font-medium text-slate-200">All clear</div>
          <div className="text-xs text-slate-500">No active alerts</div>
        </div>
      ) : (
        <ul className="scrollbar-thin max-h-[560px] space-y-2 overflow-y-auto pr-1">
          {alerts.map((a) => {
            const sev = actionToSeverity(a.severity);
            const meta = severityMeta(sev);
            const isCrit = a.severity === "suggest_911";
            return (
              <li key={a.id}>
                <Link
                  href={`/patients/${a.patient_id}`}
                  className="block focus:outline-none"
                >
                  <div
                    className={
                      "group relative flex items-start gap-3 rounded-xl border p-3 transition " +
                      "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05] "
                    }
                  >
                    <div
                      className="mt-0.5 h-8 w-1 rounded-full"
                      style={{
                        background: `linear-gradient(180deg, ${meta.color} 0%, transparent 100%)`,
                        boxShadow: `0 0 12px ${meta.glow}`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <SeverityChip severity={sev} size="sm" pulse={isCrit} />
                        <span className="text-[11px] text-slate-500">
                          {formatRelative(a.sent_at)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-xs text-slate-300">
                        Routed via{" "}
                        <span className="text-slate-100">
                          {a.channel.join(", ") || "—"}
                        </span>
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300"
                    >
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Glass>
  );
}
