import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Download,
  FileSpreadsheet,
  FileText,
  Gauge,
  RefreshCw,
  Search,
  ShieldCheck,
  Waves,
  X,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";

type DatasetKey = "level" | "inflow" | "outflow" | "gates";

type TelemetryRow = {
  id: string;
  recordedAt: Date;
  dataset: DatasetKey;
  parameter: string;
  station: string;
  value: number | null;
  unit: string;
  sourceFile: string;
};

type ImportState = {
  fileName: string;
  importedAt: Date;
  recordCount: number;
  firstReading: Date;
  lastReading: Date;
};

type DatasetConfig = {
  key: DatasetKey;
  title: string;
  description: string;
  icon: typeof Gauge;
  accept: string;
};

const datasetConfigs: DatasetConfig[] = [
  {
    key: "level",
    title: "Reservoir Level",
    description: "Pond level, storage capacity and dam filling percentage",
    icon: Gauge,
    accept: ".xlsx,.xls",
  },
  {
    key: "inflow",
    title: "River Inflow",
    description: "Tawakati, Machana, Panchmadhi and Sukhi readings",
    icon: Waves,
    accept: ".xlsx,.xls",
  },
  {
    key: "outflow",
    title: "Dam Outflow",
    description: "Outflow water level and discharge",
    icon: Activity,
    accept: ".xlsx,.xls",
  },
  {
    key: "gates",
    title: "Gate 1–13 Discharge",
    description: "Individual gate discharge in cumecs",
    icon: ShieldCheck,
    accept: ".xlsx,.xls",
  },
];

const gateColumns = [
  { name: "Gate 1", column: 3 },
  { name: "Gate 2", column: 4 },
  { name: "Gate 3", column: 5 },
  { name: "Gate 4", column: 7 },
  { name: "Gate 5", column: 8 },
  { name: "Gate 6", column: 9 },
  { name: "Gate 7", column: 10 },
  { name: "Gate 8", column: 12 },
  { name: "Gate 9", column: 13 },
  { name: "Gate 10", column: 14 },
  { name: "Gate 11", column: 15 },
  { name: "Gate 12", column: 16 },
  { name: "Gate 13", column: 18 },
];

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/15";

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date, using the 1899-12-30 epoch.
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(
        date.y,
        date.m - 1,
        date.d,
        date.H,
        date.M,
        Math.floor(date.S)
      );
    }
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function addRow(
  rows: TelemetryRow[],
  dataset: DatasetKey,
  recordedAt: Date | null,
  parameter: string,
  station: string,
  value: unknown,
  unit: string,
  sourceFile: string
) {
  if (!recordedAt) return;
  const numericValue = asNumber(value);
  if (numericValue === null) return;

  rows.push({
    id: `${dataset}-${recordedAt.getTime()}-${station}-${parameter}`,
    recordedAt,
    dataset,
    parameter,
    station,
    value: numericValue,
    unit,
    sourceFile,
  });
}

function parseWorkbook(file: File, dataset: DatasetKey): Promise<TelemetryRow[]> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("The workbook does not contain a worksheet.");

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    const parsed: TelemetryRow[] = [];

    // Column positions below match the four Tawa Dam workbooks supplied
    // for this integration. Data begins on worksheet row 3 (index 2).
    for (const row of rows.slice(2)) {
      if (!Array.isArray(row)) continue;

      if (dataset === "level") {
        const date = asDate(row[2]);
        addRow(parsed, dataset, date, "Live Capacity", "Reservoir", row[6], "MCM", file.name);
        addRow(parsed, dataset, date, "Gross Storage", "Reservoir", row[8], "MCM", file.name);
        addRow(parsed, dataset, date, "Pond Level", "Reservoir", row[9], "m", file.name);
        addRow(parsed, dataset, date, "Pond Level", "Reservoir (feet)", row[11], "ft", file.name);
        addRow(parsed, dataset, date, "Dam Filling", "Reservoir", row[13], "%", file.name);
      }

      if (dataset === "inflow") {
        const date = asDate(row[2]);
        const stations = [
          { name: "Tawakati", level: 6, discharge: 8 },
          { name: "Machana", level: 9, discharge: 10 },
          { name: "Panchmadhi", level: 11, discharge: 13 },
          { name: "Sukhi River", level: 15, discharge: 17 },
        ];
        for (const station of stations) {
          addRow(parsed, dataset, date, "River Level", station.name, row[station.level], "m", file.name);
          addRow(parsed, dataset, date, "Inflow Discharge", station.name, row[station.discharge], "cusecs", file.name);
        }
      }

      if (dataset === "outflow") {
        const date = asDate(row[6]);
        addRow(parsed, dataset, date, "Outflow Level", "Dam Outflow", row[7], "m", file.name);
        addRow(parsed, dataset, date, "Outflow Discharge", "Dam Outflow", row[8], "cusecs", file.name);
      }

      if (dataset === "gates") {
        const date = asDate(row[0]);
        for (const gate of gateColumns) {
          addRow(parsed, dataset, date, "Gate Discharge", gate.name, row[gate.column], "cumecs", file.name);
        }
      }
    }

    if (parsed.length === 0) {
      throw new Error("No valid timestamped readings were found. Please check that this is the correct Tawa Dam report.");
    }

    return parsed;
  });
}

