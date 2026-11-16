
import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Waves,
  Activity,
  Database,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  CalendarDays,
  Info,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

interface DischargeRecord {
  date: string;
  inflow: string;
  spillway: string;
  canal: string;
  totalOutflow: string;
  cumulative: string;
}

const reportColumns = [
  "Date",
  "Inflow (m³/s)",
  "Spillway (m³/s)",
  "Canal (m³/s)",
  "Total Outflow (m³/s)",
  "Cumulative Discharge",
];

const metrics = [
  {
    title: "Total Inflow",
    unit: "m³/s",
    icon: ArrowDownToLine,
  },
  {
    title: "Spillway Discharge",
    unit: "m³/s",
    icon: Waves,
  },
  {
    title: "Canal Discharge",
    unit: "m³/s",
    icon: ArrowUpFromLine,
  },
  {
    title: "Total Outflow",
    unit: "m³/s",
    icon: Activity,
  },
  {
    title: "Cumulative Discharge",
    unit: "MCM",
    icon: Database,
  },
];

export default function DischargeReportsPage() {
  const [project, setProject] = useState("tawa");
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("daily");
  const [search, setSearch] = useState("");

  // Empty until verified backend telemetry is connected.
  const reportRecords: DischargeRecord[] = [];

  const filteredRecords = useMemo(
    () =>
      reportRecords.filter((record) =>
        record.date.toLowerCase().includes(search.toLowerCase())
      ),
    [reportRecords, search]
  );

  const projectName =
    project === "tawa" ? "Tawa Dam" : "Bansagar Dam";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discharge Reports"
        subtitle="Generate and review reservoir inflow, spillway, canal and cumulative discharge reports."
      />

      {/* Integration notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Info className="mt-0.5 shrink-0 text-amber-400" size={20} />

        <div>
          <h3 className="text-sm font-semibold text-amber-300">
            Discharge report integration pending
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Verified discharge readings are not connected yet.
            Report generation and downloads will be enabled
            after integrating the .NET reporting API.
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
              <option value="daily">Daily Summary</option>
              <option value="hourly">Hourly Report</option>
              <option value="monthly">Monthly Summary</option>
              <option value="historical">Historical Data</option>
            </select>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Project: {projectName} | Last {dateRange} days |{" "}
          {reportType} report
        </p>
      </div>

      {/* Discharge metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-2xl font-semibold text-white">
                  --
                </h3>
                <span className="text-sm text-slate-400">
                  {metric.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discharge records */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
          <div>
            <h3 className="font-semibold text-white">
              Discharge Report Records
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {projectName} | Historical discharge readings
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
              placeholder="Search date..."
              className="rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
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
                  <tr key={record.date}>
                    <td className="px-5 py-4 text-white">
                      {record.date}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {record.inflow}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {record.spillway}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {record.canal}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {record.totalOutflow}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {record.cumulative}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No discharge records available. Connect the
                    reporting API to display verified readings.
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
          Export Discharge Report
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          Export the selected project's discharge records
          after connecting the reporting service.
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
