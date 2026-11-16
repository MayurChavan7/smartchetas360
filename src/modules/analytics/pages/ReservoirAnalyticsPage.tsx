
import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  Waves,
  Droplets,
  Database,
  Gauge,
  TrendingUp,
  ChartLine,
  Info,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

const metrics = [
  {
    title: "Reservoir Level",
    unit: "m",
    description: "Current reservoir water level",
    icon: Waves,
  },
  {
    title: "Gross Storage",
    unit: "MCM",
    description: "Total reservoir storage",
    icon: Database,
  },
  {
    title: "Live Storage",
    unit: "MCM",
    description: "Usable reservoir storage",
    icon: Droplets,
  },
  {
    title: "Filling Percentage",
    unit: "%",
    description: "Reservoir filling against capacity",
    icon: Gauge,
  },
  {
    title: "Gross Capacity",
    unit: "MCM",
    description: "Approved gross storage capacity",
    icon: Database,
  },
  {
    title: "Live Capacity",
    unit: "MCM",
    description: "Approved live storage capacity",
    icon: TrendingUp,
  },
];

const createEmptyChartOption = (
  title: string,
  unit: string
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

  series: [],

  graphic: [
    {
      type: "text",
      left: "center",
      top: "middle",
      style: {
        text: "Historical readings will appear after backend integration",
        fill: "#94a3b8",
        fontSize: 13,
        textAlign: "center",
      },
    },
  ],
});

export default function ReservoirAnalyticsPage() {
  const [selectedProject, setSelectedProject] = useState("tawa");
  const [dateRange, setDateRange] = useState("30");

  const reservoirLevelOption = createEmptyChartOption(
    "Reservoir Water Level Trend",
    "Level (m)"
  );

  const storageOption = createEmptyChartOption(
    "Reservoir Storage Trend",
    "Storage (MCM)"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservoir Analytics"
        subtitle="Analyze reservoir level, storage capacity, filling percentage and historical trends."
      />

      {/* Data integration notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Info
          className="mt-0.5 shrink-0 text-amber-400"
          size={20}
        />

        <div>
          <h3 className="text-sm font-semibold text-amber-300">
            Reservoir telemetry integration pending
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Verified reservoir readings and historical records
            are not connected yet. Metric values and charts will
            populate after backend integration.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Reservoir Performance
          </h2>

          <p className="text-sm text-slate-400">
            Selected project:{" "}
            {selectedProject === "tawa" ? "Tawa Dam" : "Bansagar Dam"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none"
          >
            <option value="tawa">Tawa Dam</option>
            <option value="bansagar">Bansagar Dam</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last 1 Year</option>
          </select>
        </div>
      </div>

      {/* Reservoir metrics */}
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

                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
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

              <p className="mt-2 text-xs text-slate-500">
                {metric.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Capacity information */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-3">
          <Gauge className="text-cyan-400" size={22} />

          <div>
            <h3 className="font-semibold text-white">
              Reservoir Capacity Analysis
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Storage utilization and capacity comparison
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">
              Gross Capacity
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              --
            </p>
            <p className="mt-1 text-xs text-slate-500">MCM</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">
              Current Storage
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              --
            </p>
            <p className="mt-1 text-xs text-slate-500">MCM</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">
              Storage Utilization
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              --
            </p>
            <p className="mt-1 text-xs text-slate-500">%</p>
          </div>
        </div>
      </div>

      {/* Historical charts */}
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

      {/* Historical analysis information */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-3">
          <ChartLine className="text-cyan-400" size={22} />

          <h3 className="font-semibold text-white">
            Historical Reservoir Analysis
          </h3>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Historical reservoir analysis will help identify
          seasonal water-level variations, storage changes,
          filling patterns and long-term reservoir performance.
          Data will be displayed for the selected project and
          historical period once the backend is connected.
        </p>
      </div>
    </div>
  );
}
