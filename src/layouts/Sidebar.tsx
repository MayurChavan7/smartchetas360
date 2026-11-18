
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Waves,
  Activity,
  ShieldCheck,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
} from "lucide-react";

interface SidebarProps {
  onNavigate?: () => void;
}

const menuItems = [
  { label: "Command Center", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Dam Projects", icon: Map, path: "/projects" },
  { label: "Digital Twin", icon: Waves, path: "/digital-twin" },
  { label: "Live Monitoring", icon: Activity, path: "/monitoring" },
  { label: "Dam Safety", icon: ShieldCheck, path: "/dam-safety" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Reports", icon: FileText, path: "/reports" },
  {
    label: "Predictive Analysis",
    icon: BarChart3,
    path: "/predictive-analysis",
  },
];

function Sidebar({ onNavigate }: SidebarProps) {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold leading-5 transition-all duration-200 ${
      isActive
        ? "border-[#91D8F4] bg-[#EAF7FD] text-[#075985] shadow-sm"
        : "border-transparent text-[#16415C] hover:border-[#DCE7EE] hover:bg-[#EAF7FD] hover:text-[#075985]"
    }`;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-[#DCE7EE] bg-white text-[#102B3D] lg:w-64">

      {/* LOGO AND BRANDING */}
      <div className="flex h-20 min-h-20 shrink-0 items-center gap-3 border-b border-[#DCE7EE] px-4">

        {/* COMPANY LOGO */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
          <img
            src="/ChetasLogo.webp"
            alt="Chetas Control Systems"
            className="h-full w-full object-contain"
            onError={(e) => {
              console.error(
                "Chetas logo failed to load:",
                e.currentTarget.src
              );
            }}
          />
        </div>

        {/* BRAND TEXT */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h1 className="!m-0 !whitespace-nowrap !text-[18px] !font-bold !leading-6 !tracking-wide text-[#102B3D]">
            SMART DAM
          </h1>

          <p className="!m-0 !mt-0.5 !whitespace-nowrap !text-[11px] !font-medium !leading-4 text-[#64748B]">
            INTERFACE
          </p>
        </div>
      </div>

      {/* MAIN NAVIGATION */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">

        <p className="mb-4 px-3 text-[11px] font-bold uppercase leading-5 tracking-[0.12em] text-[#64748B]">
          Main Menu
        </p>

        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onNavigate}
                className={navLinkClass}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <Icon size={20} strokeWidth={1.9} />
                </span>

                <span className="min-w-0 flex-1 whitespace-nowrap">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="shrink-0 border-t border-[#DCE7EE] p-3">

        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={navLinkClass}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <Settings size={20} strokeWidth={1.9} />
          </span>

          <span className="flex-1 whitespace-nowrap">
            Settings
          </span>
        </NavLink>

        {/* COMPANY FOOTER */}
        <div className="mt-4 flex items-center gap-2 px-3 text-[11px] font-medium text-[#64748B]">
          <ChevronLeft size={15} className="shrink-0" />
          <span className="whitespace-nowrap">
            Chetas Control Systems
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
