
import { useState } from "react";
import {
  Activity,
  Clock,
  Radio,
  Search,
} from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import SafetyStatusBadge from "../components/SafetyStatusBadge";

const instruments = [
  {
    id: "INS-001",
    name: "Piezometer",
    location: "Upstream Gallery",
    type: "Pore Pressure",
  },
  {
    id: "INS-002",
    name: "Seepage Meter",
    location: "Drainage Gallery",
    type: "Seepage",
  },
  {
    id: "INS-003",
    name: "Settlement Gauge",
    location: "Dam Foundation",
    type: "Settlement",
  },
  {
    id: "INS-004",
    name: "Inclinometer",
    location: "Right Abutment",
    type: "Deformation",
  },
  {
    id: "INS-005",
    name: "Uplift Pressure Sensor",
    location: "Foundation Gallery",
    type: "Uplift Pressure",
  },
];

export default function InstrumentationPage() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const filteredInstruments = instruments.filter((instrument) => {
    const matchesSearch =
      instrument.name.toLowerCase().includes(search.toLowerCase()) ||
      instrument.location.toLowerCase().includes(search.toLowerCase()) ||
      instrument.id.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      selectedType === "All" || instrument.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader
        title="Instrumentation Monitoring"
        description="Monitor instrument availability, communication and reading freshness."
      />

      {/* Information Notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-amber-800">
          <Radio size={19} />
          <span className="text-sm font-semibold">
            Illustrative Data
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-amber-700">
          The instrument records below are illustrative examples.
          They are not connected to actual dam instrumentation.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">
            Total Instruments
          </p>
          <h3 className="mt-2 text-3xl font-bold text-[#102B3D]">
            05
          </h3>
        </div>

        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">
            Available Readings
          </p>
          <h3 className="mt-2 text-3xl font-bold text-emerald-600">
            --
          </h3>
        </div>

        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">
            Unavailable Readings
          </p>
          <h3 className="mt-2 text-3xl font-bold text-slate-500">
            --
          </h3>
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
            className="w-full rounded-lg border border-[#DCE7EE] bg-white py-2.5 pl-10 pr-4 text-sm text-[#102B3D] placeholder:text-[#94A3B8] outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/10"
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

      {/* Instrument Register */}
      <div className="overflow-hidden rounded-xl border border-[#DCE7EE] bg-white shadow-sm">
        <div className="border-b border-[#DCE7EE] p-5">
          <h3 className="font-bold text-[#102B3D]">
            Instrument Register
          </h3>
          <p className="mt-1 text-xs text-[#64748B]">
            Illustrative instrument inventory
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#EAF7FD] text-xs uppercase tracking-wide text-[#16415C]">
              <tr>
                <th className="px-5 py-4 font-semibold">Instrument ID</th>
                <th className="px-5 py-4 font-semibold">Instrument</th>
                <th className="px-5 py-4 font-semibold">Type</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Communication</th>
                <th className="px-5 py-4 font-semibold">Last Reading</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredInstruments.map((instrument) => (
                <tr
                  key={instrument.id}
                  className="transition-colors hover:bg-[#F5FAFD]"
                >
                  <td className="px-5 py-4 font-semibold text-[#0284C7]">
                    {instrument.id}
                  </td>
                  <td className="px-5 py-4 font-semibold text-[#102B3D]">
                    {instrument.name}
                  </td>
                  <td className="px-5 py-4 text-[#475569]">
                    {instrument.type}
                  </td>
                  <td className="px-5 py-4 text-[#475569]">
                    {instrument.location}
                  </td>
                  <td className="px-5 py-4">
                    <SafetyStatusBadge status="unavailable" />
                  </td>
                  <td className="px-5 py-4 text-[#64748B]">
                    Not connected
                  </td>
                </tr>
              ))}

              {filteredInstruments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[#64748B]"
                  >
                    No instruments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Information Panels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF7FD]">
            <Activity className="text-[#0098DB]" size={22} />
          </div>
          <h3 className="mt-3 font-bold text-[#102B3D]">
            Reading Availability
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            Reading availability will be determined from verified
            backend telemetry and its timestamp.
          </p>
        </div>

        <div className="rounded-xl border border-[#DCE7EE] bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF7FD]">
            <Clock className="text-[#0098DB]" size={22} />
          </div>
          <h3 className="mt-3 font-bold text-[#102B3D]">
            Communication Health
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            Communication status will be displayed separately
            from the engineering condition of the instrument.
          </p>
        </div>
      </div>
    </div>
  );
}
