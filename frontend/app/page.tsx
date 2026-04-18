import { api } from "@/lib/api";
import { PatientCard } from "@/components/PatientCard";

export default async function Dashboard() {
  const [patients, alerts] = await Promise.all([
    api.patients(),
    api.alerts(),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <section className="md:col-span-2">
        <h2 className="mb-2 text-lg font-semibold">Patients</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {patients.map((p) => (
            <PatientCard key={p.id} p={p} />
          ))}
        </div>
      </section>
      <aside>
        <h2 className="mb-2 text-lg font-semibold">Recent alerts</h2>
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="rounded border border-slate-800 bg-slate-900 p-3 text-sm"
            >
              <div className="font-mono">{a.severity}</div>
              <div className="text-slate-400">
                {new Date(a.sent_at).toLocaleTimeString()}
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
