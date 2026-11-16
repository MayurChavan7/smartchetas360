
import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  GitCompareArrows,
  Waves,
  Droplets,
  ArrowDownToLine,
  ArrowUpFromLine,
  CloudRain,
  Info,
  ChartLine,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

const comparisonMetrics = [
  {
    title: "Reservoir Level",
    unit: "m",
    description: "Compare current reservoir levels",
    icon: Waves,
  },
  {
    title: "Live Storage",
    unit: "MCM",
    description: "Compare available water storage",
    icon: Droplets,
  },
  {
    title: "Total Inflow",
    unit: "m³/s",
    description: "Compare incoming water discharge",
    icon: ArrowDownToLine,
  },
  {
    title: "Total Outflow",
    unit: "m³/s",
    description: "Compare outgoing water discharge",
    icon: ArrowUpFromLine,
  },
  {
    title: "Rainfall",
    unit: "mm",
    description: "Compare accumulated rainfall",
    icon: CloudRain,
  },
];

const createComparisonChart = (
  title: string,
  unit: string,
  seriesNames: string[]
) => ({
  backgroundColor: "transparent",

  title: {
    text: title,
    left: 0,
    textStyle: {
      color: "#e2e8f0",
      fontSize: 15,
      fontWeight: 600,
    },
  },

  tooltip: {
    trigger: "axis",
  },

  legend: {
    top: 5,
    right: 0,
    data: seriesNames,
    textStyle: {
      color: "#94a3b8",
    },
  },

  grid: {
    left: 55,
    right: 25,
    top: 65,
    bottom: 40,
  },

  xAxis: {
    type: "category",
    data: [],
    axisLabel: {
      color: "#94a3b8",
    },
    axisLine: {
      lineStyle: {
        color: "#334155",
      },
    },
  },

  yAxis: {
    type: "value",
    name: unit,
    nameTextStyle: {
      color: "#94a3b8",
    },
    axisLabel: {
      color: "#94a3b8",
    },
    splitLine: {
      lineStyle: {
        color: "#1e293b",
      },
    },
  },

  series: seriesNames.map((name) => ({
    name,
    type: "line",
    data: [],
    smooth: true,
    showSymbol: false,
  })),

  graphic: [
    {
      type: "text",
      left: "center",
      top: "middle",
      style: {
        text: "Comparison data will appear after backend integration",
        fill: "#94a3b8",
        fontSize: 13,
        textAlign: "center",
      },
    },
  ],
});

export default function ComparativeAnalyticsPage() {
  const [dateRange, setDateRange] = useState("30");

  const [projectOne, setProjectOne] = useState("tawa");
  const [projectTwo, setProjectTwo] = useState("bansagar");

  const projects = [
    { value: "tawa", label: "Tawa Dam" },
    { value: "bansagar", label: "Bansagar Dam" },
  ];

  const projectOneName =
    projects.find((project) => project.value === projectOne)?.label ?? "";

  const projectTwoName =
    projects.find((project) => project.value === projectTwo)?.label ?? "";

  const reservoirLevelOption = createComparisonChart(
    "Reservoir Level Comparison",
    "Level (m)",
    [projectOneName, projectTwoName]
  );

  const storageOption = createComparisonChart(
    "Live Storage Comparison",
    "Storage (MCM)",
    [projectOneName, projectTwoName]
  );

  const inflowOption = createComparisonChart(
    "Inflow Comparison",
    "Discharge (m³/s)",
    [projectOneName, projectTwoName]
  );

  const outflowOption = createComparisonChart(
    "Outflow Comparison",
    "Discharge (m³/s)",
    [projectOneName, projectTwoName]
  );

  const rainfallOption = createComparisonChart(
    "Rainfall Comparison",
    "Rainfall (mm)",
    [projectOneName, projectTwoName]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comparative Analytics"
        subtitle="Compare reservoir performance, water discharge and rainfall across dam projects."
      />

      {/* Integration notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Info
          className="mt-0.5 shrink-0 text-amber-400"
          size={20}
        />

        <div>
          <h3 className="text-sm font-semibold text-amber-300">
            Comparative data integration pending
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Verified telemetry from both projects is not connected.
            Comparison metrics and historical charts will populate
            after backend integration.
          </p>
        </div>
      </div>

      {/* Project selection */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5 flex items-center gap-3">
          <GitCompareArrows className="text-cyan-400" size={22} />

          <div>
            <h2 className="font-semibold text-white">
              Project Comparison
            </h2>

            <p className="text-xs text-slate-500">
              Select two projects to compare their performance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Project 1
            </label>

            <select
              value={projectOne}
              onChange={(e) => setProjectOne(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              {projects.map((project) => (
                <option
                  key={project.value}
                  value={project.value}
                  disabled={project.value === projectTwo}
                >
                  {project.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center">
            <div className="rounded-full border border-slate-700 bg-slate-950 p-3">
              <GitCompareArrows className="text-cyan-400" size={22} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Project 2
            </label>

            <select
              value={projectTwo}
              onChange={(e) => setProjectTwo(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              {projects.map((project) => (
                <option
                  key={project.value}
                  value={project.value}
                  disabled={project.value === projectOne}
                >
                  {project.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-800 pt-4">
          <label className="mb-2 block text-sm text-slate-400">
            Comparison Period
          </label>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none sm:w-64"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last 1 Year</option>
          </select>
        </div>
      </div>

      {/* Comparison metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {comparisonMetrics.map((metric) => {
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

                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                  Unavailable
                </span>
              </div>

              <h3 className="mt-5 text-sm font-medium text-white">
                {metric.title}
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">
                    {projectOneName}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    --
                  </p>
                  <p className="text-xs text-slate-500">
                    {metric.unit}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">
                    {projectTwoName}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    --
                  </p>
                  <p className="text-xs text-slate-500">
                    {metric.unit}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {metric.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reservoir comparisons */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ReactECharts
            option={reservoirLevelOption}
            style={{ height: "320px", width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ReactECharts
            option={storageOption}
            style={{ height: "320px", width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>

      {/* Discharge comparisons */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ReactECharts
            option={inflowOption}
            style={{ height: "320px", width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ReactECharts
            option={outflowOption}
            style={{ height: "320px", width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>

      {/* Rainfall comparison */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <ReactECharts
          option={rainfallOption}
          style={{ height: "320px", width: "100%" }}
          notMerge
          lazyUpdate
        />
      </div>

      {/* Comparison information */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-3">
          <ChartLine className="text-cyan-400" size={22} />

          <h3 className="font-semibold text-white">
            Comparative Performance Insights
          </h3>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Comparative analytics will help identify differences
          in reservoir levels, available storage, water discharge
          and rainfall patterns. Comparisons will use aligned
          reporting periods, verified readings and compatible
          measurement units.
        </p>
      </div>
    </div>
  );
}
