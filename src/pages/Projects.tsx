import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe2,
  MapPin,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Search,
  Waves,
  X,
} from "lucide-react";

import PageHeader from "../components/common/PageHeader";
import IndiaProjectMap from "../components/maps/IndiaProjectMap";

type LocationKind = "State" | "Union Territory" | "Country";

type ProjectLocation = {
  id: string;
  name: string;
  /** Feature name inside the India GeoJSON */
  geo: string;
  kind?: LocationKind;
  projects: string[];
};

const projectLocations: ProjectLocation[] = [
  {
    id: "maharashtra",
    name: "Maharashtra",
    geo: "Maharashtra",
    projects: [
      "Mira-Bhayander Municipal Corporation",
      "MIDC Mumbai",
      "MIDC Pune (Ravet / Chakan / Talegaon)",
      "MIDC Alibaug",
      "MIDC Tarapur",
      "MIDC Lote",
      "MIDC Roha",
      "MIDC Butibori",
      "MIDC Ambernath",
      "MIDC Ratnagiri",
      "MIDC Khedapur",
      "MIDC Baramati",
      "MIDC Bhusawal",
      "MIDC Mahad",
      "MIDC Taloja",
      "PCMC Chinchwad",
      "PCMC Sector 23",
      "MCGM (Municipal Corporation of Greater Mumbai)",
      "Navi Mumbai Municipal Corporation",
      "Kalyan Dombivali Municipal Corporation",
      "Chhatrapati Sambhaji Nagar Municipal Corporation",
      "Thane Municipal Corporation",
      "Panvel Municipal Corporation",
      "Jal Jivan Mission",
      "Maharashtra Jeevan Pradhikaran",
      "CIDCO",
    ],
  },
  {
    id: "gujarat",
    name: "Gujarat",
    geo: "Gujarat",
    projects: [
      "Ahmedabad Municipal Corporation",
      "Municipal Corporation of Vadodara",
      "GIDC Surat",
      "GIDC Rajkot",
      "GDWC Mehsana",
      "GUDA Gandhinagar",
    ],
  },
  { id: "odisha", name: "Odisha", geo: "Odisha", projects: ["PHED Odisha"] },
  {
    id: "rajasthan",
    name: "Rajasthan",
    geo: "Rajasthan",
    projects: ["PHE Rajasthan"],
  },
  {
    id: "andhra-pradesh",
    name: "Andhra Pradesh",
    geo: "Andhra Pradesh",
    projects: ["GVMC Visakhapatnam"],
  },
  {
    id: "telangana",
    name: "Telangana",
    geo: "Telangana",
    projects: [
      "NTPC Telangana",
      "NTPC Ramagundam",
      "  LMD Dam",
      "Kaddam Dam",
      "SRSP Dam",
    ],
  },
  {
    id: "madhya-pradesh",
    name: "Madhya Pradesh",
    geo: "Madhya Pradesh",
    projects: [
      "  Bargi Dam",
      "Bansagar Dam",
      "Gandhisagar Dam",
      "Sanja Sarovar Dam",
      "Tawa Dam",
      "Mohini Dam",
      "Atal Sagar Dam",
      "Barna Dam",
    ],
  },
  {
    id: "tamil-nadu",
    name: "Tamil Nadu",
    geo: "Tamil Nadu",
    projects: ["NTPC Tamil Nadu", "BHEL"],
  },
  {
    id: "west-bengal",
    name: "West Bengal",
    geo: "West Bengal",
    projects: ["PHED Kolkata"],
  },
  {
    id: "jharkhand",
    name: "Jharkhand",
    geo: "Jharkhand",
    projects: ["Damodar Valley Corporation"],
  },
  {
    id: "delhi",
    name: "Delhi",
    geo: "NCT of Delhi",
    kind: "Union Territory",
    projects: ["DJB - Delhi Jal Board"],
  },
  {
    id: "uttar-pradesh",
    name: "Uttar Pradesh",
    geo: "Uttar Pradesh",
    projects: ["UP Jal Nigam (Varanasi / Prayagraj (Allahabad) / Lucknow)"],
  },
  {
    id: "jammu-kashmir",
    name: "Jammu & Kashmir",
    geo: "Jammu and Kashmir",
    kind: "Union Territory",
    projects: ["ERA Jammu"],
  },
  {
    id: "karnataka",
    name: "Karnataka",
    geo: "Karnataka",
    projects: [
      "BWSSB (Bangalore Water Supply & Sewerage Board)",
      "Chitradurga Municipal Council",
      "HAL Bangalore",
    ],
  },
  {
    id: "kerala",
    name: "Kerala",
    geo: "Kerala",
    projects: ["KWA (Kerala Water Authority)"],
  },
  {
    id: "uttarakhand",
    name: "Uttarakhand",
    geo: "Uttarakhand",
    projects: ["UUSBIP Nainital"],
  },
  {
    id: "daman-diu",
    name: "Daman & Diu",
    geo: "Daman and Diu",
    kind: "Union Territory",
    projects: ["PWD Daman"],
  },
  {
    id: "sri-lanka",
    name: "Sri Lanka",
    geo: "Sri Lanka",
    kind: "Country",
    projects: ["NWSDB (National Water Supply and Drainage Board)"],
  },
];

