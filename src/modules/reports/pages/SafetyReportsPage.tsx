
import { useMemo, useState } from "react";
import {
  RadioTower,
  Waves,
  Activity,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Search,
  CalendarDays,
  Download,
  FileText,
  FileSpreadsheet,
  Info,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

interface SafetyRecord {
  id: string;
  date: string;
  instrument: string;
  parameter: string;
  location: string;
  reading: string;
  status: string;
}

const metrics = [
  {
    title: "Total Instruments",
    value: "--",
    icon: RadioTower,
  },
  {
    title: "Available Instruments",
    value: "--",
    icon: Activity,
  },
  {
    title: "Unavailable Instruments",
    value: "--",
    icon: AlertTriangle,
  },
  {
    title: "Recorded Safety Events",
    value: "--",
    icon: ShieldCheck,
  },
];

const reportRecords: SafetyRecord[] = [];

export default function SafetyReportsPage() {
  const [project, setProject] = useState("tawa");
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("instrumentation");
  const [search, setSearch] = useState("");

  const projectName =
    project === "tawa" ? "Tawa Dam" : "Bansagar Dam";

  const filteredRecords = useMemo(() => {
    return reportRecords.filter((record) => {
      const searchText = search.toLowerCase();

      return (
        record.id.toLowerCase().includes(searchText) ||
        record.instrument.toLowerCase().includes(searchText) ||
        record.parameter.toLowerCase().includes(searchText) ||
        record.location.toLowerCase().includes(searchText)
      );
    });
  }, [search]);

  const reportColumns =
    reportType === "events"
      ? [
          "Event ID",
          "Date",
          "Parameter",
          "Location",
          "Status",
        ]
      : [
          "Instrument ID",
          "Instrument",
          "Parameter",
          "Location",
          "Reading",
          "Status",
        ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instrumentation & Safety Reports"
        subtitle="Review instrument availability, safety parameter readings and recorded safety events."
      />

      {/* Integration notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Info
          className="mt-0.5 shrink-0 text-amber-400"
          size={20}
        />

        <div>
          <h3 className="text-sm font-semibold text-amber-300">
            Instrumentation and safety data integration pending
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Verified instrument readings, communication records
            and safety event history are not connected yet.
            Reports will populate after backend integration.
          </p>
        </div>
      </div>

      {/* Report configuration */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5 flex items-center gap-3">
          <CalendarDays className="text-cyan-400" size={21} />

          <h2 className="font-semibold text-white">
            Report Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Select Project
            </label>

            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="tawa">Tawa Dam</option>
              <option value="bansagar">Bansagar Dam</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Reporting Period
            </label>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 3 Months</option>
              <option value="180">Last 6 Months</option>
              <option value="365">Last 1 Year</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Report Type
            </label>

            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="instrumentation">
                Instrumentation Report
              </option>
              <option value="piezometer">
                Piezometer Report
              </option>
              <option value="seepage">
                Seepage Report
              </option>
              <option value="settlement">
                Settlement Report
              </option>
              <option value="events">
                Safety Events Report
              </option>
            </select>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Project: {projectName} | Last {dateRange} days
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-cyan-500/10 p-3">
                  <Icon size={21} className="text-cyan-400" />
                </div>

                <span className="text-xs text-slate-500">
                  Unavailable
                </span>
              </div>

              <p className="mt-5 text-sm text-slate-400">
                {metric.title}
              </p>

              <h3 className="mt-2 text-2xl font-semibold text-white">
                {metric.value}
              </h3>
            </div>
          );
        })}
      </div>

      {/* Report type information */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <RadioTower className="text-cyan-400" size={22} />
          <h3 className="mt-3 font-semibold text-white">
            Instrument Health
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Instrument inventory, communication and reading availability.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <Waves className="text-cyan-400" size={22} />
          <h3 className="mt-3 font-semibold text-white">
            Piezometer & Seepage
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Pore pressure and seepage measurement history.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <Gauge className="text-cyan-400" size={22} />
          <h3 className="mt-3 font-semibold text-white">
            Structural Monitoring
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Settlement, deformation and movement observations.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ShieldCheck className="text-cyan-400" size={22} />
          <h3 className="mt-3 font-semibold text-white">
            Safety Event History
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Recorded events, acknowledgement and resolution history.
          </p>
        </div>
      </div>

      {/* Report records */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
          <div>
            <h3 className="font-semibold text-white">
              {reportType === "events"
                ? "Safety Event Records"
                : "Instrumentation Records"}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {projectName} | Historical monitoring records
            </p>
          </div>

          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records..."
              className="rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
              <tr>
                {reportColumns.map((column) => (
                  <th key={column} className="px-5 py-4">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    {reportType === "events" ? (
                      <>
                        <td className="px-5 py-4 text-cyan-400">
                          {record.id}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {record.date}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {record.parameter}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {record.location}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {record.status}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-4 text-cyan-400">
                          {record.id}
                        </td>
                        <td className="px-5 py-4 text-white">
                          {record.instrument}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {record.parameter}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {record.location}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {record.reading}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {record.status}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={reportColumns.length}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No records available. Connect the reporting API
                    to display verified instrumentation and safety data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export actions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="font-semibold text-white">
          Export Instrumentation & Safety Report
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          Export verified instrument readings and safety event
          records after connecting the reporting service.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            disabled
            title="Available after backend integration"
            className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-cyan-500/20 px-4 py-2.5 text-sm font-medium text-cyan-300 opacity-50"
          >
            <FileText size={17} />
            Export PDF
            <Download size={15} />
          </button>

          <button
            disabled
            title="Available after backend integration"
            className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-400 opacity-50"
          >
            <FileSpreadsheet size={17} />
            Export Excel
            <Download size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