function formatDate(date: Date) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function exportExcel(rows: TelemetryRow[]) {
  const data = rows.map((row) => ({
    "Date & Time": formatDate(row.recordedAt),
    Dataset: row.dataset,
    Parameter: row.parameter,
    Station: row.station,
    Value: row.value,
    Unit: row.unit,
    "Source File": row.sourceFile,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 20 },
    { wch: 14 }, { wch: 12 }, { wch: 42 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tawa Dam Data");
  XLSX.writeFile(workbook, "Tawa_Dam_Monitoring_Report.xlsx");
}

function exportPdf(rows: TelemetryRow[], fromDate: string, toDate: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(17);
  doc.setTextColor(0, 91, 135);
  doc.text("TAWA DAM MONITORING REPORT", 14, 17);
  doc.setFontSize(9);
  doc.setTextColor(90, 105, 118);
  doc.text(`Reporting period: ${fromDate || "All"} to ${toDate || "All"}`, 14, 24);
  doc.text(`Records: ${rows.length} | Generated: ${new Date().toLocaleString("en-IN")}`, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [["Date & Time", "Dataset", "Parameter", "Station", "Value", "Unit", "Source file"]],
    body: rows.slice(0, 5000).map((row) => [
      formatDate(row.recordedAt),
      row.dataset,
      row.parameter,
      row.station,
      row.value === null ? "" : String(row.value),
      row.unit,
      row.sourceFile,
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [0, 152, 219] },
    alternateRowStyles: { fillColor: [239, 247, 251] },
  });

  doc.save("Tawa_Dam_Monitoring_Report.pdf");
}

export default function Reports() {
  const [records, setRecords] = useState<TelemetryRow[]>([]);
  const [imports, setImports] = useState<Partial<Record<DatasetKey, ImportState>>>({});
  const [selectedDataset, setSelectedDataset] = useState<"all" | DatasetKey>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<DatasetKey | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const filteredRecords = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
    const query = search.trim().toLowerCase();

    return records
      .filter((row) => selectedDataset === "all" || row.dataset === selectedDataset)
      .filter((row) => !from || row.recordedAt >= from)
      .filter((row) => !to || row.recordedAt <= to)
      .filter((row) =>
        !query ||
        row.parameter.toLowerCase().includes(query) ||
        row.station.toLowerCase().includes(query) ||
        row.sourceFile.toLowerCase().includes(query)
      )
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }, [records, selectedDataset, fromDate, toDate, search]);

  const latestReading = useMemo(
    () => records.reduce<Date | null>(
      (latest, row) => !latest || row.recordedAt > latest ? row.recordedAt : latest,
      null
    ),
    [records]
  );

  const handleUpload = async (dataset: DatasetKey, file?: File) => {
    if (!file) return;
    setBusy(dataset);
    setError("");
    setNotice("");

    try {
      const importedRows = await parseWorkbook(file, dataset);
      const unique = new Map<string, TelemetryRow>();
      for (const row of importedRows) unique.set(row.id, row);

      setRecords((previous) => {
        const retained = previous.filter((row) => row.dataset !== dataset);
        return [...retained, ...unique.values()];
      });

      const dates = importedRows.map((row) => row.recordedAt.getTime());
      setImports((previous) => ({
        ...previous,
        [dataset]: {
          fileName: file.name,
          importedAt: new Date(),
          recordCount: importedRows.length,
          firstReading: new Date(Math.min(...dates)),
          lastReading: new Date(Math.max(...dates)),
        },
      }));

      setNotice(`${file.name} imported successfully. ${unique.size.toLocaleString("en-IN")} readings are ready for reporting.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import this workbook.");
    } finally {
      setBusy(null);
    }
  };

  const resetAll = () => {
    setRecords([]);
    setImports({});
    setSelectedDataset("all");
    setFromDate("");
    setToDate("");
    setSearch("");
    setError("");
    setNotice("Imported data cleared from this page. Original Excel files are unchanged.");
  };

  const datasetCount = Object.keys(imports).length;
  const latestText = latestReading ? formatDate(latestReading) : "No data imported";

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader
        title="Reports & Data Import"
        subtitle="Import Tawa Dam monitoring workbooks, review actual readings and generate date-wise reports."
      />

      <section className="rounded-xl border border-[#B8DFF1] bg-[#F0F9FD] p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 shrink-0 text-[#0098DB]" size={21} />
          <div>
            <h3 className="text-sm font-semibold text-[#07577C]">Frontend Excel reporting</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Workbooks are processed locally in this browser. No backend upload is performed. Imported readings remain in page memory and will need to be imported again after a page refresh.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              The supplied workbooks contain August 2026 readings. The latest timestamp below is taken from the imported records, not from the current clock.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {datasetConfigs.map((config) => {
          const Icon = config.icon;
          const imported = imports[config.key];
          return (
            <div key={config.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F5FB] text-[#0098DB]">
                  <Icon size={21} />
                </div>
                {imported && <CheckCircle2 size={18} className="text-emerald-600" />}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[#102B3D]">{config.title}</h3>
              <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{config.description}</p>
              {imported ? (
                <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">
                  <p className="font-semibold">{imported.recordCount.toLocaleString("en-IN")} readings imported</p>
                  <p className="mt-1 break-all text-emerald-700">{imported.fileName}</p>
                  <p className="mt-1 text-emerald-700">
                    {formatDate(imported.firstReading)} to {formatDate(imported.lastReading)}
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-[#A9D8EC] bg-[#F7FCFE] p-3 text-center">
                  <CloudUpload className="mx-auto text-[#0098DB]" size={22} />
                  <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg bg-[#0098DB] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#007FB8]">
                    {busy === config.key ? "Importing..." : "Choose Excel file"}
                    <input
                      type="file"
                      accept={config.accept}
                      className="hidden"
                      disabled={busy !== null}
                      onChange={(event) => {
                        void handleUpload(config.key, event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              )}
              {imported && (
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#0083BD] hover:underline">
                  <RefreshCw size={13} /> Replace workbook
                  <input
                    type="file"
                    accept={config.accept}
                    className="hidden"
                    disabled={busy !== null}
                    onChange={(event) => {
                      void handleUpload(config.key, event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          );
        })}
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
          <button className="ml-auto" onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> {notice}
          <button className="ml-auto" onClick={() => setNotice("")} aria-label="Dismiss message"><X size={16} /></button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Imported datasets", value: `${datasetCount}/4`, icon: FileSpreadsheet },
          { label: "Total readings", value: records.length.toLocaleString("en-IN"), icon: Activity },
          { label: "Latest reading timestamp", value: latestText, icon: Gauge },
          { label: "Filtered report rows", value: filteredRecords.length.toLocaleString("en-IN"), icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F5FB] text-[#0098DB]"><Icon size={19} /></div>
              <p className="mt-3 text-xs font-medium text-slate-500">{item.label}</p>
              <p className="mt-1 break-words text-lg font-bold text-[#102B3D]">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-lg font-semibold text-[#102B3D]">Generate Tawa Dam Report</h2>
            <p className="mt-1 text-sm text-slate-500">Filter imported records by dataset, reporting period or station.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={filteredRecords.length === 0}
              onClick={() => exportExcel(filteredRecords)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#0098DB] px-3 py-2.5 text-sm font-semibold text-[#0083BD] transition hover:bg-[#E8F5FB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button
              disabled={filteredRecords.length === 0}
              onClick={() => exportPdf(filteredRecords, fromDate, toDate)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0098DB] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007FB8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-medium text-slate-600">
            Dataset
            <select value={selectedDataset} onChange={(event) => setSelectedDataset(event.target.value as "all" | DatasetKey)} className={`${inputClass} mt-1`}>
              <option value="all">All imported datasets</option>
              {datasetConfigs.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            From date
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            To date
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Search parameter / station
            <span className="relative mt-1 block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. Gate 1, Machana..." className={`${inputClass} pl-9`} />
            </span>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">Showing {filteredRecords.length.toLocaleString("en-IN")} matching readings.</p>
          <button
            onClick={() => { setSelectedDataset("all"); setFromDate(""); setToDate(""); setSearch(""); }}
            className="text-xs font-semibold text-[#0083BD] hover:underline"
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-[#102B3D]">Imported readings</h3>
            <p className="mt-1 text-xs text-slate-500">Most recent readings are shown first.</p>
          </div>
          <span className="text-xs text-slate-500">Latest source timestamp: {latestText}</span>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="sticky top-0 bg-[#F0F7FA] text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold">Dataset</th>
                <th className="px-4 py-3 font-semibold">Parameter</th>
                <th className="px-4 py-3 font-semibold">Station</th>
                <th className="px-4 py-3 text-right font-semibold">Reading</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.slice(0, 500).map((row) => (
                <tr key={row.id} className="hover:bg-[#F5FBFE]">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(row.recordedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-600">{row.dataset}</td>
                  <td className="px-4 py-3 font-medium text-[#102B3D]">{row.parameter}</td>
                  <td className="px-4 py-3 text-slate-600">{row.station}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#102B3D]">{row.value?.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.unit}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-500" title={row.sourceFile}>{row.sourceFile}</td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  No readings available. Upload one or more Tawa Dam Excel workbooks to begin.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredRecords.length > 500 && (
          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Preview limited to 500 rows. Excel and PDF exports include all {filteredRecords.length.toLocaleString("en-IN")} filtered rows.
          </p>
        )}
      </section>

      <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center">
        <p>SMART DAM 360 · Tawa Dam Reports · Chetas Control Systems</p>
        <button onClick={resetAll} disabled={records.length === 0} className="inline-flex items-center gap-2 self-start font-semibold text-rose-600 hover:underline disabled:opacity-40 sm:self-auto">
          <X size={14} /> Clear imported data
        </button>
      </div>
    </div>
  );
}
