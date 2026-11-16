import {
  Waves,
  Droplets,
  Activity,
  Building2,
  MapPin,
  Gauge,
  ShieldCheck,
  Map,
  Radio,
  Layers3,
  Database,
} from "lucide-react";

const statistics = [
  {
    title: "Total Dam Projects",
    value: "11",
    subtitle: "Across Madhya Pradesh & Telangana",
    icon: Building2,
    tone: "blue",
  },
  {
    title: "Digital Twin Models",
    value: "02",
    subtitle: "Tawa Dam and Bansagar Dam",
    icon: Waves,
    tone: "cyan",
  },
  {
    title: "Monitoring Overview",
    value: "02",
    subtitle: "Tawa and Bansagar monitoring views",
    icon: Activity,
    tone: "teal",
  },
  {
    title: "Project States",
    value: "02",
    subtitle: "Madhya Pradesh and Telangana",
    icon: MapPin,
    tone: "teal",
  },
];

const projectGroups = [
  {
    state: "Madhya Pradesh",
    short: "MP",
    count: 8,
    share: "73%",
    description: "Dam automation project portfolio",
    tone: "blue",
  },
  {
    state: "Telangana",
    short: "TG",
    count: 3,
    share: "27%",
    description: "Dam automation project portfolio",
    tone: "cyan",
  },
];

const featuredProjects = [
  {
    name: "Tawa Dam",
    location: "Narmadapuram, Madhya Pradesh",
    river: "Tawa River",
    code: "TAWA",
    description: "Digital Twin and monitoring view",
    icon: Waves,
    tone: "blue",
    metrics: [
      { label: "Model", value: "3D Digital Twin" },
      { label: "Data mode", value: "Simulated" },
    ],
  },
  {
    name: "Bansagar Dam",
    location: "Shahdol, Madhya Pradesh",
    river: "Sone River",
    code: "BANSAGAR",
    description: "Digital Twin and monitoring view",
    icon: Droplets,
    tone: "cyan",
    metrics: [
      { label: "Model", value: "3D Digital Twin" },
      { label: "Data mode", value: "Simulated" },
    ],
  },
];

const toneStyles = {
  blue: {
    icon: "bg-sky-50 text-[#0098DB]",
    border: "hover:border-sky-200",
    soft: "bg-sky-50",
    text: "text-[#007DB5]",
    bar: "bg-[#0098DB]",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-700",
    border: "hover:border-cyan-200",
    soft: "bg-cyan-50",
    text: "text-cyan-700",
    bar: "bg-cyan-500",
  },
  violet: {
    icon: "bg-teal-50 text-teal-700",
    border: "hover:border-violet-200",
    soft: "bg-violet-50",
    text: "text-teal-700",
    bar: "bg-teal-500",
  },
  teal: {
    icon: "bg-teal-50 text-teal-700",
    border: "hover:border-teal-200",
    soft: "bg-teal-50",
    text: "text-teal-700",
    bar: "bg-teal-500",
  },
};