const PROJECT_GEOS = projectLocations.map((l) => l.geo);

// Show every project's spotlight for 800 ms across all locations.
const getProjectDelay = (_count: number) => 800;

/** Animated number that counts up when the value changes. */
function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display.toString().padStart(2, "0")}</>;
}

function Projects() {
  const [search, setSearch] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(
    projectLocations[0].id,
  );
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  const [autoTour, setAutoTour] = useState(true);
  const [spotlightKey, setSpotlightKey] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [isMapPresentation, setIsMapPresentation] = useState(false);

  useEffect(() => {
    if (!isMapPresentation) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMapPresentation(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMapPresentation]);

  const projectListRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);

  const selectedIndex = projectLocations.findIndex(
    (l) => l.id === selectedLocationId,
  );
  const selectedLocation = projectLocations[selectedIndex] ?? projectLocations[0];

  const totalProjects = projectLocations.reduce(
    (t, l) => t + l.projects.length,
    0,
  );
  const stateCount = projectLocations.filter(
    (l) => !l.kind || l.kind === "State",
  ).length;
  const unionTerritoryCount = projectLocations.filter(
    (l) => l.kind === "Union Territory",
  ).length;
  const countryCount = projectLocations.filter(
    (l) => l.kind === "Country",
  ).length;

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projectLocations;
    return projectLocations.filter((l) =>
      `${l.name} ${l.kind ?? "State"} ${l.projects.join(" ")}`
        .toLowerCase()
        .includes(q),
    );
  }, [search]);

  const projectCount = selectedLocation.projects.length;
  const activeProject =
    selectedLocation.projects[selectedProjectIndex] ??
    selectedLocation.projects[0];
  const projectDelay = getProjectDelay(projectCount);
  const progressDuration = projectDelay * projectCount;
  const progressStart = (selectedProjectIndex / projectCount) * 100;
  const kindLabel = selectedLocation.kind ?? "State";

  const selectLocation = useCallback((id: string) => {
    setSelectedLocationId(id);
    setSelectedProjectIndex(0);
    setSpotlightKey((k) => k + 1);
  }, []);

  const showNextLocation = useCallback(() => {
    selectLocation(
      projectLocations[(selectedIndex + 1) % projectLocations.length].id,
    );
  }, [selectedIndex, selectLocation]);

  const showPreviousLocation = useCallback(() => {
    selectLocation(
      projectLocations[
        (selectedIndex - 1 + projectLocations.length) % projectLocations.length
      ].id,
    );
  }, [selectedIndex, selectLocation]);

  const selectProject = (index: number) => {
    setSelectedProjectIndex(index);
    setSpotlightKey((k) => k + 1);
  };

  const handleMapSelect = useCallback(
    (geoName: string) => {
      const loc = projectLocations.find((l) => l.geo === geoName);
      if (loc) selectLocation(loc.id);
    },
    [selectLocation],
  );

  // Auto tour: spotlight every project, then hop to the next location.
  useEffect(() => {
    if (!autoTour) return;
    const timer = window.setTimeout(() => {
      if (selectedProjectIndex + 1 < projectCount) {
        setSelectedProjectIndex((i) => i + 1);
        setSpotlightKey((k) => k + 1);
      } else {
        showNextLocation();
      }
    }, projectDelay);
    return () => window.clearTimeout(timer);
  }, [
    autoTour,
    projectDelay,
    projectCount,
    selectedProjectIndex,
    showNextLocation,
  ]);

  // Keyboard navigation (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.isContentEditable
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        showNextLocation();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        showPreviousLocation();
      } else if (e.code === "Space") {
        e.preventDefault();
        setAutoTour((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showNextLocation, showPreviousLocation]);

  // Keep the active project centred in its scroll list.
  useEffect(() => {
    const list = projectListRef.current;
    const el = list?.children[selectedProjectIndex] as HTMLElement | undefined;
    if (list && el) {
      list.scrollTo({
        top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2,
        behavior: "smooth",
      });
    }
  }, [selectedProjectIndex, selectedLocationId]);

  // Keep the active location centred in the rail.
  useEffect(() => {
    const rail = railRef.current;
    const el = rail?.querySelector<HTMLElement>('[data-active="true"]');
    if (rail && el) {
      rail.scrollTo({
        top: el.offsetTop - rail.clientHeight / 2 + el.clientHeight / 2,
        behavior: "smooth",
      });
    }
  }, [selectedLocationId]);

  return (
    <div className={isMapPresentation ? "min-w-0 bg-[#071426]" : "min-w-0 space-y-6 bg-white"}>
      <style>{`
        @keyframes spot-zoom {
          0% { transform: scale(.72); opacity: .5; }
          30% { transform: scale(1.08); opacity: 1; }
          60% { transform: scale(.97); }
          100% { transform: scale(1); }
        }
        @keyframes list-enter { from { opacity: 0; transform: translateX(14px); } to { opacity: .75; transform: none; } }
        @keyframes pin-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes arrow-nudge { 50% { transform: translateX(5px); } }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(74,222,128,.7); }
          70% { box-shadow: 0 0 0 9px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
        @keyframes tour-fill { from { width: var(--start, 0%); } to { width: 100%; } }
        @keyframes sweep { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
        .spot-zoom { animation: spot-zoom .95s ease both; transform-origin: left center; }
        .list-enter { animation: list-enter .45s both; }
        .pin-float { animation: pin-float 2.2s ease-in-out infinite; }
        .arrow-nudge { animation: arrow-nudge .8s ease-in-out infinite; }
        .pulse-ring { animation: pulse-ring 1.8s infinite; }
        .tour-fill { animation: tour-fill var(--dur, 4500ms) linear forwards; }
        .scan-line { animation: sweep 6s linear infinite; }
        .stage-scroll { scrollbar-width: thin; scrollbar-color: #1e4a73 transparent; }
        @media (prefers-reduced-motion: reduce) {
          .spot-zoom, .list-enter, .pin-float, .arrow-nudge, .pulse-ring,
          .tour-fill, .scan-line { animation: none !important; }
          .list-enter { opacity: .75; }
        }
      `}</style>

      {!isMapPresentation && (
        <PageHeader
          title="Dam Projects"
          description="Explore Chetas Control Systems project locations and the organizations served across India."
        />
      )}

      {/* Portfolio summary */}
      {!isMapPresentation && (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#EAF7FD]">
            <MapPin className="text-[#0098DB]" size={22} />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">
            Project Locations
          </p>
          <h2 className="mt-1 text-3xl font-bold text-[#102B3D]">
            <CountUp value={projectLocations.length} />
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {stateCount} states · {unionTerritoryCount} union territories ·{" "}
            {countryCount} country
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-50">
            <Building2 className="text-cyan-700" size={22} />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">
            Registered Projects
          </p>
          <h2 className="mt-1 text-3xl font-bold text-[#102B3D]">
            <CountUp value={totalProjects} />
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Across all listed locations
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50">
            <Waves className="text-teal-700" size={22} />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">
            States Covered
          </p>
          <h2 className="mt-1 text-3xl font-bold text-[#102B3D]">
            <CountUp value={stateCount} />
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Plus union territories and Sri Lanka
          </p>
        </div>
      </section>
      )}

      {/* 3D map stage */}
      <section className={isMapPresentation
        ? "fixed inset-0 z-[120] flex h-[100dvh] w-screen flex-col overflow-hidden rounded-none border-0 bg-[#071426] shadow-none"
        : "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[#102B3D]">
                National Projects Overview
              </h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <span className="pulse-ring h-2 w-2 rounded-full bg-emerald-500" />
                Live monitoring
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
                
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={showPreviousLocation}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#0098DB] hover:text-[#0098DB]"
              aria-label="Previous location"
              title="Previous location (Left arrow)"
            >
              <ChevronLeft size={19} />
            </button>
            <button
              type="button"
              onClick={showNextLocation}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#0098DB] hover:text-[#0098DB]"
              aria-label="Next location"
              title="Next location (Right arrow)"
            >
              <ChevronRight size={19} />
            </button>
            <button
              type="button"
              onClick={() => setIsMapPresentation((v) => !v)}
              aria-pressed={isMapPresentation}
              title={isMapPresentation ? "Restore page (Esc)" : "Expand map for presentation"}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-400/40 bg-[#0B2945] px-3 text-sm font-semibold text-cyan-100 transition hover:bg-[#123B5C]"
            >
              {isMapPresentation ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {isMapPresentation ? "Restore view" : "Presentation view"}
            </button>
            <button
              type="button"
              onClick={() => setAutoTour((v) => !v)}
              aria-pressed={autoTour}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
                autoTour
                  ? "bg-[#075985] text-white hover:bg-[#06496B]"
                  : "border border-[#BDE7F8] bg-[#EAF7FD] text-[#007DB5] hover:bg-[#DDF2FC]"
              }`}
            >
              {autoTour ? <Pause size={16} /> : <Play size={16} />}
              {autoTour ? "Pause tour" : "Auto tour"}
            </button>
          </div>
        </div>

        {/* Dark control-room stage */}
        <div
          className={isMapPresentation
            ? "relative min-h-0 w-full flex-1 overflow-hidden bg-[#071426] p-3 text-[#E8F2FF] sm:p-4 lg:block lg:p-0"
            : "relative flex flex-col gap-3 overflow-hidden bg-[#071426] p-3 text-[#E8F2FF] sm:p-4 lg:block lg:h-[720px] lg:p-0"}
          style={{
            backgroundImage:
              "radial-gradient(900px 560px at 50% 42%, #12345A 0%, transparent 68%), linear-gradient(135deg, #071426 0%, #0A1D35 55%, #071426 100%)",
          }}
        >
          {/* dotted grid + scan line */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(rgba(120,180,255,.10) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, #000 30%, transparent 80%)",
              maskImage:
                "radial-gradient(ellipse at center, #000 30%, transparent 80%)",
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-cyan-300/5 to-transparent scan-line" />

          {/* Map */}
          <div className={isMapPresentation
            ? "relative z-[1] h-full min-h-[420px] w-full lg:absolute lg:inset-0"
            : "relative z-[1] h-[340px] sm:h-[420px] lg:absolute lg:inset-0 lg:h-auto"}>
            <IndiaProjectMap
              activeGeo={selectedLocation.geo}
              projectGeos={PROJECT_GEOS}
              onSelectGeo={handleMapSelect}
              onReady={() => setMapReady(true)}
            />
            <div
              className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#050b1c] transition-opacity duration-500 ${
                mapReady ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-cyan-400/20 border-t-cyan-400" />
              <p className="text-xs font-semibold tracking-[0.3em] text-cyan-300">
                INITIALIZING SYSTEM
              </p>
            </div>
          </div>

          {/* Left rail: locations */}
          <nav
            aria-label="Project locations"
            className="relative z-[2] flex max-h-[360px] flex-col rounded-2xl border border-[#244B70] bg-[rgba(8,24,46,.94)] p-3.5 shadow-2xl backdrop-blur-xl lg:absolute lg:bottom-16 lg:left-5 lg:top-5 lg:max-h-none lg:w-[270px]"
          >
            <div className="mb-3 flex gap-2.5">
              <div className="flex-1 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2">
                <b className="block text-2xl font-extrabold leading-none">
                  <CountUp value={projectLocations.length} />
                </b>
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  Locations
                </span>
              </div>
              <div className="flex-1 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2">
                <b className="block text-2xl font-extrabold leading-none">
                  <CountUp value={totalProjects} />
                </b>
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  Projects
                </span>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-400/20 bg-white/5 px-2.5 py-2 focus-within:border-cyan-400">
              <Search size={15} className="shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search locations or projects"
                aria-label="Search locations or projects"
                className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <ul
              ref={railRef}
              className="stage-scroll relative grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto pr-1"
            >
              {filteredLocations.map((loc) => {
                const on = loc.id === selectedLocationId;
                return (
                  <li key={loc.id} data-active={on}>
                    <button
                      type="button"
                      onClick={() => selectLocation(loc.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[13px] font-medium transition ${
                        on
                          ? "border-amber-400/60 bg-gradient-to-r from-amber-400/25 to-amber-400/5 shadow-[0_0_22px_rgba(251,191,36,.18)]"
                          : "border-transparent bg-white/[.03] hover:bg-sky-400/10"
                      }`}
                    >
                      <MapPin
                        size={16}
                        className={on ? "text-amber-400" : "text-sky-400"}
                      />
                      <span className="min-w-0 flex-1 truncate">{loc.name}</span>
                      {loc.kind && !["delhi", "jammu-kashmir"].includes(loc.id) && (
                        <span className="rounded-md border border-slate-300/40 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-slate-300">
                          {loc.kind === "Country" ? "Country" : "UT"}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          on
                            ? "bg-amber-400 text-amber-950"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {loc.projects.length}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filteredLocations.length === 0 && (
                <li className="px-2 py-6 text-center text-xs text-slate-400">
                  No matching locations or projects
                </li>
              )}
            </ul>
          </nav>

          {/* Legend */}
          <div className="relative z-[2] flex flex-wrap gap-x-4 gap-y-1 rounded-full border border-[#244B70] bg-[rgba(8,24,46,.94)] px-4 py-2.5 text-[11px] text-slate-400 backdrop-blur-xl lg:absolute lg:bottom-5 lg:left-5">
            <span className="flex items-center gap-2">
              <i className="h-2.5 w-2.5 rounded-sm bg-[#F4B740]" /> Active
            </span>
            <span className="flex items-center gap-2">
              <i className="h-2.5 w-2.5 rounded-sm bg-[#3B82C4]" /> Project
              location
            </span>
            <span className="flex items-center gap-2">
              <i className="h-2.5 w-2.5 rounded-sm border border-[#34507f] bg-[#0f1d3a]" />{" "}
              No project
            </span>
          </div>

          {/* Right card: spotlight */}
          <aside
            aria-live="polite"
            className="relative z-[2] flex min-h-0 flex-col rounded-2xl border border-[#244B70] bg-[rgba(8,24,46,.94)] p-5 shadow-2xl backdrop-blur-xl lg:absolute lg:bottom-5 lg:right-5 lg:top-5 lg:w-[410px]"
          >
            <div className="mb-4 flex items-center gap-3.5 border-b border-sky-400/20 pb-4">
              <div className="pin-float flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 text-amber-950 shadow-[0_0_26px_rgba(251,191,36,.5)]">
                {selectedLocation.kind === "Country" ? (
                  <Globe2 size={24} />
                ) : (
                  <MapPin size={24} />
                )}
              </div>
              <div className="min-w-0">
                <small className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                  Active {kindLabel.toLowerCase()}
                </small>
                <h3 className="break-words text-2xl font-extrabold leading-tight">
                  {selectedLocation.name}
                </h3>
              </div>
              <div className="ml-auto shrink-0 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                <b className="block text-xl tabular-nums text-white">
                  {projectCount}
                </b>
                projects
              </div>
            </div>

            <div
              key={spotlightKey}
              className="mb-3.5 min-h-[9rem] overflow-hidden rounded-2xl border border-amber-400/70 bg-gradient-to-br from-amber-600/35 to-amber-900/20 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <small className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400">
                  Project {selectedProjectIndex + 1} of {projectCount}
                </small>
              </div>
              <div className="spot-zoom mt-2 break-words text-[clamp(1.5rem,2.4vw,2.4rem)] font-extrabold leading-tight">
                {activeProject}
              </div>
            </div>

            <div
              ref={projectListRef}
              className="stage-scroll relative grid max-h-[280px] min-h-0 flex-1 auto-rows-min content-start gap-2 overflow-y-auto pr-1 lg:max-h-none"
            >
              {selectedLocation.projects.map((project, index) => {
                const on = index === selectedProjectIndex;
                return (
                  <button
                    key={`${selectedLocation.id}-${project}`}
                    type="button"
                    onClick={() => selectProject(index)}
                    style={
                      {
                        animationDelay: `${Math.min(index * 40, 800)}ms`,
                      } as CSSProperties
                    }
                    className={`flex origin-left items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm leading-snug transition duration-300 ${
                      on
                        ? "scale-[1.03] border-amber-400 bg-amber-600/40 font-bold opacity-100 shadow-[0_0_22px_rgba(251,191,36,.22)]"
                        : "list-enter border-sky-400/20 bg-[rgba(14,60,96,.35)] font-medium opacity-75 hover:opacity-100"
                    }`}
                  >
                    <ArrowRight
                      size={16}
                      className={`shrink-0 ${
                        on ? "arrow-nudge text-amber-400" : "text-transparent"
                      }`}
                    />
                    <MapPin
                      size={16}
                      className="shrink-0 text-amber-400"
                    />
                    <span className="min-w-0 flex-1 break-words">{project}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span>{autoTour ? "Tour in progress" : "Tour paused"}</span>
                <span className="hidden sm:inline normal-case tracking-normal">
                  ← → switch · Space pause
                </span>
              </div>
              <div className="h-[3px] overflow-hidden rounded bg-white/10">
                <div
                  key={`${selectedLocationId}-${selectedProjectIndex}-${autoTour}`}
                  className={`h-full rounded bg-gradient-to-r from-amber-500 to-amber-200 ${
                    autoTour ? "tour-fill" : ""
                  }`}
                  style={
                    {
                      "--start": `${progressStart}%`,
                      "--dur": `${projectDelay}ms`,
                      width: autoTour
                        ? undefined
                        : `${((selectedProjectIndex + 1) / projectCount) * 100}%`,
                    } as CSSProperties
                  }
                />
              </div>
              <p className="sr-only">Total tour time {progressDuration} ms</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default Projects;