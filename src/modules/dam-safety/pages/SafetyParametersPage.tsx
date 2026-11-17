import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  Activity,
  CalendarDays,
  ChartLine,
  Gauge,
  Info,
  Waves,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

type ParameterId = "piezometric" | "seepage" | "settlement" | "uplift";
type ParameterStatus = "normal" | "watch";

type ParameterConfig = {
  id: ParameterId;
  name: string;
  unit: string;
  description: string;
  icon: typeof Waves;
  base: number;
  variation: number;
  referenceMin: number;
  referenceMax: number;
  precision: number;
};

const parameters: ParameterConfig[] = [
  {
    id: "piezometric",
    name: "Piezometric Level",
    unit: "m",
    description: "Monitors pore water pressure within the dam foundation.",
    icon: Waves,
    base: 142.68,
    variation: 0.18,
    referenceMin: 140,
    referenceMax: 145,
    precision: 2,
  },
  {
    id: "seepage",
    name: "Seepage",
    unit: "L/s",
    description: "Monitors water seepage through the dam structure.",
    icon: Activity,
    base: 18.42,
    variation: 0.32,
    referenceMin: 10,
    referenceMax: 22,
    precision: 2,
  },
  {
    id: "settlement",
    name: "Settlement",
    unit: "mm",
    description: "Monitors vertical movement of the dam structure.",
    icon: Gauge,
    base: 4.82,
    variation: 0.06,
    referenceMin: 0,
    referenceMax: 6,
    precision: 2,
  },
  {
    id: "uplift",
    name: "Uplift Pressure",
    unit: "kPa",
    description: "Monitors uplift pressure at the dam foundation.",
    icon: ChartLine,
    base: 86.35,
    variation: 0.22,
    referenceMin: 70,
    referenceMax: 100,
    precision: 2,
  },
];

type ReadingPoint = {
  time: string;
  value: number;
};

const makeHistory = (
  config: ParameterConfig,
  days: number,
  projectOffset: number
): ReadingPoint[] => {
  const points: ReadingPoint[] = [];
  const now = Date.now();
  const count = Math.min(days, 30);

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const trend = Math.sin((count - i) / 4) * config.variation * 1.4;
    const noise = (Math.sin(i * 2.17 + config.base) * config.variation) / 2;
    const value = config.base + projectOffset + trend + noise;

    points.push({
      time: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      value: Number(value.toFixed(config.precision)),
    });
  }

  return points;
};

const formatValue = (value: number, precision = 2) =>
  value.toFixed(precision);

function ParameterStatus({ status }: { status: ParameterStatus }) {
  const normal = status === "normal";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        normal
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          normal ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {normal ? "Within reference range" : "Review required"}
    </span>
  );
}

