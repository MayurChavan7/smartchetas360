
import { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";

import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  CloudRain,
  Droplets,
  Gauge,
  TrendingUp,
  TrendingDown,
  Waves,
  CalendarDays,
} from "lucide-react";

import PageHeader from "../components/common/PageHeader";

// =====================================================
// PROJECT CONFIGURATION
// =====================================================

const damProjects = {
  tawa: {
    id: "tawa",
    name: "Tawa Dam",
    location: "Narmadapuram, Madhya Pradesh",
    river: "Tawa River",
    capacity: 2073.48,
    baseLevel: 354.19,
    baseStorage: 1705.9,
    baseInflow: 425.6,
    baseOutflow: 185.4,
    baseRainfall: 12.6,
    seed: 11,
  },
  bansagar: {
    id: "bansagar",
    name: "Bansagar Dam",
    location: "Shahdol, Madhya Pradesh",
    river: "Son River",
    capacity: 341.64,
    baseLevel: 341.65,
    baseStorage: 2860.4,
    baseInflow: 610.2,
    baseOutflow: 245.8,
    baseRainfall: 8.4,
    seed: 23,
  },
};

type ProjectId = keyof typeof damProjects;
type DateRange = "7" | "30" | "90" | "180" | "365";

interface AnalyticsRecord {
  date: Date;
  level: number;
  storage: number;
  inflow: number;
  outflow: number;
  rainfall: number;
}

// =====================================================
// MOCK DATA GENERATOR
// All generated values are illustrative, not real readings.
// =====================================================

function generateMockData(projectId: ProjectId): AnalyticsRecord[] {
  const project = damProjects[projectId];
  const today = new Date();

  return Array.from({ length: 365 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (364 - index));

    const seasonal = Math.sin(index / 24);
    const dailyWave = Math.sin(index / 7);
    const longWave = Math.cos(index / 48);

    const rainfall = Math.max(
      0,
      project.baseRainfall * 0.45 +
        7 * seasonal +
        5 * Math.sin(index / 5)
    );

    const inflow = Math.max(
      50,
      project.baseInflow +
        project.baseInflow * 0.17 * seasonal +
        35 * dailyWave +
        15 * longWave
    );

    const outflow = Math.max(
      20,
      project.baseOutflow +
        project.baseOutflow * 0.12 * longWave +
        18 * Math.sin(index / 13)
    );

    const level = Math.max(
      0,
      project.baseLevel +
        0.65 * Math.sin(index / 65) +
        0.22 * Math.cos(index / 21)
    );

    const storage = Math.max(
      0,
      project.baseStorage +
        project.baseStorage * 0.035 * seasonal +
        project.baseStorage * 0.012 * longWave
    );

    return {
      date,
      level: Number(level.toFixed(2)),
      storage: Number(storage.toFixed(2)),
      inflow: Number(inflow.toFixed(2)),
      outflow: Number(outflow.toFixed(2)),
      rainfall: Number(rainfall.toFixed(2)),
    };
  });
}

// =====================================================
// HELPERS
// =====================================================

function formatNumber(value: number, decimals = 2) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getChartRecords(
  records: AnalyticsRecord[],
  range: DateRange
) {
  const days = Number(range);
  const selected = records.slice(-days);

  const pointCount =
    days === 7 ? 7 :
    days === 30 ? 15 :
    13;

  if (selected.length <= pointCount) {
    return selected;
  }

  return Array.from({ length: pointCount }, (_, index) => {
    const sourceIndex = Math.round(
      (index * (selected.length - 1)) / (pointCount - 1)
    );

    return selected[sourceIndex];
  });
}

function getDateLabel(date: Date, range: DateRange) {
  if (range === "7") {
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
    });
  }

  if (range === "30") {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: range === "365" ? "2-digit" : undefined,
  });
}

// =====================================================
// CHART CONFIGURATION
// =====================================================

const BRAND_BLUE = "#0098DB";
const BRAND_LIGHT_BLUE = "#42B8E8";

