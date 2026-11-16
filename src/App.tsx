
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import DigitalTwin from "./pages/DigitalTwin";
import Monitoring from "./pages/Monitoring";
import DamSafety from "./pages/DamSafety";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

import InstrumentationPage from "./modules/dam-safety/pages/InstrumentationPage";
import SafetyParametersPage from "./modules/dam-safety/pages/SafetyParametersPage";
import SafetyEventsPage from "./modules/dam-safety/pages/SafetyEventsPage";

import ReservoirAnalyticsPage from "./modules/analytics/pages/ReservoirAnalyticsPage";
import DischargeAnalyticsPage from "./modules/analytics/pages/DischargeAnalyticsPage";
import ComparativeAnalyticsPage from "./modules/analytics/pages/ComparativeAnalyticsPage";
import RainfallAnalyticsPage from "./modules/analytics/pages/RainfallAnalyticsPage";

import ReportCategoryPage from "./modules/reports/pages/ReportCategoryPage";
import ReservoirReportsPage from "./modules/reports/pages/ReservoirReportsPage";
import DischargeReportsPage from "./modules/reports/pages/DischargeReportsPage";
import RainfallReportsPage from "./modules/reports/pages/RainfallReportsPage";
import SafetyReportsPage from "./modules/reports/pages/SafetyReportsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>

          {/* DEFAULT ROUTE */}
          <Route
            path="/"
            element={<Navigate to="/projects" replace />}
          />

          {/* COMMAND CENTER */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* DAM PROJECT DIRECTORY */}
          <Route path="/projects" element={<Projects />} />

          {/* APPLICATION MODULES */}
          <Route path="/digital-twin" element={<DigitalTwin />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/dam-safety" element={<DamSafety />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

          {/* DAM SAFETY */}
          <Route
            path="/dam-safety/instrumentation"
            element={<InstrumentationPage />}
          />
          <Route
            path="/dam-safety/parameters"
            element={<SafetyParametersPage />}
          />
          <Route
            path="/dam-safety/events"
            element={<SafetyEventsPage />}
          />

          {/* ANALYTICS */}
          <Route
            path="/analytics/reservoir"
            element={<ReservoirAnalyticsPage />}
          />
          <Route
            path="/analytics/discharge"
            element={<DischargeAnalyticsPage />}
          />
          <Route
            path="/analytics/rainfall"
            element={<RainfallAnalyticsPage />}
          />
          <Route
            path="/analytics/comparison"
            element={<ComparativeAnalyticsPage />}
          />

          {/* REPORTS */}
          <Route
            path="/reports/reservoir"
            element={<ReservoirReportsPage />}
          />
          <Route
            path="/reports/discharge"
            element={<DischargeReportsPage />}
          />
          <Route
            path="/reports/rainfall"
            element={<RainfallReportsPage />}
          />
          <Route
            path="/reports/safety"
            element={<SafetyReportsPage />}
          />
          <Route
            path="/reports/:category"
            element={<ReportCategoryPage />}
          />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