function Dashboard() {
  return (
    <div className="min-h-full min-w-0 space-y-6 bg-white pb-8">

      {/* PAGE INTRO */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#071B2A] via-[#0B3045] to-[#075985] px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-[#0098DB]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#91D8F4]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#BDEBFC]">
                Chetas Control Systems
              </span>
            </div>

            <h1 className="!text-white text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Command Center
            </h1>

            <p className="!text-slate-200 mt-2 max-w-2xl text-sm leading-6 sm:text-base">
              A unified view of dam projects, Digital Twin models and
              monitoring views across India.
            </p>
          </div>

          <div className="flex w-fit shrink-0 items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0098DB]">
              <Activity size={21} className="text-white" />
            </div>
            <div>
              <p className="!text-white text-sm font-semibold">Platform overview</p>
              <p className="!text-slate-200 mt-0.5 text-xs">
                Project portfolio and monitoring
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO SUMMARY */}
      <section>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#102B3D]">
              Portfolio at a glance
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Project portfolio and monitoring overview
            </p>
          </div>
          <span className="w-fit rounded-full border border-[#BDE7F8] bg-[#EAF7FD] px-3 py-1 text-xs font-semibold text-[#007DB5]">
            Simulated data
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statistics.map((item) => {
            const Icon = item.icon;
            const tone = toneStyles[item.tone as keyof typeof toneStyles];

            return (
              <article
                key={item.title}
                className={`min-w-0 rounded-xl border border-[#DCE7EE] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#91D8F4] hover:shadow-md sm:p-5 ${tone.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                      {item.title}
                    </p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-[#102B3D] sm:text-4xl">
                      {item.value}
                    </p>
                  </div>

                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
                    <Icon size={22} />
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {item.subtitle}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* PROJECT FOOTPRINT + FEATURED DIGITAL TWINS */}
      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-5">

        {/* PROJECT FOOTPRINT */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-[#DCE7EE] bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-[#102B3D]">Project footprint</h2>
              <p className="mt-1 text-xs text-slate-500">
                Distribution across project states
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF7FD] text-[#0098DB]">
              <Map size={19} />
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="rounded-xl bg-gradient-to-br from-[#EAF7FD] via-white to-[#F0FDFA] p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Registered project portfolio
                  </p>
                  <p className="mt-1 text-3xl font-bold text-[#102B3D]">11</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#007DB5] shadow-sm">
                  2 states
                </span>
              </div>

              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-[#0098DB]" style={{ width: "73%" }} />
                <div className="h-full bg-cyan-500" style={{ width: "27%" }} />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0098DB]" />
                  Madhya Pradesh
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  Telangana
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {projectGroups.map((group) => {
                const tone = toneStyles[group.tone as keyof typeof toneStyles];

                return (
                  <div
                    key={group.short}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tone.icon}`}>
                      {group.short}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#102B3D]">
                        {group.state}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {group.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-[#102B3D]">
                        {group.count}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400">
                        {group.share}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] leading-5 text-slate-400">
              Portfolio counts are directory information, not live telemetry.
            </p>
          </div>
        </div>

        {/* FEATURED PROJECTS */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-[#DCE7EE] bg-white shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-[#102B3D]">
                Featured Digital Twin Projects
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Digital Twin models available on the platform
              </p>
            </div>
            <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 sm:flex">
              <Layers3 size={19} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:p-5 lg:grid-cols-2">
            {featuredProjects.map((project) => {
              const Icon = project.icon;
              const tone = toneStyles[project.tone as keyof typeof toneStyles];

              return (
                <article
                  key={project.code}
                  className={`flex min-w-0 flex-col rounded-xl border border-[#DCE7EE] bg-white p-4 transition duration-200 hover:border-[#91D8F4] hover:shadow-md ${tone.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
                      <Icon size={23} />
                    </div>
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      Model available
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-[#102B3D]">
                    {project.name}
                  </h3>
                  <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-[#0098DB]" />
                    <span>{project.location}</span>
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    River: <span className="font-medium text-slate-700">{project.river}</span>
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                    {project.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-lg bg-slate-50 p-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {metric.label}
                        </p>
                        <p className="mt-1 break-words text-xs font-semibold text-[#102B3D]">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {project.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* PLATFORM CAPABILITIES */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#102B3D]">
            Platform capabilities
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Core modules available in the SMART DAM 360 interface
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="shrink-0 rounded-lg bg-[#EAF7FD] p-2.5 text-[#0098DB]">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#102B3D]">
                Dam intelligence
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                A unified workspace for project visibility, dam information and operational context.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="shrink-0 rounded-lg bg-cyan-50 p-2.5 text-cyan-700">
              <Gauge size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#102B3D]">
                Monitoring insights
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Reservoir, inflow, outflow, rainfall and gate readings presented with simulated values.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="shrink-0 rounded-lg bg-violet-50 p-2.5 text-teal-700">
              <Database size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#102B3D]">
                Data presentation
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Interactive charts, project summaries and Digital Twin visualizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SIMULATED DATA NOTE */}
      <section className="flex flex-col gap-3 rounded-xl border border-[#BDE7F8] bg-[#F0F9FF] p-4 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#0098DB] shadow-sm">
          <Radio size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#102B3D]">
            Simulated data overview
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            This dashboard presents illustrative project information and simulated readings. It is not connected to live SCADA telemetry and must not be used for operational or dam-safety decisions.
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-[#BDE7F8] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#007DB5]">
          Simulation
        </span>
      </section>

      {/* FOOTER */}
      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>SMART DAM 360 · Chetas Control Systems Pvt. Ltd.</p>
        <p>Dam intelligence and Digital Twin platform</p>
      </footer>
    </div>
  );
}

export default Dashboard;
