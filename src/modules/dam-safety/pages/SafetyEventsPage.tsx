
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ShieldAlert,
  ClipboardList,
  X,
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
  date: string;
  description: string;
}

const demoEvents: SafetyEvent[] = [
  {
    id: "DEMO-001",
    title: "Piezometric reading review",
    parameter: "Piezometric Level",
    location: "Upstream Gallery",
    severity: "Warning",
    status: "Open",
    date: "Demonstration record",
    description:
      "Illustrative event for reviewing a piezometric reading against approved engineering criteria.",
  },
  {
    id: "DEMO-002",
    title: "Seepage data review",
    parameter: "Seepage",
    location: "Drainage Gallery",
    severity: "Information",
    status: "Acknowledged",
    date: "Demonstration record",
    description:
      "Illustrative event for reviewing seepage observations and associated instrument readings.",
  },
  {
    id: "DEMO-003",
    title: "Settlement observation review",
    parameter: "Settlement",
    location: "Dam Foundation",
    severity: "Critical",
    status: "Resolved",
    date: "Demonstration record",
    description:
      "Illustrative event for demonstrating the event resolution workflow. This is not an actual critical incident.",
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

export default function SafetyEventsPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedEvent, setSelectedEvent] =
    useState<SafetyEvent | null>(null);

  const filteredEvents = useMemo(() => {
    return demoEvents.filter((event) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        event.id.toLowerCase().includes(searchText) ||
        event.title.toLowerCase().includes(searchText) ||
        event.parameter.toLowerCase().includes(searchText) ||
        event.location.toLowerCase().includes(searchText);

      const matchesSeverity =
        severityFilter === "All" || event.severity === severityFilter;

      const matchesStatus =
        statusFilter === "All" || event.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [search, severityFilter, statusFilter]);

  const openCount = demoEvents.filter(
    (event) => event.status === "Open"
  ).length;

  const acknowledgedCount = demoEvents.filter(
    (event) => event.status === "Acknowledged"
  ).length;

  const resolvedCount = demoEvents.filter(
    (event) => event.status === "Resolved"
  ).length;

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader
        title="Safety Events"
        description="Review, track and manage dam safety event records."
      />

      {/* Demo notice */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={20} />
        <div>
          <h3 className="text-sm font-semibold text-amber-800">
            Demonstration event records
          </h3>
          <p className="mt-1 text-sm text-[#64748B]">
            The events displayed here are illustrative examples
            for UI development. No actual safety incidents or
            alerts have been received from the backend.
          </p>
        </div>
      </div>

      {/* Project selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#102B3D]">
            Event Overview
          </h2>
          <p className="text-sm text-[#64748B]">
            Selected project: Tawa Dam
          </p>
        </div>

        <select
          defaultValue="tawa"
          className="rounded-lg border border-[#DCE7EE] bg-white px-4 py-2.5 text-sm font-medium text-[#16415C] outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/10"
        >
          <option value="tawa">Tawa Dam</option>
          <option value="bansagar">Bansagar Dam</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <ClipboardList className="text-[#0284C7]" size={22} />
          <p className="mt-4 text-sm text-[#64748B]">Total Events</p>
          <h3 className="mt-1 text-3xl font-bold text-[#102B3D]">
            {demoEvents.length.toString().padStart(2, "0")}
          </h3>
        </div>

        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <ShieldAlert className="text-red-700" size={22} />
          <p className="mt-4 text-sm text-[#64748B]">Open Events</p>
          <h3 className="mt-1 text-3xl font-semibold text-red-700">
            {openCount.toString().padStart(2, "0")}
          </h3>
        </div>

        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <Clock className="text-amber-700" size={22} />
          <p className="mt-4 text-sm text-[#64748B]">Acknowledged</p>
          <h3 className="mt-1 text-3xl font-semibold text-amber-700">
            {acknowledgedCount.toString().padStart(2, "0")}
          </h3>
        </div>

        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <CheckCircle2 className="text-emerald-700" size={22} />
          <p className="mt-4 text-sm text-[#64748B]">Resolved Events</p>
          <h3 className="mt-1 text-3xl font-semibold text-emerald-700">
            {resolvedCount.toString().padStart(2, "0")}
          </h3>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#DCE7EE] bg-white p-4 shadow-sm lg:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
          />
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

      {/* Event table */}
      <div className="overflow-hidden rounded-xl border border-[#DCE7EE] bg-white shadow-sm">
        <div className="border-b border-[#DCE7EE] p-5">
          <h3 className="font-bold text-[#102B3D]">Event Register</h3>
          <p className="mt-1 text-xs text-[#64748B]">
            {filteredEvents.length} demonstration record(s)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-[#EAF7FD] text-xs uppercase tracking-wide text-[#16415C]">
              <tr>
                <th className="px-5 py-4">Event ID</th>
                <th className="px-5 py-4">Event Description</th>
                <th className="px-5 py-4">Parameter</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Severity</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-[#EAF7FD]/40">
                  <td className="px-5 py-4 font-medium text-[#0284C7]">
                    {event.id}
                  </td>
                  <td className="px-5 py-4 text-[#102B3D]">{event.title}</td>
                  <td className="px-5 py-4 text-[#64748B]">
                    {event.parameter}
                  </td>
                  <td className="px-5 py-4 text-[#64748B]">
                    {event.location}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-3 py-1 text-xs ${severityStyles[event.severity]}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[event.status]}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="text-sm font-medium text-[#0284C7] hover:text-[#0284C7]"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}

              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#64748B]">
                    No events match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event details panel */}
      {selectedEvent && (
        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#0284C7]">{selectedEvent.id}</p>
              <h3 className="mt-1 text-lg font-bold text-[#102B3D]">
                {selectedEvent.title}
              </h3>
            </div>

            <button
              onClick={() => setSelectedEvent(null)}
              aria-label="Close event details"
              className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#EAF7FD] hover:text-[#102B3D]"
            >
              <X size={19} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs ${severityStyles[selectedEvent.severity]}`}>
              {selectedEvent.severity}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[selectedEvent.status]}`}>
              {selectedEvent.status}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[#64748B]">Parameter</p>
              <p className="mt-1 text-sm text-[#102B3D]">{selectedEvent.parameter}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Location</p>
              <p className="mt-1 text-sm text-[#102B3D]">{selectedEvent.location}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Recorded Date</p>
              <p className="mt-1 text-sm text-[#102B3D]">{selectedEvent.date}</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-4">
            <p className="text-xs text-[#64748B]">Event Details</p>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              {selectedEvent.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
