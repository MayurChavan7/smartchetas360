
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";

import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "../components/common/Footer";

function MainLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white">

      {/* DESKTOP SIDEBAR */}
      <div className="hidden shrink-0 border-r border-slate-200 bg-white lg:flex">
        <Sidebar />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">

        {/* HEADER */}
        <div className="relative z-30 shrink-0">

          {/* MOBILE TOP BAR */}
          <div className="flex h-14 items-center gap-3 border-b border-[#24536D] bg-[#071B2A] px-3 lg:hidden">

            <button
              type="button"
              onClick={() => setMobileSidebarOpen((open) => !open)}
              aria-label={
                mobileSidebarOpen
                  ? "Close navigation"
                  : "Open navigation"
              }
              aria-expanded={mobileSidebarOpen}
              aria-controls="mobile-sidebar"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#91D8F4] transition-colors hover:bg-[#17384D] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#0098DB]"
            >
              {mobileSidebarOpen ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0098DB] text-sm font-bold text-white">
                S
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-wide text-white">
                  SMART DAM 360
                </p>
                <p className="text-[10px] text-slate-400">
                  Chetas Control Systems
                </p>
              </div>
            </div>
          </div>

          {/* APPLICATION HEADER */}
          <Header />
        </div>

        {/* SCROLLABLE PAGE CONTENT + FOOTER */}
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-white">

          {/* PAGE CONTENT */}
          <div className="px-3 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1800px]">
              <Outlet />
            </div>
          </div>

          {/* GLOBAL FOOTER */}
          {/* <Footer /> */}

        </main>
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 cursor-default bg-[#071B2A]/50 backdrop-blur-[2px] lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <div
        id="mobile-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] transform border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
        aria-hidden={!mobileSidebarOpen}
        inert={!mobileSidebarOpen}
      >
        <div className="flex h-full flex-col overflow-y-auto">

          {/* DRAWER HEADER */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-[#071B2A] px-4">

            <div>
              <p className="text-sm font-bold tracking-wide text-white">
                SMART DAM 360
              </p>
              <p className="text-[10px] text-slate-400">
                Navigation Menu
              </p>
            </div>

            <button
              type="button"
              onClick={closeMobileSidebar}
              aria-label="Close navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-[#17384D] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#0098DB]"
            >
              <X size={20} />
            </button>
          </div>

          {/* DRAWER NAVIGATION */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-white">
            <Sidebar onNavigate={closeMobileSidebar} />
          </div>

          {/* DRAWER FOOTER */}
          <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-center text-xs font-medium text-slate-500">
              Chetas Control Systems Pvt. Ltd.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default MainLayout;
