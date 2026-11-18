
import { useEffect, useState } from "react";
import {
  Box,
  Waves,
  Rotate3D,
  Maximize2,
  Minimize2,
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
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  useEffect(() => {
    if (!isPresentationMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPresentationMode(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresentationMode]);

  return (
    <div className="w-full min-w-0 max-w-none space-y-4 bg-white px-0 sm:space-y-5">

      {/* PAGE HEADER */}
      {!isPresentationMode && (
        <PageHeader
          title="Digital Twin"
          description="Interactive 3D visualization of dam infrastructure."
        />
      )}

      {/* DAM SELECTOR */}
      {!isPresentationMode && (
        <section className="flex w-full min-w-0 flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Select Dam Project
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {dams.map((dam) => (
                <button
                  key={dam.id}
                  type="button"
                  onClick={() => setSelectedDam(dam)}
                  aria-pressed={selectedDam.id === dam.id}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0098DB]/20 ${
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

          <div className="flex w-fit shrink-0 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-amber-700"></span>
          </div>
        </section>
      )}

      {/* DAM INFORMATION CARDS */}
      {!isPresentationMode && (
        <section className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">

          {/* PROJECT */}
          <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#0083BD]">
                <Box size={21} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  Selected Project
                </p>
                <h2 className="mt-1 break-words text-base font-bold text-[#102B3D]">
                  {selectedDam.name}
                </h2>
              </div>
            </div>
          </div>

          {/* LOCATION */}
          <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <Maximize2 size={21} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Location</p>
                <h2 className="mt-1 break-words text-sm font-bold leading-5 text-[#102B3D]">
                  {selectedDam.location}
                </h2>
              </div>
            </div>
          </div>

          {/* RIVER */}
          <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Waves size={21} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">River</p>
                <h2 className="mt-1 break-words text-base font-bold text-[#102B3D]">
                  {selectedDam.river}
                </h2>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3D DIGITAL TWIN */}
      <section
        className={
          isPresentationMode
            ? "fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden rounded-none border-0 bg-[#EAF7FD] shadow-none"
            : "relative w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        }
        aria-label={`${selectedDam.name} 3D digital twin`}
      >

        {/* 3D HEADER */}
        <div className="relative z-20 flex shrink-0 flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:px-4 lg:px-5">

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

          {/* HEADER ACTIONS */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">

            {/* ROTATION HELP */}
            <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
              <Rotate3D size={16} className="shrink-0 text-[#0083BD]" />
              <span>Drag to rotate | Scroll to zoom</span>
            </div>

            {/* PRESENTATION BUTTON */}
            <button
              type="button"
              onClick={() => setIsPresentationMode((current) => !current)}
              aria-label={
                isPresentationMode
                  ? "Exit presentation view"
                  : "Expand 3D model to fill screen"
              }
              aria-pressed={isPresentationMode}
              title={
                isPresentationMode
                  ? "Restore normal view (Esc)"
                  : "Expand model for presentation"
              }
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0083BD] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#006B9C] focus:outline-none focus:ring-2 focus:ring-[#0098DB]/40 focus:ring-offset-2 sm:flex-none sm:px-4"
            >
              {isPresentationMode ? (
                <>
                  <Minimize2 size={16} />
                  <span>Restore View</span>
                </>
              ) : (
                <>
                  <Maximize2 size={16} />
                  <span className="hidden sm:inline">Presentation View</span>
                  <span className="sm:hidden">Expand</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3D SCENE */}
        <div
          className={
            isPresentationMode
              ? "relative min-h-0 w-full flex-1 overflow-hidden bg-[#EAF7FD]"
              : "relative h-[300px] w-full overflow-hidden bg-[#EAF7FD] sm:h-[400px] md:h-[480px] lg:h-[520px] xl:h-[600px]"
          }
        >
          <div className="absolute inset-0">
            <DamScene />
          </div>

          {/* PRESENTATION LABEL */}
          {isPresentationMode && (
            <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-[calc(100%-2rem)] rounded-lg border border-white/70 bg-white/85 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
              {selectedDam.name} · Presentation Mode
            </div>
          )}
        </div>

        {/* 3D FOOTER */}
        <div className="relative z-20 flex shrink-0 flex-col justify-between gap-2 border-t border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:px-4 lg:px-5">

          <p className="text-xs text-slate-500">
            Viewing:{" "}
            <span className="font-semibold text-[#102B3D]">
              {selectedDam.name}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {isPresentationMode && (
              <span className="hidden text-[10px] text-slate-400 sm:inline">
                Press Esc to exit
              </span>
            )}

            <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700"></span>
          </div>
        </div>
      </section>

      {/* EARLY WARNING SIMULATION */}
      {!isPresentationMode && <EarlyWarningSimulation />}

      {/* BOTTOM INFORMATION */}
      {!isPresentationMode && (
        <section className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">

          {/* RESERVOIR */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#0083BD]">
                <Waves size={22} />
              </div>
              <h3 className="text-sm font-bold text-[#102B3D] sm:text-base">
                Reservoir Visualization
              </h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Conceptual upstream and downstream water surfaces. Actual water
              levels will be integrated from verified telemetry data.
            </p>
          </div>

          {/* MODEL INFORMATION */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <Maximize2 size={22} />
              </div>
              <h3 className="text-sm font-bold text-[#102B3D] sm:text-base">
                Model Information
              </h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              This is a demonstration geometry. Engineering dimensions, gate
              positions and terrain will be configured using project-specific
              drawings and approved model data.
            </p>
          </div>
        </section>
      )}

      {/* FOOTER */}
      {!isPresentationMode && (
        <footer className="w-full border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-400">
            SMART DAM    · Digital Twin · Chetas Control Systems
          </p>
        </footer>
      )}
    </div>
  );
}

export default DigitalTwin;
