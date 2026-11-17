
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock,
  Radio,
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  Gauge,
  Signal,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

type CommunicationStatus = "online" | "delayed" | "maintenance";

type Instrument = {
  id: string;
  name: string;
  location: string;
  type: string;
  reading: number;
  unit: string;
  status: CommunicationStatus;
  lastUpdated: Date;
};

const initialInstruments: Instrument[] = [
  {
    id: "INS-001",
    name: "Leakage Sensor",
    location: "Upstream Gallery",
    type: "Pore Pressure",
    reading: 142.68,
    unit: "kPa",
    status: "online",
    lastUpdated: new Date(),
  },
  {
    id: "INS-002",
    name: "Seepage Meter",
    location: "Drainage Gallery",
    type: "Seepage",
    reading: 18.42,
    unit: "L/min",
    status: "online",
    lastUpdated: new Date(),
  },
  {
    id: "INS-003",
    name: "Settlement Gauge",
    location: "Dam Foundation",
    type: "Settlement",
    reading: 4.82,
    unit: "mm",
    status: "online",
    lastUpdated: new Date(),
  },
  {
    id: "INS-004",
    name: "Inclinometer",
    location: "Right Abutment",
    type: "Deformation",
    reading: 2.36,
    unit: "mm",
    status: "delayed",
    lastUpdated: new Date(Date.now() - 4 * 60 * 1000),
  },
  {
    id: "INS-005",
    name: "Uplift Pressure Sensor",
    location: "Foundation Gallery",
    type: "Uplift Pressure",
    reading: 86.35,
    unit: "kPa",
    status: "online",
    lastUpdated: new Date(),
  },
];

