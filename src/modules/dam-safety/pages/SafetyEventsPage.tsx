import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Search,
  ShieldAlert,
  ClipboardList,
  X,
  Activity,
  RefreshCw,
  MapPin,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

type Severity = "Warning" | "Critical" | "Information";
type EventStatus = "Open" | "Acknowledged" | "Resolved";

interface SafetyEvent {
  id: string;
  title: string;
  parameter: string;
  location: string;
  severity: Severity;
  status: EventStatus;
  timestamp: number;
  description: string;
  reading: string;
}

const minutesAgo = (minutes: number) => Date.now() - minutes * 60 * 1000;

const initialEvents: SafetyEvent[] = [
  {
    id: "EVT-2026-001",
    title: " Leakage Sensor crossed watch band",
    parameter: " Leakage Sensor",
    location: "Upstream Gallery",
    severity: "Warning",
    status: "Open",
    timestamp: minutesAgo(8),
    reading: "142.68 m",
    description:
      "Illustrative monitoring event: the sample piezometric reading entered a watch band. Review the trend and compare it with approved, dam-specific engineering criteria.",
  },
  {
    id: "EVT-2026-002",
    title: "Seepage flow variation detected",
    parameter: "Seepage",
    location: "Drainage Gallery",
    severity: "Information",
    status: "Acknowledged",
    timestamp: minutesAgo(34),
    reading: "18.42 L/s",
    description:
      "Illustrative monitoring event: a change in the sample seepage reading was recorded. Check nearby observations and the instrument history.",
  },
  {
    id: "EVT-2026-003",
    title: "Settlement trend requires review",
    parameter: "Settlement",
    location: "Dam Foundation",
    severity: "Warning",
    status: "Open",
    timestamp: minutesAgo(72),
    reading: "4.82 mm",
    description:
      "Illustrative monitoring event: the sample settlement trend has been flagged for routine engineering review. This is not a confirmed structural issue.",
  },
  {
    id: "EVT-2026-004",
    title: "Uplift pressure observation logged",
    parameter: "Uplift Pressure",
    location: "Foundation Gallery",
    severity: "Information",
    status: "Resolved",
    timestamp: minutesAgo(165),
    reading: "86.35 kPa",
    description:
      "Illustrative monitoring event: a sample uplift pressure observation was reviewed and marked resolved in this demonstration workflow.",
  },
  {
    id: "EVT-2026-005",
    title: "Instrument communication delay",
    parameter: "Deformation",
    location: "Right Abutment",
    severity: "Warning",
    status: "Acknowledged",
    timestamp: minutesAgo(245),
    reading: "Last value: 2.36 mm",
    description:
      "Illustrative monitoring event: the sample inclinometer transmission was delayed. Verify communication health before interpreting the measurement as current.",
  },
  {
    id: "EVT-2026-006",
    title: "Routine inspection note recorded",
    parameter: "Visual Inspection",
    location: "Spillway Approach",
    severity: "Information",
    status: "Resolved",
    timestamp: minutesAgo(390),
    reading: "Inspection logged",
    description:
      "Illustrative event record for a routine visual inspection note. No actual inspection report is connected to this demonstration.",
  },
];

const severityStyles: Record<Severity, string> = {
  Warning: "bg-amber-50 text-amber-800 border-amber-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
  Information: "bg-sky-50 text-sky-700 border-sky-200",
};

