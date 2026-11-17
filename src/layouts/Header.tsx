
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
      <div className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:min-h-[76px] lg:px-8">

        {/* PAGE TITLE */}
        <div className="min-w-0 flex-1">
          <h2 className="!m-0 !text-white truncate text-[19px] font-bold leading-tight tracking-tight sm:text-[21px] lg:text-[22px]">
            {pageTitle}
          </h2>

          <p className="!mb-0 !mt-1 !text-[#91D8F4] truncate text-[12px] font-medium leading-5 sm:text-[13px]">
            Chetas Dam Intelligence Platform
          </p>
        </div>

        {/* ADMINISTRATOR PROFILE */}
        <div className="flex shrink-0 items-center gap-2.5 border-l border-[#24536D] pl-3 sm:gap-3 sm:pl-4 lg:pl-5">

          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0098DB]/60 bg-[#102B3D] transition-colors hover:bg-[#17384D]">
            <UserCircle
              size={25}
              strokeWidth={1.8}
              className="!text-[#91D8F4]"
            />
          </div>

          <div className="hidden min-w-0 sm:block">
            <p className="!m-0 !text-white truncate text-[14px] font-semibold leading-5">
              Administrator
            </p>

            <p className="!mb-0 !mt-0.5 !text-[#91D8F4] truncate text-[12px] font-medium leading-5 lg:text-[13px]">
              Chetas Control Systems
            </p>
          </div>

        </div>

      </div>
    </header>
  );
}

export default Header;