const formatTime = (date: Date) =>
  date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function CommunicationBadge({
  status,
}: {
  status: CommunicationStatus;
}) {
  const styles = {
    online: "bg-emerald-50 text-emerald-700 border-emerald-200",
    delayed: "bg-amber-50 text-amber-700 border-amber-200",
    maintenance: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const labels = {
    online: "Online",
    delayed: "Delayed",
    maintenance: "Maintenance",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${styles[status]}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          status === "online"
            ? "bg-emerald-500 animate-pulse"
            : status === "delayed"
              ? "bg-amber-500"
              : "bg-slate-400"
        }`}
      />
      {labels[status]}
    </span>
  );
}

export default function InstrumentationPage() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [instrumentData, setInstrumentData] =
    useState<Instrument[]>(initialInstruments);
  const [lastSync, setLastSync] = useState(new Date());

  // Simulated telemetry refresh.
  useEffect(() => {
    const interval = setInterval(() => {
      setInstrumentData((previous) =>
        previous.map((instrument) => {
          if (instrument.status !== "online") {
            return instrument;
          }

          const variation = (Math.random() - 0.5) * 0.12;

          return {
            ...instrument,
            reading: Number(
              Math.max(0, instrument.reading + variation).toFixed(2)
            ),
            lastUpdated: new Date(),
          };
        })
      );

      setLastSync(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(() => {
    const online = instrumentData.filter(
      (item) => item.status === "online"
    ).length;

    const delayed = instrumentData.filter(
      (item) => item.status === "delayed"
    ).length;

    const maintenance = instrumentData.filter(
      (item) => item.status === "maintenance"
    ).length;

    return {
      total: instrumentData.length,
      online,
      delayed,
      maintenance,
    };
  }, [instrumentData]);

  const filteredInstruments = instrumentData.filter((instrument) => {
    const query = search.toLowerCase();

    const matchesSearch =
      instrument.name.toLowerCase().includes(query) ||
      instrument.location.toLowerCase().includes(query) ||
      instrument.id.toLowerCase().includes(query);

    const matchesType =
      selectedType === "All" || instrument.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader
        title="Instrumentation Monitoring"
        description="Monitor instrument readings, communication health and measurement updates."
      />

      {/* Demo telemetry notice */}
      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2 text-sky-600">
            <Radio size={20} />
          </div>

          <div>
            <p className="text-sm font-semibold text-sky-900">
              Live Monitoring Preview
            </p>
            <p className="mt-1 text-xs leading-relaxed text-sky-700">
              Demonstration telemetry refreshes automatically every 5 seconds.
              Values are illustrative and are not connected to actual dam sensors.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-sky-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Auto refresh enabled
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#64748B]">
              Total Instruments
            </p>
            <Gauge size={20} className="text-sky-600" />
          </div>
          <h3 className="mt-3 text-3xl font-bold text-[#102B3D]">
            {String(summary.total).padStart(2, "0")}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Registered instruments
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#64748B]">
              Online Instruments
            </p>
            <Wifi size={20} className="text-emerald-600" />
          </div>
          <h3 className="mt-3 text-3xl font-bold text-emerald-600">
            {String(summary.online).padStart(2, "0")}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Communication healthy
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#64748B]">
              Delayed Instruments
            </p>
            <Clock size={20} className="text-amber-600" />
          </div>
          <h3 className="mt-3 text-3xl font-bold text-amber-600">
            {String(summary.delayed).padStart(2, "0")}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Awaiting latest transmission
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#64748B]">
              Under Maintenance
            </p>
            <WifiOff size={20} className="text-slate-500" />
          </div>
          <h3 className="mt-3 text-3xl font-bold text-slate-600">
            {String(summary.maintenance).padStart(2, "0")}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Scheduled maintenance
          </p>
        </div>
      </div>

      {/* Live communication overview */}
      <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-[#102B3D]">
              Communication Overview
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Current instrument connectivity status
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw size={14} />
            Last sync: {formatTime(lastSync)}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-700">
              Communication healthy
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {Math.round((summary.online / summary.total) * 100)}%
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">
              Delayed communication
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {summary.delayed}
            </p>
          </div>

          <div className="rounded-lg bg-sky-50 p-4">
            <p className="text-xs font-medium text-sky-700">
              Active telemetry
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-700">
              {summary.online} / {summary.total}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#DCE7EE] bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search instrument or location..."
            className="w-full rounded-lg border border-[#DCE7EE] bg-white py-2.5 pl-10 pr-4 text-sm text-[#102B3D] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/10"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-lg border border-[#DCE7EE] bg-white px-4 py-2.5 text-sm font-medium text-[#16415C] outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/10"
        >
          <option value="All">All Instrument Types</option>
          <option value="Pore Pressure">Pore Pressure</option>
          <option value="Seepage">Seepage</option>
          <option value="Settlement">Settlement</option>
          <option value="Deformation">Deformation</option>
          <option value="Uplift Pressure">Uplift Pressure</option>
        </select>
      </div>

      {/* Instrument register */}
      <div className="overflow-hidden rounded-xl border border-[#DCE7EE] bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#DCE7EE] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-[#102B3D]">
              Instrument Register
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">
              Instrument readings and communication status
            </p>
          </div>

          <span className="text-xs font-medium text-slate-500">
            {filteredInstruments.length} instruments displayed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-[#EAF7FD] text-xs uppercase tracking-wide text-[#16415C]">
              <tr>
                <th className="px-5 py-4 font-semibold">Instrument ID</th>
                <th className="px-5 py-4 font-semibold">Instrument</th>
                <th className="px-5 py-4 font-semibold">Type</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Latest Reading</th>
                <th className="px-5 py-4 font-semibold">Communication</th>
                <th className="px-5 py-4 font-semibold">Last Updated</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredInstruments.map((instrument) => (
                <tr
                  key={instrument.id}
                  className="transition-colors hover:bg-[#F5FAFD]"
                >
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#0284C7]">
                    {instrument.id}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#102B3D]">
                    {instrument.name}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-[#475569]">
                    {instrument.type}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-[#475569]">
                    {instrument.location}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="font-bold text-[#102B3D]">
                      {instrument.reading.toFixed(2)}{" "}
                      <span className="text-xs font-medium text-slate-500">
                        {instrument.unit}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Sample measurement
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <CommunicationBadge status={instrument.status} />
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-xs text-[#64748B]">
                    {formatTime(instrument.lastUpdated)}
                  </td>
                </tr>
              ))}

              {filteredInstruments.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[#64748B]"
                  >
                    No instruments found. Try another search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Information panels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF7FD]">
            <Activity className="text-[#0098DB]" size={22} />
          </div>
          <h3 className="mt-3 font-bold text-[#102B3D]">
            Reading Availability
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            Instrument readings are displayed with measurement units
            and their latest communication timestamps.
          </p>
        </div>

        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF7FD]">
            <Signal className="text-[#0098DB]" size={22} />
          </div>
          <h3 className="mt-3 font-bold text-[#102B3D]">
            Communication Health
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            Communication status is monitored separately from the
            engineering condition of each instrument.
          </p>
        </div>
      </div>
    </div>
  );
}
