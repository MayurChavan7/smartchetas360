import { useState } from "react";
import {
  FileText,
  Waves,
  Activity,
  CloudRain,
  ShieldCheck,
  Download,
  Search,
  FileSpreadsheet,
  FileBarChart,
  Clock,
  Info,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";

const reportCategories = [
  {
    title: "Reservoir Reports",
    description: "Water level, storage and reservoir capacity reports.",
    icon: Waves,
    path: "/reports/reservoir",
    count: "01",
  },
  {
    title: "Discharge Reports",
    description: "Inflow, spillway and canal discharge reports.",
    icon: Activity,
    path: "/reports/discharge",
    count: "01",
  },
  {
    title: "Rainfall Reports",
    description: "Daily, monthly and annual rainfall reports.",
    icon: CloudRain,
    path: "/reports/rainfall",
    count: "01",
  },
  {
    title: "Instrumentation & Safety",
    description: "Instrument readings and safety event reports.",
    icon: ShieldCheck,
    path: "/reports/safety",
    count: "01",
  },
];

const recentReports = [
  {
    id: "RPT-001",
    name: "Reservoir Level Report",
    category: "Reservoir",
    project: "Tawa Dam",
    period: "Last 7 Days",
    status: "Not Generated",
  },
  {
    id: "RPT-002",
    name: "Inflow & Outflow Report",
    category: "Discharge",
    project: "Bansagar Dam",
    period: "Last 30 Days",
    status: "Not Generated",
  },
  {
    id: "RPT-003",
    name: "Rainfall Summary Report",
    category: "Rainfall",
    project: "Tawa Dam",
    period: "Last 30 Days",
    status: "Not Generated",
  },
];

export default function Reports() {
  const [selectedProject, setSelectedProject] = useState("tawa");
  const [dateRange, setDateRange] = useState("30");
  const [search, setSearch] = useState("");

  const filteredReports = recentReports.filter((report) => {
    const matchesSearch =
      report.name.toLowerCase().includes(search.toLowerCase()) ||
      report.category.toLowerCase().includes(search.toLowerCase());

    const matchesProject =
      selectedProject === "all" ||
      report.project.toLowerCase().includes(selectedProject);

    return matchesSearch && matchesProject;
  });

  const selectClass =
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/15 sm:w-auto";

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader
        title="Reports & Data Export"
        subtitle="Generate, manage and export dam monitoring reports."
      />

      {/* Integration notice */}
      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-start">
        <Info className="mt-0.5 shrink-0 text-[#0083BD]" size={20} />
        <div>
          <h3 className="text-sm font-semibold text-[#07577C]">
            Report generation integration pending
          </h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Report generation and downloadable files will be enabled after
            connecting the existing .NET reporting APIs and verified database
            records.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold text-[#102B3D]">
            Report Center
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a report category to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            aria-label="Filter by project"
            className={selectClass}
          >
            <option value="all">All Projects</option>
            <option value="tawa">Tawa Dam</option>
            <option value="bansagar">Bansagar Dam</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            aria-label="Select report date range"
            className={selectClass}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last 1 Year</option>
          </select>
        </div>
      </div>

      {/* Report summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Report Categories",
            value: "04",
            icon: FileText,
            iconClass: "bg-sky-50 text-[#0083BD]",
          },
          {
            title: "Available Templates",
            value: "04",
            icon: FileBarChart,
            iconClass: "bg-cyan-50 text-cyan-700",
          },
          {
            title: "Generated Reports",
            value: "--",
            icon: Clock,
            iconClass: "bg-amber-50 text-amber-600",
          },
          {
            title: "Downloadable Files",
            value: "--",
            icon: Download,
            iconClass: "bg-indigo-50 text-indigo-600",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.iconClass}`}
              >
                <Icon size={21} />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">
                {item.title}
              </p>
              <h3 className="mt-1 text-3xl font-bold tabular-nums text-[#102B3D]">
                {item.value}
              </h3>
            </div>
          );
        })}
      </section>

      {/* Report categories */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#102B3D]">
            Report Categories
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Browse reports by monitoring domain.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {reportCategories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                key={category.path}
                to={category.path}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-sky-50 p-3 text-[#0083BD] transition group-hover:bg-sky-100">
                    <Icon size={23} />
                  </div>
                  <ChevronRight
                    size={19}
                    className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#0098DB]"
                  />
                </div>

                <h3 className="mt-5 font-semibold text-[#102B3D]">
                  {category.title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {category.description}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    Report templates
                  </span>
                  <span className="text-sm font-semibold text-[#0083BD]">
                    {category.count}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Report history */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-[#102B3D]">Report History</h3>
            <p className="mt-1 text-xs text-slate-500">
              Illustrative report requests, not generated files.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              aria-label="Search reports"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/15"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Report ID</th>
                <th className="px-5 py-4 font-semibold">Report Name</th>
                <th className="px-5 py-4 font-semibold">Project</th>
                <th className="px-5 py-4 font-semibold">Period</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="transition-colors hover:bg-sky-50/50"
                >
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#0083BD]">
                    {report.id}
                  </td>
                  <td className="px-5 py-4 font-medium text-[#102B3D]">
                    {report.name}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {report.project}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {report.period}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      {report.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredReports.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No matching reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Export information */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <FileSpreadsheet size={23} />
          </div>
          <h3 className="mt-3 font-semibold text-[#102B3D]">Excel Export</h3>
          <p className="mt-2 text-sm leading-5 text-slate-500">
            Export structured monitoring records and historical data into
            Excel spreadsheets.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-[#0083BD]">
            <FileText size={23} />
          </div>
          <h3 className="mt-3 font-semibold text-[#102B3D]">PDF Reports</h3>
          <p className="mt-2 text-sm leading-5 text-slate-500">
            Generate formatted reports with project information, reporting
            periods, tables and charts.
          </p>
        </div>
      </section>

      {/* Footer note */}
      <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row">
        <p>SMART DAM 360 · Reports & Data Export</p>
        <p>Chetas Control Systems · Report integration pending</p>
      </footer>
    </div>
  );
}