export default function SafetyParametersPage() {
  const [selectedParameter, setSelectedParameter] =
    useState<ParameterId>("piezometric");
  const [dateRange, setDateRange] = useState("7");
  const [project, setProject] = useState("tawa");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [liveValues, setLiveValues] = useState<Record<ParameterId, number>>({
    piezometric: 142.68,
    seepage: 18.42,
    settlement: 4.82,
    uplift: 86.35,
  });
  const [previousValues, setPreviousValues] = useState<Record<ParameterId, number>>({
    piezometric: 142.61,
    seepage: 18.31,
    settlement: 4.79,
    uplift: 86.12,
  });
  const [history, setHistory] = useState<Record<ParameterId, ReadingPoint[]>>(
    () => {
      const offset = project === "bansagar" ? 0.35 : 0;
      return {
        piezometric: makeHistory(parameters[0], 7, offset),
        seepage: makeHistory(parameters[1], 7, offset * 0.4),
        settlement: makeHistory(parameters[2], 7, offset * 0.15),
        uplift: makeHistory(parameters[3], 7, offset * 0.8),
      };
    }
  );

  const activeParameter = parameters.find(
    (parameter) => parameter.id === selectedParameter
  )!;

  const currentValue = liveValues[selectedParameter];
  const previousValue = previousValues[selectedParameter];
  const change = currentValue - previousValue;
  const changePercent =
    previousValue === 0 ? 0 : (change / previousValue) * 100;
  const isWithinRange =
    currentValue >= activeParameter.referenceMin &&
    currentValue <= activeParameter.referenceMax;
  const activeStatus: ParameterStatus = isWithinRange ? "normal" : "watch";

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLiveValues((current) => {
        const next = { ...current };

        parameters.forEach((parameter) => {
          const delta = (Math.random() - 0.5) * parameter.variation * 0.35;
          next[parameter.id] = Number(
            Math.max(0, current[parameter.id] + delta).toFixed(parameter.precision)
          );
        });

        return next;
      });

      setPreviousValues((current) => ({ ...liveValues }));
      setLastUpdated(new Date());

      setHistory((current) => {
        const next = { ...current };
        parameters.forEach((parameter) => {
          const delta = (Math.random() - 0.5) * parameter.variation * 0.35;
          const nextValue = Number(
            Math.max(0, liveValues[parameter.id] + delta).toFixed(parameter.precision)
          );
          next[parameter.id] = [
            ...current[parameter.id].slice(1),
            {
              time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              value: nextValue,
            },
          ];
        });
        return next;
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [liveValues]);

  useEffect(() => {
    const days = Number(dateRange);
    const offset = project === "bansagar" ? 0.35 : 0;

    setHistory({
      piezometric: makeHistory(parameters[0], days, offset),
      seepage: makeHistory(parameters[1], days, offset * 0.4),
      settlement: makeHistory(parameters[2], days, offset * 0.15),
      uplift: makeHistory(parameters[3], days, offset * 0.8),
    });
  }, [dateRange, project]);

  const chartData = history[selectedParameter];

  const chartOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "#FFFFFF",
        borderColor: "#DCE7EE",
        borderWidth: 1,
        textStyle: { color: "#102B3D" },
        formatter: (items: Array<{ axisValue: string; value: number }>) => {
          const item = items[0];
          return `${item.axisValue}<br/><strong>${formatValue(
            item.value,
            activeParameter.precision
          )} ${activeParameter.unit}</strong>`;
        },
      },
      grid: { left: 48, right: 22, top: 28, bottom: 38 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: chartData.map((point) => point.time),
        axisLabel: { color: "#64748B", hideOverlap: true },
        axisLine: { lineStyle: { color: "#CBD5E1" } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        name: activeParameter.unit,
        nameTextStyle: { color: "#64748B", padding: [0, 0, 8, 0] },
        axisLabel: { color: "#64748B" },
        axisLine: { show: false },
        splitLine: {
          lineStyle: { color: "#E2E8F0", type: "dashed" },
        },
      },
      series: [
        {
          name: activeParameter.name,
          type: "line",
          data: chartData.map((point) => point.value),
          smooth: true,
          showSymbol: false,
          symbolSize: 7,
          lineStyle: { color: "#0098DB", width: 3 },
          itemStyle: { color: "#0098DB" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(0,152,219,0.20)" },
                { offset: 1, color: "rgba(0,152,219,0.01)" },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "#F59E0B", type: "dashed", width: 1.5 },
            label: {
              formatter: "Reference upper range",
              color: "#B45309",
              fontSize: 10,
            },
            data: [{ yAxis: activeParameter.referenceMax }],
          },
        },
      ],
    }),
    [activeParameter, chartData]
  );

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader
        title="Safety Parameters"
        description="Analyze dam safety readings, historical trends and illustrative reference ranges."
      />

      {/* Demo telemetry notice */}
      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 shrink-0 text-sky-700" size={20} />
          <div>
            <h3 className="text-sm font-semibold text-sky-900">
              Live Monitoring Preview
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-sky-700">
              Sample readings and trend lines refresh automatically every 5 seconds.
              These values and reference ranges are illustrative, not verified telemetry
              or approved engineering limits.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-sky-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Auto refresh enabled
        </div>
      </div>

      {/* Project and date filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#102B3D]">
            Parameter Analysis
          </h2>
          <p className="text-sm text-[#64748B]">
            Selected project: {project === "tawa" ? "Tawa Dam" : "Bansagar Dam"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={project}
            onChange={(event) => setProject(event.target.value)}
            className="rounded-lg border border-[#DCE7EE] bg-white px-4 py-2.5 text-sm font-medium text-[#16415C] outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/10"
          >
            <option value="tawa">Tawa Dam</option>
            <option value="bansagar">Bansagar Dam</option>
          </select>

          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            className="rounded-lg border border-[#DCE7EE] bg-white px-4 py-2.5 text-sm font-medium text-[#16415C] outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/10"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last 1 Year</option>
          </select>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {parameters.map((parameter) => {
          const Icon = parameter.icon;
          const value = liveValues[parameter.id];
          const normal =
            value >= parameter.referenceMin && value <= parameter.referenceMax;
          const selected = selectedParameter === parameter.id;

          return (
            <button
              key={parameter.id}
              onClick={() => setSelectedParameter(parameter.id)}
              className={`rounded-xl border p-5 text-left shadow-sm transition-all ${
                selected
                  ? "border-[#0098DB] bg-[#EAF7FD] ring-1 ring-[#0098DB]/20"
                  : "border-[#DCE7EE] bg-white hover:border-[#91D8F4] hover:bg-[#F5FAFD]"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon
                  size={22}
                  className={selected ? "text-[#0098DB]" : "text-[#64748B]"}
                />
                {selected && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0284C7]">
                    Selected
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-bold text-[#102B3D]">
                {parameter.name}
              </h3>
              <p className="mt-2 text-2xl font-bold text-[#102B3D]">
                {formatValue(value, parameter.precision)}
                <span className="ml-1 text-sm font-medium text-slate-500">
                  {parameter.unit}
                </span>
              </p>
              <div className="mt-3">
                <ParameterStatus status={normal ? "normal" : "watch"} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected parameter details */}
      <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#102B3D]">
              {activeParameter.name}
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              {activeParameter.description}
            </p>
          </div>
          <ParameterStatus status={activeStatus} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-4">
            <p className="text-sm font-medium text-[#64748B]">Current Reading</p>
            <p className="mt-2 text-2xl font-bold text-[#102B3D]">
              {formatValue(currentValue, activeParameter.precision)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">{activeParameter.unit}</p>
          </div>

          <div className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-4">
            <p className="text-sm font-medium text-[#64748B]">Previous Reading</p>
            <p className="mt-2 text-2xl font-bold text-[#102B3D]">
              {formatValue(previousValue, activeParameter.precision)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">{activeParameter.unit}</p>
          </div>

          <div className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-4">
            <p className="text-sm font-medium text-[#64748B]">Change</p>
            <div className="mt-2 flex items-center gap-2">
              {change >= 0 ? (
                <TrendingUp size={20} className="text-amber-600" />
              ) : (
                <TrendingDown size={20} className="text-emerald-600" />
              )}
              <p className="text-2xl font-bold text-[#102B3D]">
                {change >= 0 ? "+" : ""}
                {formatValue(change, activeParameter.precision)}
              </p>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              {changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(2)}% since previous update
            </p>
          </div>

          <div className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-4">
            <p className="text-sm font-medium text-[#64748B]">
              Illustrative Reference Range
            </p>
            <p className="mt-2 text-2xl font-bold text-[#102B3D]">
              {activeParameter.referenceMin} - {activeParameter.referenceMax}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {activeParameter.unit} · Demo only
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <RefreshCw size={13} />
            Last updated: {lastUpdated.toLocaleTimeString("en-IN")}
          </span>
          <span>Sample telemetry · 5-second refresh</span>
        </div>
      </div>

      {/* Historical chart */}
      <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF7FD]">
              <ChartLine className="text-[#0098DB]" size={21} />
            </div>
            <div>
              <h3 className="font-bold text-[#102B3D]">
                Historical Trend Analysis
              </h3>
              <p className="text-xs text-[#64748B]">
                {activeParameter.name} · Last {dateRange} days
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            Illustrative historical series
          </span>
        </div>

        <ReactECharts
          option={chartOption}
          style={{ height: "320px", width: "100%" }}
          notMerge
          lazyUpdate
        />
      </div>

      {/* Engineering threshold information */}
      <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF7FD]">
            <ShieldCheck className="text-[#0098DB]" size={21} />
          </div>
          <div>
            <h3 className="font-bold text-[#102B3D]">
              Engineering Threshold Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Configuration required before operational use
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#64748B]">
          The reference ranges shown in this preview are placeholders for UI
          demonstration only. Production thresholds must be configured using
          approved, dam-specific engineering criteria and reviewed by qualified
          dam-safety personnel. The system should then compare verified sensor
          readings against those approved limits.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Demo reference ranges
          </span>
          <span className="text-xs text-[#64748B]">
            Approved engineering limits not yet connected
          </span>
        </div>
      </div>
    </div>
  );
}
