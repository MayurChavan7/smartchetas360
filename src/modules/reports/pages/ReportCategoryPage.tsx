
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Info,
} from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";

const reportConfig: Record<
  string,
  { title: string; description: string }
> = {
  reservoir: {
    title: "Reservoir Reports",
    description:
      "Generate reservoir level, storage capacity and filling percentage reports.",
  },
  discharge: {
    title: "Discharge Reports",
    description:
      "Generate inflow, spillway, canal and cumulative discharge reports.",
  },
  rainfall: {
    title: "Rainfall Reports",
    description:
      "Generate daily, monthly and annual rainfall reports.",
  },
  safety: {
    title: "Instrumentation & Safety Reports",
    description:
      "Generate instrument readings, availability and safety event reports.",
  },
};

export default function ReportCategoryPage() {
  const { category } = useParams();

  const config = category ? reportConfig[category] : undefined;

  if (!config) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">
          Report category not found
        </h2>

        <Link
          to="/reports"
          className="mt-4 inline-block text-sm text-cyan-400"
        >
          Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        subtitle={config.description}
      />

      <Link
        to="/reports"
        className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
      >
        <ArrowLeft size={17} />
        Back to Reports Overview
      </Link>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-3">
          <Info className="text-amber-400" size={21} />

          <h3 className="font-semibold text-amber-300">
            Report integration pending
          </h3>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          The report filters, data tables, report preview and
          download functionality will be implemented in this
          section.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
        <FileText
          size={40}
          className="mx-auto text-cyan-400"
        />

        <h3 className="mt-4 text-lg font-semibold text-white">
          {config.title}
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          Report interface is ready for development.
        </p>
      </div>
    </div>
  );
}