function createChartOption({
  labels,
  series,
  unit,
  bar = false,
}: {
  labels: string[];
  series: {
    name: string;
    data: number[];
    color: string;
    type?: "line" | "bar";
  }[];
  unit: string;
  bar?: boolean;
}) {
  return {
    backgroundColor: "transparent",

    animationDuration: 600,

    color: series.map((item) => item.color),

    tooltip: {
      trigger: "axis",
      backgroundColor: "#102B3D",
      borderColor: "#0098DB",
      borderWidth: 1,
      textStyle: {
        color: "#FFFFFF",
        fontSize: 12,
      },
      valueFormatter: (value: number) =>
        `${formatNumber(value)} ${unit}`,
    },

    legend: {
      show: series.length > 1,
      top: 0,
      right: 5,
      textStyle: {
        color: "#334155",
        fontSize: 11,
      },
    },

    grid: {
      left: 15,
      right: 20,
      top: series.length > 1 ? 45 : 30,
      bottom: 35,
      containLabel: true,
    },

    xAxis: {
      type: "category",
      boundaryGap: bar,
      data: labels,
      axisLabel: {
        color: "#64748B",
        fontSize: 10,
        hideOverlap: true,
      },
      axisLine: {
        lineStyle: {
          color: "#CBD5E1",
        },
      },
      axisTick: {
        show: false,
      },
    },

    yAxis: {
      type: "value",
      name: unit,
      nameTextStyle: {
        color: "#64748B",
        fontSize: 10,
      },
      axisLabel: {
        color: "#64748B",
        fontSize: 10,
      },
      axisLine: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: "#E2E8F0",
          type: "dashed",
        },
      },
    },

    series: series.map((item) => ({
      name: item.name,
      type: item.type || (bar ? "bar" : "line"),
      data: item.data,
      smooth: true,
      showSymbol: false,
      symbol: "circle",
      symbolSize: 6,
      barMaxWidth: 25,

      lineStyle: {
        width: 2.5,
        color: item.color,
      },

      itemStyle: {
        color: item.color,
        borderRadius: bar ? [5, 5, 0, 0] : 0,
      },

      areaStyle:
        !bar && item.type !== "bar"
          ? {
              color: item.color,
              opacity: 0.09,
            }
          : undefined,

      emphasis: {
        focus: "series",
      },
    })),
  };
}

// =====================================================
// KPI CARD
// =====================================================

