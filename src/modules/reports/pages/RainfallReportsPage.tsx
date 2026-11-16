
import { useMemo, useState } from "react";
import {
  CloudRain,
  Droplets,
  CalendarDays,
  TrendingUp,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Activity,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

interface RainfallRecord {
  date: string;
  daily: string;
  monthly: string;
  annual: string;
  station: string;
}

const reportColumns = [
  "Date",
  "Rainfall Station",
  "Daily Rainfall (mm)",
  "Monthly Total (mm)",
  "Annual Total (mm)",
];

export default function RainfallReportsPage() {
  const [project, setProject] = useState("tawa");
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("daily");
  const [search, setSearch] = useState("");

  // Populated after verified rainfall API integration.
  const reportRecords: RainfallRecord[] = [];

  const filteredRecords = useMemo(
    () =>
      reportRecords.filter((record) =>
        `${record.date} ${record.station}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [reportRecords, search]
  );

  const projectName =
    project === "tawa" ? "Tawa Dam" : "Bansagar Dam";

  const metrics = [
    {
      title: "Daily Rainfall",
      unit: "mm",
      icon: CloudRain,
    },
    {
      title: "Monthly Rainfall",
      unit: "mm",
      icon: Droplets,
    },
    {
      title: "Annual Rainfall",
      unit: "mm",
      icon: CalendarDays,
    },
    {
      title: "Rainfall Variation",
      unit: "%",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rainfall Reports"
        subtitle="View and prepare daily, monthly and annual rainfall reports for dam projects."
      />

      {/* Integration notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Info className="mt-0.5 shrink-0 text-amber-400" size={20} />

        <div>
          <h3 className="text-sm font-semibold text-amber-300">
            Rainfall report integration pending
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Verified rainfall station readings and historical
            records are not connected yet. Report generation
            and downloads will be enabled after backend integration.
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
              <option value="daily">Daily Rainfall</option>
              <option value="monthly">Monthly Summary</option>
              <option value="annual">Annual Summary</option>
              <option value="historical">Historical Data</option>
            </select>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Project: {projectName} | Last {dateRange} days |{" "}
          {reportType} report
        </p>
      </div>

      {/* Rainfall metrics */}
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

      {/* Rainfall records */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
          <div>
            <h3 className="font-semibold text-white">
              Rainfall Report Records
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {projectName} | Historical rainfall readings
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
              placeholder="Search date or station..."
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
                  <tr key={record.date}>
                    <td className="px-5 py-4 text-white">
                      {record.date}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {record.station}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {record.daily}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {record.monthly}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {record.annual}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No rainfall records available. Connect the
                    reporting API to display verified readings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rainfall information */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <CloudRain className="text-cyan-400" size={22} />

          <h3 className="mt-3 font-semibold text-white">
            Daily Rainfall Summary
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            Review rainfall observations for each reporting
            day and monitoring station.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <Activity className="text-cyan-400" size={22} />

          <h3 className="mt-3 font-semibold text-white">
            Historical Rainfall Analysis
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            Compare rainfall totals across monthly and annual
            reporting periods.
          </p>
        </div>
      </div>

      {/* Export actions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="font-semibold text-white">
          Export Rainfall Report
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          Export the selected project's rainfall records
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
