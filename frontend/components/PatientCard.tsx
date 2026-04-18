import Link from "next/link";
import type { Patient } from "@/lib/api";

export function PatientCard({ p }: { p: Patient }) {
  return (
    <Link
      href={`/patients/${p.id}`}
      className="block rounded-lg border border-slate-800 p-4 hover:border-slate-600"
    >
      <div className="font-semibold">{p.name}</div>
      <div className="text-sm text-slate-400">
        {p.surgery_type} · {p.call_count} calls
      </div>
    </Link>
  );
}
