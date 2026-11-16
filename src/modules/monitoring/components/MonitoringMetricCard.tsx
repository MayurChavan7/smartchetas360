
import type { LucideIcon } from "lucide-react";

interface MonitoringMetricCardProps {
  title: string;
  value: string;
  unit?: string;
  description: string;
  icon: LucideIcon;
  status?: "available" | "pending";
}

function MonitoringMetricCard({
  title,
  value,
  unit,
  description,
  icon: Icon,
  status = "pending",
}: MonitoringMetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500/30">

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>

        <Icon size={22} className="text-cyan-400" />
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <h2 className="text-3xl font-bold text-white">
          {value}
        </h2>

        {unit && (
          <span className="text-sm text-slate-400">{unit}</span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{description}</p>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${
            status === "available"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {status === "available" ? "Available" : "Pending"}
        </span>
      </div>
    </div>
  );
}

export default MonitoringMetricCard;
