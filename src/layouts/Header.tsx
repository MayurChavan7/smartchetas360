
import { useLocation } from "react-router-dom";
import { UserCircle } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Command Center",
  "/projects": "Dam Projects",
  "/digital-twin": "Digital Twin",
  "/monitoring": "Live Monitoring",
  "/dam-safety": "Dam Safety",
  "/dam-safety/instrumentation": "Instrumentation",
  "/dam-safety/parameters": "Safety Parameters",
  "/dam-safety/events": "Safety Events",
  "/analytics": "Analytics",
  "/analytics/reservoir": "Reservoir Analytics",
  "/analytics/discharge": "Discharge Analytics",
  "/analytics/rainfall": "Rainfall Analytics",
  "/analytics/comparison": "Comparative Analytics",
  "/reports": "Reports",
  "/reports/reservoir": "Reservoir Reports",
  "/reports/discharge": "Discharge Reports",
  "/reports/rainfall": "Rainfall Reports",
  "/reports/safety": "Safety Reports",
  "/settings": "Settings",
};

function Header() {
  const location = useLocation();

  const pageTitle =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith("/reports/")
      ? "Report Details"
      : "SMART DAM 360");

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#24536D] bg-[#071B2A] text-white shadow-md">

      <div className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:min-h-20 lg:px-8">

        {/* PAGE TITLE */}
        <div className="min-w-0 flex-1">
          <h2 className="!text-white truncate text-base font-bold tracking-tight sm:text-lg lg:text-xl">
            {pageTitle}
          </h2>

          <p className="!text-[#91D8F4] mt-1 truncate text-[11px] font-medium sm:text-xs">
            Chetas Dam Intelligence Platform
          </p>
        </div>

        {/* ADMINISTRATOR PROFILE */}
        <div className="flex shrink-0 items-center gap-2 border-l border-[#24536D] pl-3 sm:gap-3 sm:pl-4 lg:pl-5">

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0098DB]/60 bg-[#102B3D] transition hover:bg-[#17384D]">
            <UserCircle
              size={24}
              className="!text-[#91D8F4]"
            />
          </div>

          <div className="hidden min-w-0 sm:block">
            <p className="!text-white truncate text-sm font-semibold">
              Administrator
            </p>

            <p className="!text-[#91D8F4] truncate text-xs">
              Chetas Control Systems
            </p>
          </div>

        </div>

      </div>
    </header>
  );
}

export default Header;