function MetricCard({
  title,
  value,
  unit,
  description,
  icon: Icon,
  trend,
  color = BRAND_BLUE,
}: {
  title: string;
  value: string;
  unit: string;
  description: string;
  icon: React.ElementType;
  trend?: string;
  color?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-5 transition hover:border-[#0098DB]/60 hover:shadow-md">
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl transition group-hover:opacity-20"
        style={{ background: color }}
      />

      <div className="relative flex items-center justify-between">
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: `${color}18`,
            color,
          }}
        >
          <Icon size={21} />
        </div>

        <span className="rounded-full border border-slate-300 bg-white/70 px-3 py-1 text-[10px] font-medium text-[#007EBA]">
              
        </span>
      </div>

      <p className="relative mt-5 text-sm text-slate-500">
        {title}
      </p>

      <div className="relative mt-2 flex items-baseline gap-2">
        <h3 className="text-2xl font-semibold tabular-nums text-slate-900">
          {value}
        </h3>

        <span className="text-sm text-slate-500">
          {unit}
        </span>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {description}
        </p>

        {trend && (
          <span className="text-xs font-medium text-[#007EBA]">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// CHART CARD
// =====================================================

function ChartCard({
  title,
  subtitle,
  option,
  height = 300,
}: {
  title: string;
  subtitle: string;
  option: object;
  height?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
      </div>

      <ReactECharts
        option={option}
        style={{
          height: `${height}px`,
          width: "100%",
        }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}

// =====================================================
// MAIN ANALYTICS PAGE
// =====================================================

export default function Analytics() {
  const [selectedProject, setSelectedProject] =
    useState<ProjectId>("tawa");

  const [dateRange, setDateRange] =
    useState<DateRange>("30");

  // Generate local mock data for the selected dam.
  const allRecords = useMemo(
    () => generateMockData(selectedProject),
    [selectedProject]
  );

  const records = useMemo(
    () => getChartRecords(allRecords, dateRange),
    [allRecords, dateRange]
  );

  const project = damProjects[selectedProject];

  const latest = allRecords[allRecords.length - 1];
  const previous = allRecords[allRecords.length - 2];

  const fillingPercentage =
    (latest.storage / project.capacity) * 100;

  const storageDifference =
    latest.storage - previous.storage;

  const inflowOutflowDifference =
    latest.inflow - latest.outflow;

  const labels = records.map((record) =>
    getDateLabel(record.date, dateRange)
  );

  // ---------------------------------------------------
  // CHART DATA
  // ---------------------------------------------------

  const reservoirChartOption = useMemo(
    () =>
      createChartOption({
        labels,
        unit: "m",
        series: [
          {
            name: "Reservoir Level",
            data: records.map((r) => r.level),
            color: BRAND_BLUE,
          },
        ],
      }),
    [records, dateRange]
  );

  const storageChartOption = useMemo(
    () =>
      createChartOption({
        labels,
        unit: "MCM",
        series: [
          {
            name: "Live Storage",
            data: records.map((r) => r.storage),
            color: BRAND_LIGHT_BLUE,
          },
        ],
      }),
    [records, dateRange]
  );

  const dischargeChartOption = useMemo(
    () =>
      createChartOption({
        labels,
        unit: "m³/s",
        series: [
          {
            name: "Inflow",
            data: records.map((r) => r.inflow),
            color: BRAND_BLUE,
          },
          {
            name: "Outflow",
            data: records.map((r) => r.outflow),
            color: BRAND_LIGHT_BLUE,
          },
        ],
      }),
    [records, dateRange]
  );

  const rainfallChartOption = useMemo(
    () =>
      createChartOption({
        labels,
        unit: "mm",
        bar: true,
        series: [
          {
            name: "Rainfall",
            data: records.map((r) => r.rainfall),
            color: BRAND_LIGHT_BLUE,
            type: "bar",
          },
        ],
      }),
    [records, dateRange]
  );

  // ---------------------------------------------------
  // KPI DATA
  // ---------------------------------------------------

  const metrics = [
    {
      title: "Reservoir Level",
      value: formatNumber(latest.level),
      unit: "m",
      description: "Current illustrative water level",
      icon: Waves,
      trend:
        latest.level >= previous.level
          ? "Increasing"
          : "Decreasing",
      color: BRAND_BLUE,
    },
    {
      title: "Live Storage",
      value: formatNumber(latest.storage),
      unit: "MCM",
      description: "Illustrative available storage",
      icon: Droplets,
      trend:
        storageDifference >= 0
          ? `+${formatNumber(storageDifference)}`
          : formatNumber(storageDifference),
      color: BRAND_LIGHT_BLUE,
    },
    {
      title: "Total Inflow",
      value: formatNumber(latest.inflow, 1),
      unit: "m³/s",
      description: "Incoming water discharge",
      icon: ArrowDownToLine,
      trend: "Mock reading",
      color: BRAND_BLUE,
    },
    {
      title: "Total Outflow",
      value: formatNumber(latest.outflow, 1),
      unit: "m³/s",
      description: "Outgoing water discharge",
      icon: ArrowUpFromLine,
      trend: "Mock reading",
      color: BRAND_LIGHT_BLUE,
    },
  ];

  return (
    <div className="space-y-7 bg-white text-slate-800">

      {/* PAGE HEADER */}

      <PageHeader
        title="Analytics & Insights"
        subtitle="Analyze reservoir performance, water discharge, rainfall and historical dam data."
      />

      {/*      DATA NOTICE

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#0098DB]/30 bg-[#0098DB]/5 p-4">
        <div className="flex items-start gap-3">
          <Database
            className="mt-0.5 shrink-0 text-[#0098DB]"
            size={21}
          />

          <div>
            <h3 className="text-sm font-semibold text-[#07577C]">
              Demonstration Analytics
            </h3>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              All metrics, historical records and charts use locally
              generated mock data. No SCADA, backend or database
              connection is active.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-[#0098DB]/30 bg-[#0098DB]/10 px-3 py-1 text-xs font-semibold text-[#07577C]">
               DATA
        </span>
      </div> */}

      {/* PROJECT AND DATE FILTERS */}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Performance Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {project.name} · {project.location}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {project.river} · Local demonstration dataset
          </p>
        </div>

        <div className="flex flex-wrap gap-3">

          <select
            value={selectedProject}
            onChange={(e) =>
              setSelectedProject(e.target.value as ProjectId)
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0098DB]"
          >
            <option value="tawa">Tawa Dam</option>
            <option value="bansagar">Bansagar Dam</option>
          </select>

          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(e.target.value as DateRange)
              }
              className="appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-[#0098DB]"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 3 Months</option>
              <option value="180">Last 6 Months</option>
              <option value="365">Last 1 Year</option>
            </select>

            <CalendarDays
              size={15}
              className="pointer-events-none absolute right-3 top-3 text-[#007EBA]"
            />
          </div>
        </div>
      </div>

      {/* KPI CARDS */}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Key Performance Indicators
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Latest illustrative readings for {project.name}
            </p>
          </div>

          <span className="text-xs text-slate-500">
            {dateRange === "7"
              ? "7-day view"
              : dateRange === "30"
              ? "30-day view"
              : `${Number(dateRange) / 30} month view`}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              {...metric}
            />
          ))}
        </div>
      </section>

      {/* RESERVOIR PERFORMANCE */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Reservoir Performance
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Water level and storage variation over the selected period
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChartCard
            title="Reservoir Level Trend"
            subtitle="Daily illustrative reservoir level"
            option={reservoirChartOption}
          />

          <ChartCard
            title="Live Storage Trend"
            subtitle="Illustrative available storage variation"
            option={storageChartOption}
          />
        </div>
      </section>

      {/* DISCHARGE ANALYSIS */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Discharge Analysis
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Comparison of incoming and outgoing water discharge
          </p>
        </div>

        <ChartCard
          title="Inflow vs Outflow"
          subtitle="Illustrative discharge comparison"
          option={dischargeChartOption}
          height={340}
        />
      </section>

      {/* RAINFALL */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Rainfall Analysis
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Illustrative rainfall distribution over the selected period
          </p>
        </div>

        <ChartCard
          title="Rainfall Trend"
          subtitle="Rainfall readings in millimetres"
          option={rainfallChartOption}
          height={320}
        />
      </section>

      {/* WATER BALANCE AND STORAGE SUMMARY */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Water Balance & Storage Summary
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Additional indicators calculated from the mock dataset
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          {/* Storage capacity */}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-[#0098DB]/10 p-3">
                <Gauge
                  size={21}
                  className="text-[#0098DB]"
                />
              </div>

              <span className="text-xs text-[#007EBA]">
                    
              </span>
            </div>

            <h3 className="mt-4 text-sm text-slate-500">
              Storage Utilization
            </h3>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatNumber(fillingPercentage, 1)}%
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0098DB] to-[#42B8E8]"
                style={{
                  width: `${Math.min(fillingPercentage, 100)}%`,
                }}
              />
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>Storage: {formatNumber(latest.storage)} MCM</span>
              <span>Capacity: {formatNumber(project.capacity)} MCM</span>
            </div>
          </div>

          {/* Inflow and outflow balance */}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-[#0098DB]/10 p-3">
                <Activity
                  size={21}
                  className="text-[#0098DB]"
                />
              </div>

              <span className="text-xs text-[#007EBA]">
                    
              </span>
            </div>

            <h3 className="mt-4 text-sm text-slate-500">
              Inflow - Outflow Difference
            </h3>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatNumber(inflowOutflowDifference, 1)}
              <span className="ml-2 text-sm font-normal text-slate-500">
                m³/s
              </span>
            </p>

            <div className="mt-4 flex items-center gap-2">
              {inflowOutflowDifference >= 0 ? (
                <TrendingUp
                  size={17}
                  className="text-[#007EBA]"
                />
              ) : (
                <TrendingDown
                  size={17}
                  className="text-amber-400"
                />
              )}

              <span className="text-xs text-slate-500">
                {inflowOutflowDifference >= 0
                  ? "Inflow exceeds outflow"
                  : "Outflow exceeds inflow"}
              </span>
            </div>
          </div>

          {/* Rainfall summary */}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-[#91D8F4]/10 p-3">
                <CloudRain
                  size={21}
                  className="text-[#007EBA]"
                />
              </div>

              <span className="text-xs text-[#007EBA]">
                    
              </span>
            </div>

            <h3 className="mt-4 text-sm text-slate-500">
              Rainfall Total
            </h3>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatNumber(
                allRecords
                  .slice(-Number(dateRange))
                  .reduce((total, record) => total + record.rainfall, 0),
                1
              )}
              <span className="ml-2 text-sm font-normal text-slate-500">
                mm
              </span>
            </p>

            <p className="mt-4 text-xs text-slate-500">
              Illustrative cumulative rainfall over selected period
            </p>
          </div>
        </div>
      </section>

      {/* ANALYTICS INFORMATION

      <div className="rounded-xl border border-[#0098DB]/20 bg-[#0098DB]/5 p-5">
        <div className="flex items-center gap-3">
          <Info
            size={21}
            className="text-[#007EBA]"
          />

          <h3 className="font-semibold text-slate-900">
            About Analytics Data
          </h3>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          This dashboard uses locally generated demonstration data
          to illustrate reservoir performance, storage utilization,
          discharge patterns and rainfall trends. The selected date
          range changes the displayed historical window. These values
          are not actual dam measurements and must not be used for
          operational decisions, water-release planning or dam safety
          assessment.
        </p>
      </div> */}

      {/* FOOTER */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
        <p>
          SMART DAM       · Analytics & Insights
        </p>

        <p>
          Chetas Control Systems ·      
        </p>
      </div>
    </div>
  );
}
