
import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  Activity,
  CalendarDays,
  ChartLine,
  Gauge,
  Info,
  Waves,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";
import SafetyStatusBadge from "../components/SafetyStatusBadge";

const parameters = [
  {
    id: "piezometric",
    name: "Piezometric Level",
    unit: "m",
    description: "Monitors pore water pressure within the dam foundation.",
    icon: Waves,
  },
  {
    id: "seepage",
    name: "Seepage",
    unit: "L/s",
    description: "Monitors water seepage through the dam structure.",
    icon: Activity,
  },
  {
    id: "settlement",
    name: "Settlement",
    unit: "mm",
    description: "Monitors vertical movement of the dam structure.",
    icon: Gauge,
  },
  {
    id: "uplift",
    name: "Uplift Pressure",
    unit: "kPa",
    description: "Monitors uplift pressure at the dam foundation.",
    icon: ChartLine,
  },
];

export default function SafetyParametersPage() {
  const [selectedParameter, setSelectedParameter] =
    useState("piezometric");

  const [dateRange, setDateRange] = useState("7");

  const activeParameter = parameters.find(
    (parameter) => parameter.id === selectedParameter
  )!;

  const chartOption = {
    backgroundColor: "transparent",
    title: {
      text: "Historical Parameter Trend",
      left: 0,
      textStyle: {
        color: "#102B3D",
        fontSize: 15,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#FFFFFF",
      borderColor: "#DCE7EE",
      borderWidth: 1,
      textStyle: {
        color: "#102B3D",
      },
    },
    grid: {
      left: 45,
      right: 20,
      top: 65,
      bottom: 35,
    },
    xAxis: {
      type: "category",
      data: [],
      axisLabel: { color: "#64748B" },
      axisLine: { lineStyle: { color: "#CBD5E1" } },
      axisTick: { lineStyle: { color: "#CBD5E1" } },
    },
    yAxis: {
      type: "value",
      name: activeParameter.unit,
      nameTextStyle: { color: "#64748B" },
      axisLabel: { color: "#64748B" },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#E2E8F0", type: "dashed" } },
    },
    series: [
      {
        name: activeParameter.name,
        type: "line",
        data: [],
        smooth: true,
        showSymbol: true,
        symbolSize: 7,
        lineStyle: {
          color: "#0098DB",
          width: 3,
        },
        itemStyle: {
          color: "#0098DB",
          borderColor: "#FFFFFF",
          borderWidth: 2,
        },
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
      },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "middle",
        style: {
          text: "Historical readings will appear after telemetry integration",
          fill: "#64748B",
          fontSize: 13,
          textAlign: "center",
        },
      },
    ],
  };

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader
        title="Safety Parameters"
        description="Analyze dam safety readings, historical trends and engineering limits."
      />

      {/* Data Integration Notice */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info className="mt-0.5 shrink-0 text-amber-700" size={20} />
        <div>
          <h3 className="text-sm font-semibold text-amber-800">
            Telemetry and engineering limits pending
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-amber-700">
            Historical readings and approved parameter thresholds
            will be displayed after backend integration.
          </p>
        </div>
      </div>

      {/* Project and Date Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#102B3D]">
            Parameter Analysis
          </h2>
          <p className="text-sm text-[#64748B]">
            Selected project: Tawa Dam
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            defaultValue="tawa"
            className="rounded-lg border border-[#DCE7EE] bg-white px-4 py-2.5 text-sm font-medium text-[#16415C] outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/10"
          >
            <option value="tawa">Tawa Dam</option>
            <option value="bansagar">Bansagar Dam</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
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

      {/* Parameter Selection */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {parameters.map((parameter) => {
          const Icon = parameter.icon;
          const isSelected = selectedParameter === parameter.id;

          return (
            <button
              key={parameter.id}
              onClick={() => setSelectedParameter(parameter.id)}
              className={`rounded-xl border p-5 text-left shadow-sm transition-all duration-200 ${
                isSelected
                  ? "border-[#0098DB] bg-[#EAF7FD] ring-1 ring-[#0098DB]/20"
                  : "border-[#DCE7EE] bg-white hover:border-[#91D8F4] hover:bg-[#F5FAFD]"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon
                  size={22}
                  className={
                    isSelected ? "text-[#0098DB]" : "text-[#64748B]"
                  }
                />

                {isSelected && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0284C7]">
                    Selected
                  </span>
                )}
              </div>

              <h3 className="mt-4 font-bold text-[#102B3D]">
                {parameter.name}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                {parameter.description}
              </p>

              <div className="mt-4">
                <SafetyStatusBadge status="unavailable" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Parameter Details */}
      <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#102B3D]">
              {activeParameter.name}
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Measurement unit: {activeParameter.unit}
            </p>
          </div>

          <SafetyStatusBadge status="unavailable" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-4">
            <p className="text-sm font-medium text-[#64748B]">
              Current Reading
            </p>
            <p className="mt-2 text-2xl font-bold text-[#102B3D]">--</p>
            <p className="mt-1 text-xs text-[#64748B]">
              {activeParameter.unit}
            </p>
          </div>

          <div className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-4">
            <p className="text-sm font-medium text-[#64748B]">
              Previous Reading
            </p>
            <p className="mt-2 text-2xl font-bold text-[#102B3D]">--</p>
            <p className="mt-1 text-xs text-[#64748B]">
              {activeParameter.unit}
            </p>
          </div>

          <div className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-4">
            <p className="text-sm font-medium text-[#64748B]">
              Approved Limits
            </p>
            <p className="mt-2 text-2xl font-bold text-[#102B3D]">--</p>
            <p className="mt-1 text-xs text-[#64748B]">
              Not configured
            </p>
          </div>
        </div>
      </div>

      {/* Historical Chart */}
      <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF7FD]">
            <ChartLine className="text-[#0098DB]" size={21} />
          </div>

          <div>
            <h3 className="font-bold text-[#102B3D]">
              Historical Trend Analysis
            </h3>
            <p className="text-xs text-[#64748B]">
              Selected period: Last {dateRange} days
            </p>
          </div>
        </div>

        <ReactECharts
          option={chartOption}
          style={{ height: "320px", width: "100%" }}
          notMerge
          lazyUpdate
        />
      </div>

      {/* Threshold Information */}
      <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF7FD]">
            <CalendarDays className="text-[#0098DB]" size={21} />
          </div>

          <h3 className="font-bold text-[#102B3D]">
            Engineering Threshold Configuration
          </h3>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#64748B]">
          Parameter limits must be configured using approved,
          dam-specific engineering criteria. Once configured,
          the system can compare measured values with those limits
          and display the corresponding status.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SafetyStatusBadge status="unavailable" />
          <span className="text-xs text-[#64748B]">
            Threshold configuration pending
          </span>
        </div>
      </div>
    </div>
  );
}