const statusStyles: Record<EventStatus, string> = {
  Open: "bg-red-50 text-red-700 border-red-200",
  Acknowledged: "bg-amber-50 text-amber-800 border-amber-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const timeAgo = (timestamp: number, now: number) => {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${severityStyles[severity]}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export default function SafetyEventsPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [project, setProject] = useState("tawa");
  const [events, setEvents] = useState<SafetyEvent[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);
  const [now, setNow] = useState(Date.now());

  // Refresh the displayed relative timestamps without fabricating new incidents.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredEvents = useMemo(() => {
    const searchText = search.toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        event.id.toLowerCase().includes(searchText) ||
        event.title.toLowerCase().includes(searchText) ||
        event.parameter.toLowerCase().includes(searchText) ||
        event.location.toLowerCase().includes(searchText);
      const matchesSeverity = severityFilter === "All" || event.severity === severityFilter;
      const matchesStatus = statusFilter === "All" || event.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [events, search, severityFilter, statusFilter]);

  const counts = useMemo(() => ({
    total: events.length,
    open: events.filter((event) => event.status === "Open").length,
    acknowledged: events.filter((event) => event.status === "Acknowledged").length,
    resolved: events.filter((event) => event.status === "Resolved").length,
    critical: events.filter((event) => event.severity === "Critical" && event.status !== "Resolved").length,
  }), [events]);

  const updateEventStatus = (id: string, status: EventStatus) => {
    setEvents((current) =>
      current.map((event) => event.id === id ? { ...event, status } : event)
    );
    setSelectedEvent((current) =>
      current?.id === id ? { ...current, status } : current
    );
  };

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader
        title="Safety Events"
        description="Review, track and manage dam safety observations, alerts and event actions."
      />

      {/* Demonstration data notice
      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2 text-sky-700">
            <BellRing size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-sky-900">Safety Event Monitoring Preview</h3>
            <p className="mt-1 text-sm leading-relaxed text-sky-800">
              Sample event records are provided to demonstrate the monitoring workflow.
              They are not actual alerts or verified dam-safety incidents.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-sky-800">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Feed view active
        </span>
      </div> */}

      {/* Project selector and feed time */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#102B3D]">Event Overview</h2>
          <p className="text-sm text-[#64748B]">
            Selected project: {project === "tawa" ? "Tawa Dam" : "Bansagar Dam"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="rounded-lg border border-[#DCE7EE] bg-white px-4 py-2.5 text-sm font-medium text-[#16415C] outline-none focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/10"
          >
            <option value="tawa">Tawa Dam</option>
            <option value="bansagar">Bansagar Dam</option>
          </select>
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw size={14} /> Updated {new Date(now).toLocaleTimeString("en-IN")}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <ClipboardList className="text-[#0284C7]" size={22} />
          <p className="mt-4 text-sm text-[#64748B]">Total Events</p>
          <h3 className="mt-1 text-3xl font-bold text-[#102B3D]">{String(counts.total).padStart(2, "0")}</h3>
          <p className="mt-1 text-xs text-slate-500">Recorded sample events</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
          <ShieldAlert className="text-red-700" size={22} />
          <p className="mt-4 text-sm text-[#64748B]">Open Events</p>
          <h3 className="mt-1 text-3xl font-semibold text-red-700">{String(counts.open).padStart(2, "0")}</h3>
          <p className="mt-1 text-xs text-slate-500">Require review in workflow</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
          <Clock className="text-amber-700" size={22} />
          <p className="mt-4 text-sm text-[#64748B]">Acknowledged</p>
          <h3 className="mt-1 text-3xl font-semibold text-amber-700">{String(counts.acknowledged).padStart(2, "0")}</h3>
          <p className="mt-1 text-xs text-slate-500">Under assessment</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <CheckCircle2 className="text-emerald-700" size={22} />
          <p className="mt-4 text-sm text-[#64748B]">Resolved Events</p>
          <h3 className="mt-1 text-3xl font-semibold text-emerald-700">{String(counts.resolved).padStart(2, "0")}</h3>
          <p className="mt-1 text-xs text-slate-500">Closed in demo workflow</p>
        </div>
      </div>

      {/* Event attention strip */}
      <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity size={19} className="text-[#0284C7]" />
          <h3 className="font-bold text-[#102B3D]">Event Activity Summary</h3>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {counts.critical} Critical unresolved
          </span>
          <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {counts.open} Open for review
          </span>
          <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            {counts.resolved} Resolved
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#DCE7EE] bg-white p-4 shadow-sm lg:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, parameter or location..."
            className="w-full rounded-lg border border-[#DCE7EE] bg-white py-2.5 pl-10 pr-4 text-sm text-[#102B3D] placeholder:text-[#94A3B8] outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/10"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] px-4 py-2.5 text-sm text-[#102B3D] outline-none"
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="Warning">Warning</option>
          <option value="Information">Information</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] px-4 py-2.5 text-sm text-[#102B3D] outline-none"
        >
          <option value="All">All Event Statuses</option>
          <option value="Open">Open</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {/* Event register */}
      <div className="overflow-hidden rounded-xl border border-[#DCE7EE] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE7EE] p-5">
          <div>
            <h3 className="font-bold text-[#102B3D]">Event Register</h3>
            <p className="mt-1 text-xs text-[#64748B]">Recent event records · newest first</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{filteredEvents.length} records displayed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-[#EAF7FD] text-xs uppercase tracking-wide text-[#16415C]">
              <tr>
                <th className="px-5 py-4">Event ID</th>
                <th className="px-5 py-4">Event Description</th>
                <th className="px-5 py-4">Parameter / Reading</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Severity</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Time</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {[...filteredEvents].sort((a, b) => b.timestamp - a.timestamp).map((event) => (
                <tr key={event.id} className="transition-colors hover:bg-[#F5FAFD]">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#0284C7]">{event.id}</td>
                  <td className="px-5 py-4 font-medium text-[#102B3D]">{event.title}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="text-[#475569]">{event.parameter}</p>
                    <p className="mt-1 text-xs font-semibold text-[#102B3D]">{event.reading}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-[#64748B]">
                    <span className="inline-flex items-center gap-1"><MapPin size={13} />{event.location}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4"><SeverityBadge severity={event.severity} /></td>
                  <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={event.status} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-[#64748B]">
                    <p>{timeAgo(event.timestamp, now)}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(event.timestamp)}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <button onClick={() => setSelectedEvent(event)} className="text-sm font-semibold text-[#0284C7] hover:underline">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-[#64748B]">No events match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event details */}
      {selectedEvent && (
        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#0284C7]">{selectedEvent.id}</p>
              <h3 className="mt-1 text-lg font-bold text-[#102B3D]">{selectedEvent.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(selectedEvent.timestamp)}</p>
            </div>
            <button onClick={() => setSelectedEvent(null)} aria-label="Close event details" className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#EAF7FD] hover:text-[#102B3D]">
              <X size={19} />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <SeverityBadge severity={selectedEvent.severity} />
            <StatusBadge status={selectedEvent.status} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-[#64748B]">Parameter</p><p className="mt-1 text-sm font-medium text-[#102B3D]">{selectedEvent.parameter}</p></div>
            <div><p className="text-xs text-[#64748B]">Location</p><p className="mt-1 text-sm font-medium text-[#102B3D]">{selectedEvent.location}</p></div>
            <div><p className="text-xs text-[#64748B]">Observed reading</p><p className="mt-1 text-sm font-medium text-[#102B3D]">{selectedEvent.reading}</p></div>
          </div>
          <div className="mt-5 rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-4">
            <p className="text-xs font-semibold text-[#64748B]">Event Details</p>
            <p className="mt-2 text-sm leading-6 text-[#475569]">{selectedEvent.description}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {selectedEvent.status === "Open" && (
              <button onClick={() => updateEventStatus(selectedEvent.id, "Acknowledged")} className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700">
                Acknowledge Event
              </button>
            )}
            {selectedEvent.status !== "Resolved" && (
              <button onClick={() => updateEventStatus(selectedEvent.id, "Resolved")} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Mark as Resolved
              </button>
            )}
            {selectedEvent.status === "Resolved" && (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={17} /> Event resolved</span>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Status changes are local to this demonstration page and are not saved to a backend.
          </p>
        </div>
      )}
    </div>
  );
}
