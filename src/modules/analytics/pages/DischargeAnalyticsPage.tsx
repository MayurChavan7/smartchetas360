
import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Waves,
  Activity,
  Gauge,
  Database,
  Info,
  ChartLine,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

const metrics = [
  {
    title: "Total Inflow",
    unit: "m³/s",
    description: "Water entering the reservoir",
    icon: ArrowDownToLine,
  },
  {
    title: "Spillway Discharge",
    unit: "m³/s",
    description: "Water released through spillway gates",
    icon: Waves,
  },
  {
    title: "Canal Discharge",
    unit: "m³/s",
    description: "Water released through canal outlets",
    icon: ArrowUpFromLine,
  },
  {
    title: "Total Outflow",
    unit: "m³/s",
    description: "Combined reservoir outflow",
    icon: Activity,
  },
  {
    title: "Cumulative Discharge",
    unit: "MCM",
    description: "Accumulated discharge volume",
    icon: Database,
  },
  {
    title: "Discharge Variation",
    unit: "%",
    description: "Change over the selected period",
    icon: Gauge,
  },
];

const createEmptyChartOption = (
  title: string,
  unit: string,
  seriesNames: string[] = []
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
    textStyle: {
      color: "#94a3b8",
    },
    data: seriesNames,
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
        text: "Discharge data will appear after backend integration",
        fill: "#94a3b8",
        fontSize: 13,
        textAlign: "center",
      },
    },
  ],
});

export default function DischargeAnalyticsPage() {
  const [selectedProject, setSelectedProject] = useState("tawa");
  const [dateRange, setDateRange] = useState("30");

  const inflowOutflowOption = createEmptyChartOption(
    "Inflow vs Outflow",
    "Discharge (m³/s)",
    ["Inflow", "Outflow"]
  );

  const spillwayOption = createEmptyChartOption(
    "Spillway Discharge Trend",
    "Discharge (m³/s)",
    ["Spillway Discharge"]
  );

  const canalOption = createEmptyChartOption(
    "Canal Discharge Trend",
    "Discharge (m³/s)",
    ["Canal Discharge"]
  );

  const cumulativeOption = createEmptyChartOption(
    "Cumulative Discharge",
    "Volume (MCM)",
    ["Cumulative Discharge"]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inflow & Outflow Analytics"
        subtitle="Analyze reservoir inflow, spillway discharge, canal releases and cumulative water discharge."
      />

      {/* Data integration notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Info
          className="mt-0.5 shrink-0 text-amber-400"
          size={20}
        />

        <div>
          <h3 className="text-sm font-semibold text-amber-300">
            Discharge telemetry integration pending
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Verified inflow, spillway and canal discharge readings
            are not connected yet. Metrics and historical charts
            will populate after backend integration.
          </p>
        </div>
      </div>

      {/* Project and date filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Discharge Performance
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

      {/* Metric cards */}
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

      {/* Inflow vs Outflow */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-3 flex items-center gap-3">
          <ChartLine className="text-cyan-400" size={22} />

          <div>
            <h3 className="font-semibold text-white">
              Inflow vs Outflow Analysis
            </h3>

            <p className="text-xs text-slate-500">
              Compare incoming and outgoing water discharge.
            </p>
          </div>
        </div>

        <ReactECharts
          option={inflowOutflowOption}
          style={{ height: "350px", width: "100%" }}
          notMerge
          lazyUpdate
        />
      </div>

      {/* Spillway and Canal charts */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ReactECharts
            option={spillwayOption}
            style={{ height: "320px", width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ReactECharts
            option={canalOption}
            style={{ height: "320px", width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>

      {/* Cumulative discharge */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <ReactECharts
          option={cumulativeOption}
          style={{ height: "320px", width: "100%" }}
          notMerge
          lazyUpdate
        />
      </div>

      {/* Discharge information */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <ArrowDownToLine className="text-cyan-400" size={22} />

            <h3 className="font-semibold text-white">
              Reservoir Inflow
            </h3>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Analyze water entering the reservoir from rivers,
            tributaries and other monitored sources.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <ArrowUpFromLine className="text-cyan-400" size={22} />

            <h3 className="font-semibold text-white">
              Reservoir Outflow
            </h3>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Analyze water released through spillways, gates,
            canal outlets and other monitored discharge points.
          </p>
        </div>
      </div>
    </div>
  );
}
