
import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  CloudRain,
  CloudDrizzle,
  Droplets,
  CalendarDays,
  TrendingUp,
  Activity,
  Info,
  ChartLine,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

const rainfallMetrics = [
  {
    title: "Current Rainfall",
    unit: "mm",
    description: "Latest available rainfall reading",
    icon: CloudRain,
  },
  {
    title: "Daily Rainfall",
    unit: "mm",
    description: "Accumulated rainfall for the day",
    icon: CloudDrizzle,
  },
  {
    title: "Monthly Rainfall",
    unit: "mm",
    description: "Accumulated rainfall for the month",
    icon: Droplets,
  },
  {
    title: "Annual Rainfall",
    unit: "mm",
    description: "Accumulated rainfall for the year",
    icon: CalendarDays,
  },
];

const createEmptyChartOption = (
  title: string,
  unit: string,
  chartType: "line" | "bar" = "line"
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

  series: [
    {
      name: title,
      type: chartType,
      data: [],
      smooth: chartType === "line",
      showSymbol: chartType === "line",
      barMaxWidth: 35,
    },
  ],

  graphic: [
    {
      type: "text",
      left: "center",
      top: "middle",
      style: {
        text: "Rainfall data will appear after backend integration",
        fill: "#94a3b8",
        fontSize: 13,
        textAlign: "center",
      },
    },
  ],
});

export default function RainfallAnalyticsPage() {
  const [selectedProject, setSelectedProject] = useState("tawa");
  const [dateRange, setDateRange] = useState("30");

  const dailyRainfallOption = createEmptyChartOption(
    "Daily Rainfall Trend",
    "Rainfall (mm)",
    "bar"
  );

  const monthlyRainfallOption = createEmptyChartOption(
    "Monthly Rainfall Analysis",
    "Rainfall (mm)",
    "bar"
  );

  const annualRainfallOption = createEmptyChartOption(
    "Annual Rainfall Trend",
    "Rainfall (mm)",
    "line"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rainfall Analytics"
        subtitle="Analyze daily, monthly and annual rainfall patterns for dam catchment areas."
      />

      {/* Data integration notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Info
          className="mt-0.5 shrink-0 text-amber-400"
          size={20}
        />

        <div>
          <h3 className="text-sm font-semibold text-amber-300">
            Rainfall data integration pending
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Verified rainfall readings and historical records
            are not connected yet. Metrics and charts will
            populate after backend integration.
          </p>
        </div>
      </div>

      {/* Project and date filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Rainfall Overview
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

      {/* Rainfall metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rainfallMetrics.map((metric) => {
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

      {/* Daily rainfall chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-3 flex items-center gap-3">
          <CloudRain className="text-cyan-400" size={22} />

          <div>
            <h3 className="font-semibold text-white">
              Daily Rainfall
            </h3>

            <p className="text-xs text-slate-500">
              Daily rainfall distribution over the selected period.
            </p>
          </div>
        </div>

        <ReactECharts
          option={dailyRainfallOption}
          style={{ height: "330px", width: "100%" }}
          notMerge
          lazyUpdate
        />
      </div>

      {/* Monthly and annual charts */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ReactECharts
            option={monthlyRainfallOption}
            style={{ height: "320px", width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ReactECharts
            option={annualRainfallOption}
            style={{ height: "320px", width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>

      {/* Rainfall analysis information */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <Activity className="text-cyan-400" size={22} />

            <h3 className="font-semibold text-white">
              Rainfall Distribution
            </h3>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Understand rainfall distribution across daily,
            monthly and annual periods to identify seasonal
            rainfall patterns.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-cyan-400" size={22} />

            <h3 className="font-semibold text-white">
              Rainfall Trend Analysis
            </h3>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Compare historical rainfall patterns and study
            changes across different reporting periods.
          </p>
        </div>
      </div>

      {/* Data interpretation note */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-3">
          <ChartLine className="text-cyan-400" size={22} />

          <h3 className="font-semibold text-white">
            Rainfall Data Interpretation
          </h3>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Rainfall analytics will use verified station readings
          and clearly defined accumulation periods. Daily,
          monthly and annual totals will be calculated using
          the backend data aggregation rules.
        </p>
      </div>
    </div>
  );
}
