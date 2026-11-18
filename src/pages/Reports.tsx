import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Gauge,
  Search,
  Waves,
  Droplets,
  Radio,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";

type DatasetKey = "level" | "inflow" | "outflow" | "gates";
type TelemetryRow = {
  id: string;
  recordedAt: Date;
  dataset: DatasetKey;
  parameter: string;
  station: string;
  value: number;
  unit: string;
  source: string;
};

const datasetConfigs = [
  { key: "level" as DatasetKey, title: "Reservoir Level", description: "Pond level and live storage", icon: Gauge, frequency: "Every 15 minutes" },
  { key: "inflow" as DatasetKey, title: "River Inflow", description: "River station levels and inflow", icon: Waves, frequency: "Every 15 minutes" },
  { key: "outflow" as DatasetKey, title: "Dam Outflow", description: "Downstream discharge readings", icon: Droplets, frequency: "Every 15 minutes" },
  { key: "gates" as DatasetKey, title: "Gate Discharge", description: "Gate-wise discharge overview", icon: Radio, frequency: "On operational update" },
];

const stations = ["Tawakati", "Machana", "Panchmadhi", "Sukhi River"];
function buildDemoRecords(): TelemetryRow[] {
  const now = new Date();
  const records: TelemetryRow[] = [];
  const add = (offsetMinutes: number, dataset: DatasetKey, parameter: string, station: string, value: number, unit: string) => {
    const time = new Date(now.getTime() - offsetMinutes * 60000);
    records.push({ id: `${dataset}-${offsetMinutes}-${station}-${parameter}`, recordedAt: time, dataset, parameter, station, value, unit, source: "Telemetry Feed        " });
  };
  for (let i = 0; i < 16; i++) {
    const m = i * 15;
    add(m, "level", "Pond Level", "Reservoir", 353.72 + Math.sin(i / 3) * 0.08, "m");
    add(m, "level", "Live Storage", "Reservoir", 1742.1 + Math.sin(i / 4) * 2.4, "MCM");
    add(m, "inflow", "Inflow Discharge", stations[i % stations.length], 110 + (i * 17) % 85, "cusecs");
    add(m, "outflow", "Outflow Discharge", "Dam Outflow", 190 + (i * 11) % 42, "cusecs");
  }
  for (let gate = 1; gate <= 13; gate++) add((gate % 5) * 15, "gates", "Gate Discharge", `Gate ${gate}`, gate % 4 === 0 ? 0 : 14 + (gate * 2.7) % 35, "cumecs");
  return records.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
}
const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0098DB] focus:ring-2 focus:ring-[#0098DB]/15";
function formatDate(date: Date) {
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function exportExcel(rows: TelemetryRow[]) {
  const data = rows.map((row) => ({ "Date & Time": formatDate(row.recordedAt), Dataset: row.dataset, Parameter: row.parameter, Station: row.station, Reading: row.value, Unit: row.unit, Source: row.source }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 24 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tawa Dam Report");
  XLSX.writeFile(workbook, "Tawa_Dam_Monitoring_Report.xlsx");
}
function exportPdf(rows: TelemetryRow[], fromDate: string, toDate: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(17); doc.setTextColor(0, 91, 135);
  doc.text("TAWA DAM MONITORING REPORT", 14, 17);
  doc.setFontSize(9); doc.setTextColor(90, 105, 118);
  doc.text(`Reporting period: ${fromDate || "All available"} to ${toDate || "All available"}`, 14, 24);
  doc.text(`Records: ${rows.length} | Generated: ${new Date().toLocaleString("en-IN")} | DEMONSTRATION DATA`, 14, 30);
  autoTable(doc, { startY: 36, head: [["Date & Time", "Dataset", "Parameter", "Station", "Reading", "Unit", "Source"]], body: rows.slice(0, 5000).map((row) => [formatDate(row.recordedAt), row.dataset, row.parameter, row.station, row.value.toString(), row.unit, row.source]), styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [0, 152, 219] }, alternateRowStyles: { fillColor: [239, 247, 251] } });
  doc.save("Tawa_Dam_Monitoring_Report.pdf");
}
export default function Reports() {
  const records = useMemo(() => buildDemoRecords(), []);
  const [selectedDataset, setSelectedDataset] = useState<"all" | DatasetKey>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
const [lastRefresh] = useState(new Date());
  const filteredRecords = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
    const query = search.trim().toLowerCase();
    return records.filter((row) => selectedDataset === "all" || row.dataset === selectedDataset)
      .filter((row) => !from || row.recordedAt >= from).filter((row) => !to || row.recordedAt <= to)
      .filter((row) => !query || row.parameter.toLowerCase().includes(query) || row.station.toLowerCase().includes(query))
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }, [records, selectedDataset, fromDate, toDate, search]);
  const latestReading = records[0]?.recordedAt ?? new Date();
  const updateTime = formatDate(lastRefresh);
  const counts = datasetConfigs.map((config) => ({ ...config, count: records.filter((r) => r.dataset === config.key).length, latest: records.filter((r) => r.dataset === config.key).sort((a,b) => b.recordedAt.getTime()-a.recordedAt.getTime())[0]?.recordedAt }));

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader title="Reports & Data Updates" subtitle="Review monitoring data freshness, recent updates and generate dam reports." />

      {/* Data update overview
      <section className="rounded-xl border border-[#B8DFF1] bg-[#F0F9FD] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0098DB] shadow-sm"><RefreshCw size={22} /></div>
            <div>
              <h3 className="font-semibold text-[#07577C]">Data Update Overview</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">Monitoring records are organized by dataset. Update information is displayed for quick review before generating a report.</p>
              <p className="mt-2 text-xs text-slate-500">Demo mode · values shown are illustrative and are not connected to live SCADA telemetry.</p>
            </div>
          </div>
          <button onClick={() => setLastRefresh(new Date())} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#9AD5EF] bg-white px-3 py-2 text-sm font-semibold text-[#007FB8] hover:bg-[#E6F6FD]"><RefreshCw size={15}/> Refresh status</button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[#D5EAF4] bg-white p-3"><p className="text-xs text-slate-500">Latest sample reading</p><p className="mt-1 font-semibold text-[#102B3D]">{formatDate(latestReading)}</p></div>
          <div className="rounded-lg border border-[#D5EAF4] bg-white p-3"><p className="text-xs text-slate-500">Status check updated</p><p className="mt-1 font-semibold text-[#102B3D]">{updateTime}</p></div>
          <div className="rounded-lg border border-[#D5EAF4] bg-white p-3"><p className="text-xs text-slate-500">Update cadence</p><p className="mt-1 font-semibold text-[#102B3D]">15-minute sample interval</p></div>
        </div>
      </section> */}


      {/* Dataset update cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((item) => { const Icon = item.icon; return (
          <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F5FB] text-[#0098DB]"><Icon size={21}/></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={13}/> Updated</span></div>
            <h3 className="mt-3 text-sm font-semibold text-[#102B3D]">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
            <div className="mt-3 rounded-lg bg-slate-50 p-2.5"><p className="text-xs font-semibold text-slate-700">{item.count.toLocaleString("en-IN")} sample readings</p><p className="mt-1 text-xs text-slate-500">Refresh: {item.frequency}</p><p className="mt-1 text-xs text-slate-500">Last record: {item.latest ? formatDate(item.latest) : "No records"}</p></div>
          </div>);})}
      </section>

      {/* Recent update activity */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2"><Clock size={18} className="text-[#0098DB]"/><h2 className="font-semibold text-[#102B3D]">Recent Data Update Activity</h2></div>
        <p className="mt-1 text-xs text-slate-500">Summary of dataset refresh information in the current demonstration view.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {counts.map((item, idx) => <div key={item.key} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"><div className="mt-0.5 rounded-full bg-emerald-50 p-1.5 text-emerald-600"><CheckCircle2 size={16}/></div><div className="min-w-0"><p className="text-sm font-semibold text-[#102B3D]">{item.title} data refreshed</p><p className="mt-1 text-xs text-slate-500">{item.latest ? formatDate(item.latest) : updateTime} · {item.count} records available</p><p className="mt-1 text-xs text-slate-500">{idx === 3 ? "Gate-wise values summarized for the current display." : "Latest sample readings included in report view."}</p></div></div>)}
        </div>
      </section>


      {/* KPI summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Datasets Available", value: "4 / 4", icon: FileSpreadsheet },
          { label: "Total Sample Readings", value: records.length.toLocaleString("en-IN"), icon: Activity },
          { label: "Latest Reading", value: formatDate(latestReading), icon: Gauge },
          { label: "Filtered Report Rows", value: filteredRecords.length.toLocaleString("en-IN"), icon: FileText },
        ].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F5FB] text-[#0098DB]"><Icon size={19}/></div><p className="mt-3 text-xs font-medium text-slate-500">{item.label}</p><p className="mt-1 break-words text-lg font-bold text-[#102B3D]">{item.value}</p></div>;})}
      </section>

      {/* Report filters and export */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end"><div><h2 className="text-lg font-semibold text-[#102B3D]">Generate Tawa Dam Report</h2><p className="mt-1 text-sm text-slate-500">Select a dataset, date range or station to prepare a report.</p></div><div className="flex flex-wrap gap-2">
          <button disabled={!filteredRecords.length} onClick={() => exportExcel(filteredRecords)} className="inline-flex items-center gap-2 rounded-lg border border-[#0098DB] px-3 py-2.5 text-sm font-semibold text-[#0083BD] hover:bg-[#E8F5FB] disabled:cursor-not-allowed disabled:opacity-40"><FileSpreadsheet size={16}/> Export Excel</button>
          <button disabled={!filteredRecords.length} onClick={() => exportPdf(filteredRecords, fromDate, toDate)} className="inline-flex items-center gap-2 rounded-lg bg-[#0098DB] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#007FB8] disabled:cursor-not-allowed disabled:opacity-40"><Download size={16}/> Download PDF</button>
        </div></div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-medium text-slate-600">Dataset<select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value as "all" | DatasetKey)} className={`${inputClass} mt-1`}><option value="all">All datasets</option>{datasetConfigs.map((d)=><option key={d.key} value={d.key}>{d.title}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">From date<input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} className={`${inputClass} mt-1`}/></label>
          <label className="text-xs font-medium text-slate-600">To date<input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} className={`${inputClass} mt-1`}/></label>
          <label className="text-xs font-medium text-slate-600">Search parameter / station<span className="relative mt-1 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="e.g. Gate 1, Machana..." className={`${inputClass} pl-9`}/></span></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">Showing {filteredRecords.length.toLocaleString("en-IN")} matching readings.</p><button onClick={()=>{setSelectedDataset("all");setFromDate("");setToDate("");setSearch("");}} className="text-xs font-semibold text-[#0083BD] hover:underline">Clear filters</button></div>
      </section>


      {/* Readings table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center"><div><h3 className="font-semibold text-[#102B3D]">Monitoring Data Preview</h3><p className="mt-1 text-xs text-slate-500">Most recent records first · Demonstration values</p></div><span className="text-xs text-slate-500">Latest record: {formatDate(latestReading)}</span></div>
        <div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="sticky top-0 bg-[#F0F7FA] text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-4 py-3 font-semibold">Date & Time</th><th className="px-4 py-3 font-semibold">Dataset</th><th className="px-4 py-3 font-semibold">Parameter</th><th className="px-4 py-3 font-semibold">Station</th><th className="px-4 py-3 text-right font-semibold">Reading</th><th className="px-4 py-3 font-semibold">Unit</th><th className="px-4 py-3 font-semibold">Source</th></tr></thead><tbody className="divide-y divide-slate-100">
          {filteredRecords.slice(0,500).map(row=><tr key={row.id} className="hover:bg-[#F5FBFE]"><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(row.recordedAt)}</td><td className="whitespace-nowrap px-4 py-3 capitalize text-slate-600">{row.dataset}</td><td className="px-4 py-3 font-medium text-[#102B3D]">{row.parameter}</td><td className="px-4 py-3 text-slate-600">{row.station}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-[#102B3D]">{row.value.toLocaleString("en-IN",{maximumFractionDigits:3})}</td><td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.unit}</td><td className="px-4 py-3 text-xs text-slate-500">{row.source}</td></tr>)}
          {filteredRecords.length===0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No readings match the selected filters.</td></tr>}
        </tbody></table></div>{filteredRecords.length>500&&<p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Preview limited to 500 rows. Exports include all filtered records.</p>}
      </section>
      <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center"><p>SMART DAM           · Tawa Dam Reports · Chetas Control Systems</p><p>          </p></div>
    </div>
  );
}
