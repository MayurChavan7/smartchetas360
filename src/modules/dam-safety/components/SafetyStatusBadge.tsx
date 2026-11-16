
type SafetyStatus =
  | "normal"
  | "warning"
  | "critical"
  | "unavailable";

interface SafetyStatusBadgeProps {
  status: SafetyStatus;
}

const statusConfig = {
  normal: {
    label: "Normal",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  warning: {
    label: "Warning",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  critical: {
    label: "Critical",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  unavailable: {
    label: "Data Unavailable",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

export default function SafetyStatusBadge({
  status,
}: SafetyStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${config.className}`}
    >
      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
