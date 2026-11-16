
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
  { label: "Predictive Analysis", icon: BarChart3, path: "/predictive-analysis" },
];

function Sidebar({ onNavigate }: SidebarProps) {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg border px-3 py-3 text-base font-semibold transition-all duration-200 ${
      isActive
        ? "border-[#91D8F4] bg-[#EAF7FD] text-[#075985] shadow-sm"
        : "border-transparent text-[#16415C] hover:border-[#DCE7EE] hover:bg-[#EAF7FD] hover:text-[#075985]"
    }`;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-[#DCE7EE] bg-white text-[#102B3D] lg:w-64">
   {/* Logo */}
<div className="flex h-20 shrink-0 items-center gap-3 border-b border-[#DCE7EE] px-5">
  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
 <img
  src="/ChetasLogo.webp"
  alt="Chetas Control Systems"
  className="h-full w-full object-contain"
  onError={(e) => {
    console.error("Chetas logo failed to load:", e.currentTarget.src);
  }}
/>
  </div>

  <div className="min-w-0">
    <h1 className="text-lg font-bold tracking-wide text-[#102B3D]">
      SMART DAM
    </h1>
    <p className="text-xs text-[#64748B]">
      360 Intelligence
    </p>
  </div>
</div>

      {/* Main Navigation */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-[#64748B]">
          Main Menu
        </p>

        <nav className="space-y-2">
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
                <Icon size={20} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Navigation */}
      <div className="shrink-0 border-t border-[#DCE7EE] p-4">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={navLinkClass}
        >
          <Settings size={20} className="shrink-0" />
          <span>Settings</span>
        </NavLink>

        <div className="mt-4 flex items-center gap-2 px-2 text-xs text-[#64748B]">
          <ChevronLeft size={15} className="shrink-0" />
          <span>Chetas Control Systems</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
