
import type { LucideIcon } from "lucide-react";
import SafetyStatusBadge from "./SafetyStatusBadge";

type SafetyStatus =
  | "normal"
  | "warning"
  | "critical"
  | "unavailable";

interface SafetyMetricCardProps {
  title: string;
  value: string;
  unit?: string;
  description: string;
  icon: LucideIcon;
  status: SafetyStatus;
}

export default function SafetyMetricCard({
  title,
  value,
  unit,
  description,
  icon: Icon,
  status,
}: SafetyMetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-cyan-500/10 p-3">
          <Icon size={21} className="text-cyan-400" />
        </div>

        <SafetyStatusBadge status={status} />
      </div>

      <div className="mt-5">
        <p className="text-sm text-slate-400">{title}</p>

        <div className="mt-2 flex items-baseline gap-2">
          <h3 className="text-2xl font-semibold text-white">
            {value}
          </h3>
          {unit && (
            <span className="text-sm text-slate-400">{unit}</span>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
