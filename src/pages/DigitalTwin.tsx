import { useState } from "react";
import {
  Box,
  Waves,
  Rotate3D,
  Maximize2,
} from "lucide-react";

import PageHeader from "../components/common/PageHeader";
import DamScene from "../modules/digital-twin/scenes/DamScene";
import EarlyWarningSimulation from "../modules/digital-twin/components/EarlyWarningSimulation";

const dams = [
  {
    id: "tawa",
    name: "Tawa Dam",
    location: "Narmadapuram, Madhya Pradesh",
    river: "Tawa River",
  },
  {
    id: "bansagar",
    name: "Bansagar Dam",
    location: "Shahdol, Madhya Pradesh",
    river: "Sone River",
  },
];

function DigitalTwin() {
  const [selectedDam, setSelectedDam] = useState(dams[0]);

  return (
    <div className="min-w-0 space-y-6 bg-white">
      {/* PAGE HEADER */}
      <PageHeader
        title="Digital Twin"
        description="Interactive 3D visualization of dam infrastructure."
      />

      {/* PROJECT SELECTION */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Select Dam Project
          </p>

          <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
            {dams.map((dam) => (
              <button
                key={dam.id}
                type="button"
                onClick={() => setSelectedDam(dam)}
                aria-pressed={selectedDam.id === dam.id}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0098DB]/20 sm:px-5 ${
                  selectedDam.id === dam.id
                    ? "border-[#0098DB] bg-[#EAF7FD] text-[#006B9C] shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-[#006B9C]"
                }`}
              >
                {dam.name}
              </button>
            ))}
          </div>
        </div>

        {/* MODEL STATUS */}
        <div className="flex w-fit items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-xs font-semibold text-amber-700">
            Conceptual 3D Model
          </span>
        </div>
      </section>

      {/* DAM INFORMATION */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-[#0083BD]">
              <Box size={21} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Selected Project</p>
              <h2 className="mt-1 text-base font-bold text-[#102B3D]">
                {selectedDam.name}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <Maximize2 size={21} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Location</p>
              <h2 className="mt-1 break-words text-sm font-bold text-[#102B3D]">
                {selectedDam.location}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 sm:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Waves size={21} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">River</p>
              <h2 className="mt-1 text-base font-bold text-[#102B3D]">
                {selectedDam.river}
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* EXISTING 3D VIEWPORT: PRESERVED */}
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#0083BD]">
              <Box size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-[#102B3D] sm:text-base">
                {selectedDam.name} - 3D View
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Interactive dam visualization
              </p>
            </div>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
            <Rotate3D size={16} className="shrink-0 text-[#0083BD]" />
            <span>Drag to rotate | Scroll to zoom</span>
          </div>
        </div>

        <div className="relative h-[300px] w-full bg-[#EAF7FD] sm:h-[400px] md:h-[480px] lg:h-[520px]">
          <DamScene />
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <p className="text-xs text-slate-500">
            Viewing: <span className="font-semibold text-[#102B3D]">{selectedDam.name}</span>
          </p>
          <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700">
            DEMONSTRATION MODEL
          </span>
        </div>
      </section>

      {/* NEW SEPARATE SECTION: EARLY WARNING & AUTOMATION SIMULATION */}
      <EarlyWarningSimulation />

      {/* MODEL INFORMATION: PRESERVED */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-[#0083BD]">
              <Waves size={22} />
            </div>
            <h3 className="font-bold text-[#102B3D]">Reservoir Visualization</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Conceptual upstream and downstream water surfaces.
            Actual water levels will be integrated from verified
            telemetry data.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <Maximize2 size={22} />
            </div>
            <h3 className="font-bold text-[#102B3D]">Model Information</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This is a demonstration geometry. Engineering dimensions,
            gate positions and terrain will be configured using
            project-specific drawings and approved model data.
          </p>
        </div>
      </section>

      {/* FOOTER: PRESERVED */}
      <footer className="border-t border-slate-200 pt-5">
        <p className="text-xs text-slate-400">
          SMART DAM 360 · Digital Twin · Chetas Control Systems
        </p>
      </footer>
    </div>
  );
}

export default DigitalTwin;
