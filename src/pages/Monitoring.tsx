// SMART DAM 360 - Live Monitoring page (single file).
// Everything on this page is SIMULATED. Replace the data engine / hook in sections 1-2
// with real API data later; the UI sections (3-5) can stay as they are.
// Needs: react, echarts, echarts-for-react, lucide-react, and your PageHeader component.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownRight, ArrowUpRight, Clock, CloudRain, Download, Droplets, Gauge, GitCompare, ImageDown,
  Maximize2, Minimize2, Minus, Pause, Play, Radio, TrendingDown, TrendingUp, Waves,
} from 'lucide-react'

import PageHeader from '../components/common/PageHeader'

// ==========================================================================
// 1. SIMULATED DATA ENGINE
// ==========================================================================
// ---------------------------------------------------------------------------
// SIMULATED dam data engine. Everything here is synthetic and illustrative.
// It produces 60 days of 5-minute history (storms, diurnal inflow, gate
// controller, canal release) plus a live tick that keeps the newest point moving.
// Replace with real API data later; keep the History / Live shapes the same.
// ---------------------------------------------------------------------------

type DamId = 'tawa' | 'bansagar'

interface DamProfile {
  id: DamId; name: string; location: string; river: string; type: string
  mddl: number; frl: number; capMcm: number          // PLACEHOLDERS: verify
  baseLevel: number; baseFill: number                  // starting point of the demo
  gateCount: number; gateEq: number; canal: number     // m3/s
  areaM2: number
}

const PROFILES: Record<DamId, DamProfile> = {
  tawa: { id: 'tawa', name: 'Tawa Dam', location: 'Narmadapuram, Madhya Pradesh', river: 'Tawa River', type: 'Earth-fill Dam',
    mddl: 336, frl: 358.75, capMcm: 1944, baseLevel: 354.19, baseFill: 87.75, gateCount: 13, gateEq: 185.4, canal: 140, areaM2: 1.8e7 },
  bansagar: { id: 'bansagar', name: 'Bansagar Dam', location: 'Shahdol, Madhya Pradesh', river: 'Son River', type: 'Composite Dam',
    mddl: 327, frl: 341.64, capMcm: 5430, baseLevel: 340.82, baseFill: 86.61, gateCount: 18, gateEq: 245.8, canal: 190, areaM2: 3.2e7 },
}

const PALETTE = {
  level: '#0284C7', storage: '#2563EB', inflow: '#059669', outflow: '#D97706', canal: '#EA580C',
  rain: '#7C3AED', rainCum: '#DB2777', pos: '#059669', neg: '#D97706',
  yellow: '#EAB308', orange: '#EA580C', red: '#DC2626', slate: '#64748B',
}

const STEP_MS = 5 * 60 * 1000
const STEP_S = 300
const DAYS = 60
const M3S_TO_CUSECS = 35.3147
const M_TO_FT = 3.28084

interface History {
  t: number[]; level: number[]; storage: number[]; inflow: number[]
  gateFlow: number[]; canal: number[]; outflow: number[]; rain: number[]   // rain = mm per step
  gates: number[][]                                                        // [gate][step] opening %
  qmax: number; k: number
}

interface Live {
  level: number; storage: number; inflow: number; gateFlow: number; canal: number; outflow: number
  rain24: number; rainNow: number; gates: number[]; at: number
  base: { inflow: number; level: number }
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const fillFrac = (p: DamProfile, level: number) => clamp((level - p.mddl) / (p.frl - p.mddl), 0, 1.2)
const storageAt = (p: DamProfile, k: number, level: number) => p.capMcm * Math.pow(fillFrac(p, level), k)

// Placeholder warning zones: metres below FRL. NOT approved limits.
const ZONE_GAPS = { yellow: 0.8, orange: 0.4, red: 0.15 }
const zoneBands = (p: DamProfile) => [
  { from: p.frl - ZONE_GAPS.yellow, to: p.frl - ZONE_GAPS.orange, color: PALETTE.yellow, label: 'Yellow (illustrative)' },
  { from: p.frl - ZONE_GAPS.orange, to: p.frl - ZONE_GAPS.red, color: PALETTE.orange, label: 'Orange (illustrative)' },
  { from: p.frl - ZONE_GAPS.red, to: p.frl + 0.3, color: PALETTE.red, label: 'Red (illustrative)' },
]
function zoneOfLevel(p: DamProfile, level: number): 'normal' | 'yellow' | 'orange' | 'red' {
  const g = p.frl - level
  return g <= ZONE_GAPS.red ? 'red' : g <= ZONE_GAPS.orange ? 'orange' : g <= ZONE_GAPS.yellow ? 'yellow' : 'normal'
}

function generateHistory(p: DamProfile, now: number): History {
  const N = DAYS * 288
  const rnd = mulberry32(p.id === 'tawa' ? 7 : 19)
  const rainMmH = new Array<number>(N).fill(0)
  const storms: { at: number; dur: number; peak: number }[] = []
  for (let s = 0; s < 16; s++) storms.push({ at: Math.floor(rnd() * (N - 400)), dur: 30 + Math.floor(rnd() * 120), peak: 3 + rnd() * 18 })
  storms.push({ at: N - 70, dur: 55, peak: p.id === 'tawa' ? 5 : 6.5 })        // a mild storm just before "now"
  for (const s of storms) for (let j = 0; j < s.dur && s.at + j < N; j++) {
    const x = Math.sin((Math.PI * j) / s.dur); rainMmH[s.at + j] += s.peak * x * x * (0.7 + 0.6 * rnd())
  }

  const n = p.gateCount
  const f0 = (p.baseLevel - p.mddl) / (p.frl - p.mddl)
  const th = (g: number) => f0 - 0.05 + (g / n) * 0.18
  const target = (f: number, g: number) => clamp((f - th(g)) * 350, 0, 100)
  let sum0 = 0
  for (let g = 0; g < n; g++) sum0 += target(f0, g)
  const qmax = p.gateEq / (sum0 / 100)
  const k = Math.log(p.baseFill / 100) / Math.log(f0)

  const h: History = { t: [], level: [], storage: [], inflow: [], gateFlow: [], canal: [], outflow: [], rain: [], gates: Array.from({ length: n }, () => []), qmax, k }
  let level = p.baseLevel - 0.3, r = 0
  const open = Array.from({ length: n }, (_, g) => target((level - p.mddl) / (p.frl - p.mddl), g))

  for (let i = 0; i < N; i++) {
    const ts = now - (N - 1 - i) * STEP_MS
    const d = new Date(ts), hour = d.getHours() + d.getMinutes() / 60
    r = r * 0.987 + (rainMmH[i] / 12) * 3
    const inflow = (p.gateEq + p.canal) * (1 + 0.08 * Math.sin((2 * Math.PI * (hour - 6)) / 24)) + r + (rnd() - 0.5) * 4
    const f = (level - p.mddl) / (p.frl - p.mddl)
    let gq = 0
    for (let g = 0; g < n; g++) {
      open[g] += clamp(target(f, g) - open[g], -3, 3)
      gq += (open[g] / 100) * qmax
      h.gates[g].push(+open[g].toFixed(1))
    }
    const canal = p.canal * (1 + 0.04 * Math.sin((2 * Math.PI * (hour - 9)) / 24)) + (rnd() - 0.5)
    h.t.push(ts); h.level.push(level); h.inflow.push(inflow); h.gateFlow.push(gq); h.canal.push(canal)
    h.outflow.push(gq + canal); h.rain.push(rainMmH[i] / 12)
    level = clamp(level + ((inflow - gq - canal) * STEP_S) / p.areaM2, p.mddl + 2, p.frl + 0.2)
  }
  const delta = p.baseLevel - h.level[N - 1]
  for (let i = 0; i < N; i++) { h.level[i] += delta * (i / (N - 1)); h.storage.push(storageAt(p, k, h.level[i])) }
  return h
}

function initLive(h: History): Live  {
  const i = h.t.length - 1
  return {
    level: h.level[i], storage: h.storage[i], inflow: h.inflow[i], gateFlow: h.gateFlow[i], canal: h.canal[i], outflow: h.outflow[i],
    rain24: h.rain.slice(-288).reduce((a, b) => a + b, 0), rainNow: h.rain[i] * 12,
    gates: h.gates.map((g) => g[i]), at: Date.now(), base: { inflow: h.inflow[i], level: h.level[i] },
  }
}

type Spark = Record<'level' | 'storage' | 'fill' | 'inflow' | 'outflow' | 'rain', number[]>
const emptySpark = (): Spark => ({ level: [], storage: [], fill: [], inflow: [], outflow: [], rain: [] })

function stepLive(p: DamProfile, h: History, L: Live, sp: Spark, now = Date.now()) {
  const j = (s: number) => (Math.random() - 0.5) * s
  L.level = clamp(L.level + j(0.004) + (L.inflow > L.outflow ? 0.0004 : -0.0002), p.mddl + 2, p.frl + 0.2)
  L.inflow = Math.max(0, L.inflow + j(3.2) + (L.base.inflow - L.inflow) * 0.04)
  L.gates = L.gates.map((o) => (o > 0.5 ? clamp(o + j(0.5), 0, 100) : o))
  L.gateFlow = L.gates.reduce((a, o) => a + (o / 100) * h.qmax, 0)
  L.canal = Math.max(0, L.canal + j(0.6))
  L.outflow = L.gateFlow + L.canal
  L.rainNow = Math.max(0, L.rainNow + j(0.3) - 0.02)
  L.storage = storageAt(p, h.k, L.level)
  L.at = now

  const n = h.t.length - 1
  if (now - h.t[n] >= STEP_MS) {                                   // roll a new 5-minute bucket
    h.t.push(now); h.level.push(L.level); h.storage.push(L.storage); h.inflow.push(L.inflow); h.gateFlow.push(L.gateFlow)
    h.canal.push(L.canal); h.outflow.push(L.outflow); h.rain.push(L.rainNow / 12); h.gates.forEach((g, gi) => g.push(L.gates[gi]))
    ;[h.t, h.level, h.storage, h.inflow, h.gateFlow, h.canal, h.outflow, h.rain, ...h.gates].forEach((a) => a.shift())
  } else {
    const m = h.t.length - 1
    h.level[m] = L.level; h.storage[m] = L.storage; h.inflow[m] = L.inflow; h.gateFlow[m] = L.gateFlow
    h.canal[m] = L.canal; h.outflow[m] = L.outflow; h.gates.forEach((g, gi) => (g[m] = +L.gates[gi].toFixed(1)))
  }
  const push = (a: number[], v: number) => { a.push(v); if (a.length > 48) a.shift() }
  push(sp.level, L.level); push(sp.storage, L.storage); push(sp.fill, (L.storage / p.capMcm) * 100)
  push(sp.inflow, L.inflow); push(sp.outflow, L.outflow); push(sp.rain, L.rainNow)
}

// ---------- slicing, bucketing, stats ----------
function firstIndex(t: number[], from: number) {
  let lo = 0, hi = t.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (t[mid] < from) lo = mid + 1; else hi = mid }
  return lo
}

function bucket(t: number[], v: number[], i0: number, i1: number, stride: number, mode: 'avg' | 'sum', shift = 0): [number, number][] {
  const out: [number, number][] = []
  for (let i = i0; i < i1; i += stride) {
    const end = Math.min(i + stride, i1); let s = 0
    for (let q = i; q < end; q++) s += v[q]
    out.push([t[end - 1] + shift, +(mode === 'avg' ? s / (end - i) : s).toFixed(3)])
  }
  return out
}

interface Stats { cur: number; min: number; max: number; avg: number; delta: number; pct: number; rateH: number; total: number }
function stats(d: [number, number][]): Stats {
  if (!d.length) return { cur: 0, min: 0, max: 0, avg: 0, delta: 0, pct: 0, rateH: 0, total: 0 }
  const vals = d.map((p) => p[1]); const total = vals.reduce((a, b) => a + b, 0)
  const cur = vals[vals.length - 1], first = vals[0]
  const hours = Math.max((d[d.length - 1][0] - d[0][0]) / 3.6e6, 1e-6)
  return { cur, min: Math.min(...vals), max: Math.max(...vals), avg: total / vals.length, delta: cur - first, pct: first ? ((cur - first) / Math.abs(first)) * 100 : 0, rateH: (cur - first) / hours, total }
}

interface LogEvent { t: number; kind: 'gate' | 'rain' | 'zone'; text: string }

// The event log uses the current calendar day in India Standard Time (IST).
// India does not observe daylight saving time, so midnight IST is UTC midnight - 5h 30m.
function startOfTodayIndia(now: number): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(now))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '0'
  const year = Number(part('year'))
  const month = Number(part('month'))
  const day = Number(part('day'))
  return Date.UTC(year, month - 1, day) - (5 * 60 + 30) * 60 * 1000
}

function formatEventTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatTodayIndia(now: number): string {
  return new Date(now).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function buildEvents(p: DamProfile, h: History, now: number): LogEvent[] {
  const ev: LogEvent[] = []
  const end = h.t.length
  const start = Math.max(0, firstIndex(h.t, startOfTodayIndia(now)))
  const S = 6 // evaluate event transitions every 30 minutes
  if (start >= end - 1) return ev

  // Start from the first complete 30-minute window within today. This prevents
  // yesterday's gate/rain/level state from leaking into today's event log.
  let wasRain = false
  let lastZone = zoneOfLevel(p, h.level[start])
  for (let i = Math.min(start + S, end - 1); i < end; i += S) {
    h.gates.forEach((g, gi) => {
      const a = g[i - S] ?? g[i]
      const b = g[i]
      if (a < 1 && b >= 3) ev.push({ t: h.t[i], kind: 'gate', text: `Gate ${String(gi + 1).padStart(2, '0')} opened to ${b.toFixed(0)}%` })
      if (a >= 3 && b < 1) ev.push({ t: h.t[i], kind: 'gate', text: `Gate ${String(gi + 1).padStart(2, '0')} closed` })
    })

    let rs = 0
    for (let q = i - S; q < i; q++) rs += h.rain[q] ?? 0
    if (!wasRain && rs > 0.3) {
      ev.push({ t: h.t[i], kind: 'rain', text: `Rainfall started (${(rs * 2).toFixed(1)} mm/h)` })
      wasRain = true
    }
    if (wasRain && rs < 0.05) {
      ev.push({ t: h.t[i], kind: 'rain', text: 'Rainfall stopped' })
      wasRain = false
    }

    const z = zoneOfLevel(p, h.level[i])
    if (z !== lastZone) {
      ev.push({ t: h.t[i], kind: 'zone', text: `Level entered ${z} band (illustrative)` })
      lastZone = z
    }
  }
  return ev.sort((a, b) => b.t - a.t).slice(0, 12)
}

// ==========================================================================
// 2. LIVE FEED HOOK
// ==========================================================================
// Drives the simulated feed. Swap this hook for a real telemetry hook later.
function useLiveDam(id: DamId, intervalMs: number, paused: boolean) {
  const profile = PROFILES[id]
  const hist = useMemo(() => generateHistory(profile, Date.now()), [profile])
const live = useRef<Live>(initLive(hist))
  const spark = useRef<Spark>(emptySpark())
  const [tick, setTick] = useState(0)

  useEffect(() => {
  live.current = initLive(hist)
    spark.current = emptySpark()
    for (let i = 0; i < 30; i++) stepLive(profile, hist, live.current, spark.current, hist.t[hist.t.length - 1])   // pre-fill sparklines
    setTick((n) => n + 1)
  }, [profile, hist])

  useEffect(() => {
    if (paused || intervalMs <= 0) return
    const timer = setInterval(() => { stepLive(profile, hist, live.current, spark.current); setTick((n) => n + 1) }, intervalMs)
    return () => clearInterval(timer)
  }, [profile, hist, intervalMs, paused])

  return { profile, hist, live: live.current, spark: spark.current, tick }
}

// ==========================================================================
// 3. KPI CARD
// ==========================================================================
interface KpiProps {
  label: string; icon: LucideIcon; value: string; unit: string; color: string
  spark: number[]; deltaText: string; deltaDir: 'up' | 'down' | 'flat'; sub: string; deltaSuffix?: string
  chip?: { text: string; tone: 'ok' | 'watch' | 'alert' }
}

const chipTone = { ok: 'bg-emerald-50 text-emerald-700 border-emerald-200', watch: 'bg-amber-50 text-amber-700 border-amber-200', alert: 'bg-rose-50 text-rose-700 border-rose-200' }

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const id = useId()
  if (data.length < 2) return <div className="h-10" />
  const w = 140, h = 40, mn = Math.min(...data), sp = Math.max(...data) - mn || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 4 - ((v - mn) / sp) * (h - 8)])
  const line = 'M' + pts.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L')
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  )
}

function KpiCard(k: KpiProps) {
  const [flash, setFlash] = useState(false)
  const prev = useRef(k.value)
  useEffect(() => {
    if (prev.current === k.value) return
    prev.current = k.value; setFlash(true)
    const t = setTimeout(() => setFlash(false), 450); return () => clearTimeout(t)
  }, [k.value])
  const Dir = k.deltaDir === 'up' ? ArrowUpRight : k.deltaDir === 'down' ? ArrowDownRight : Minus
  const dirTone = k.deltaDir === 'up' ? 'text-emerald-600' : k.deltaDir === 'down' ? 'text-amber-600' : 'text-slate-600'
  const Icon = k.icon
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: k.color }} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-lg p-1.5" style={{ background: k.color + '22', color: k.color }}><Icon size={16} /></span>
          <span className="text-xs font-medium text-slate-600">{k.label}</span>
        </div>
        {k.chip && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${chipTone[k.chip.tone]}`}>{k.chip.text}</span>}
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums transition-colors duration-300" style={{ color: flash ? k.color : '#102B3D' }}>{k.value}</span>
        <span className="text-sm text-slate-500">{k.unit}</span>
      </p>
      <p className={`mt-1 inline-flex items-center gap-1 text-xs ${dirTone}`}><Dir size={13} />{k.deltaText}<span className="text-slate-500"> {k.deltaSuffix ?? 'vs 1 h ago'}</span></p>
      <div className="mt-2"><Sparkline data={k.spark} color={k.color} /></div>
      <p className="mt-1 text-[11px] text-slate-500">{k.sub}</p>
    </div>
  )
}

// ==========================================================================
// 4. TREND PANEL
// ==========================================================================
interface TrendSeries {
  key: string; name: string; color: string
  data: [number, number][]
  compare?: [number, number][]          // previous period, already shifted onto the current time axis
  kind?: 'line' | 'bar'
  axis?: 0 | 1
  area?: boolean
  colorFn?: (v: number) => string       // per-bar colouring (e.g. positive / negative)
}
interface Band { from: number; to: number; color: string; label: string }
interface RefLine { value: number; label: string; color: string }
type ChartType = 'line' | 'area' | 'bar' | 'step'

interface Props {
  title: string; subtitle?: string; unit: string; unit2?: string
  series: TrendSeries[]; bands?: Band[]; refLines?: RefLine[]
  resolution: string; height?: number; decimals?: number
  allowTypes?: boolean; defaultType?: ChartType; variant?: 'default' | 'sum'
  accent?: string
}

const fmt = (v: number, d: number) => v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d })

function Trend({ v, d, unit }: { v: number; d: number; unit: string }) {
  const Icon = Math.abs(v) < 10 ** -d / 2 ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight
  const tone = Math.abs(v) < 10 ** -d / 2 ? 'text-slate-600' : v > 0 ? 'text-emerald-600' : 'text-amber-600'
  return <span className={`inline-flex items-center gap-0.5 ${tone}`}><Icon size={13} />{v > 0 ? '+' : ''}{fmt(v, d)} {unit}</span>
}

function TrendPanel(p: Props) {
  const d = p.decimals ?? 2
  const [type, setType] = useState<ChartType>(p.defaultType ?? 'area')
  const [compare, setCompare] = useState(false)
  const [marks, setMarks] = useState(true)
  const [smooth, setSmooth] = useState(true)
  const [full, setFull] = useState(false)
  const chart = useRef<ReactECharts>(null)
  const firstSeries = p.series[0]
  const accent = p.accent ?? firstSeries?.color ?? '#0284C7'
  const hasCompare = p.series.some((s) => s.compare?.length)

  useEffect(() => {
    if (!full) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false)
    addEventListener('keydown', esc); return () => removeEventListener('keydown', esc)
  }, [full])

  const st = useMemo(() => stats(firstSeries?.data ?? []), [firstSeries])

  const option = useMemo<EChartsOption>(() => {
    const main = firstSeries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const series: any[] = []
    p.series.forEach((s, idx) => {
      const isBar = s.kind === 'bar' || type === 'bar'
      const grad = new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: s.color + '66' }, { offset: 1, color: s.color + '00' }])
      series.push({
        name: s.name, type: isBar ? 'bar' : 'line', yAxisIndex: s.axis ?? 0, data: s.data, z: 3,
        smooth: smooth && type !== 'step', step: type === 'step' && !isBar ? 'end' : undefined,
        showSymbol: false, symbolSize: 6, lineStyle: { width: 2.4, color: s.color },
        itemStyle: s.colorFn ? { color: (q: { value: [number, number] }) => s.colorFn!(q.value[1]), borderRadius: [2, 2, 0, 0] } : { color: s.color, borderRadius: [2, 2, 0, 0] },
        areaStyle: !isBar && (type === 'area' || s.area) ? { color: grad } : undefined,
        barMaxWidth: 14, emphasis: { focus: 'series' },
        markPoint: idx === 0 && marks && !isBar ? {
          symbolSize: 46, itemStyle: { color: s.color }, label: { color: '#FFFFFF', fontSize: 10, formatter: (q: { value: number }) => fmt(q.value, d) },
          data: [{ type: 'max', name: 'Max' }, { type: 'min', name: 'Min' }],
        } : undefined,
        markLine: idx === 0 ? {
          symbol: 'none', silent: true, animation: false,
          data: [
            ...(marks && !isBar ? [{ type: 'average', name: 'Avg', lineStyle: { color: '#64748b', type: 'dashed' }, label: { formatter: 'avg {c}', color: '#64748B', fontSize: 10 } }] : []),
            ...(p.refLines ?? []).map((r) => ({ yAxis: r.value, lineStyle: { color: r.color, type: 'dashed', width: 1.2 }, label: { formatter: r.label, color: r.color, fontSize: 10, position: 'insideEndTop' } })),
          ],
        } : undefined,
        markArea: idx === 0 && p.bands?.length ? {
          silent: true, data: p.bands.map((b) => [{ yAxis: b.from, itemStyle: { color: b.color + '1f' }, name: b.label }, { yAxis: b.to }]),
        } : undefined,
      })
      if (compare && s.compare?.length)
        series.push({ name: `${s.name} (previous period)`, type: 'line', yAxisIndex: s.axis ?? 0, data: s.compare, showSymbol: false, silent: true, z: 2, smooth,
          lineStyle: { width: 1.6, type: 'dashed', color: s.color, opacity: 0.55 }, itemStyle: { color: s.color } })
    })
    const last = main?.data?.[main.data.length - 1]
    if (last && main) series.push({ name: '__live', type: 'effectScatter', data: [last], yAxisIndex: main.axis ?? 0, symbolSize: 9, z: 10,
      rippleEffect: { scale: 3.2, brushType: 'stroke' }, itemStyle: { color: main.color }, tooltip: { show: false } })

    return {
      backgroundColor: 'transparent', animationDuration: 500, animationDurationUpdate: 400,
      grid: { top: 40, left: 6, right: p.unit2 ? 6 : 18, bottom: full ? 74 : 64, containLabel: true },
      legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 5, icon: 'roundRect', textStyle: { color: '#64748B', fontSize: 11 },
        data: series.filter((s) => s.name !== '__live').map((s) => s.name) },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#DCE7EE', textStyle: { color: '#334155', fontSize: 12 },
        axisPointer: { type: 'cross', lineStyle: { color: '#64748B' }, label: { backgroundColor: '#EAF7FD', color: '#102B3D' } },
        valueFormatter: (v) => (typeof v === 'number' ? fmt(v, d) : String(v)) },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: { type: 'time', axisLine: { lineStyle: { color: '#CBD5E1' } }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { show: false } },
      yAxis: [
        { type: 'value', scale: true, name: p.unit, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } } },
        ...(p.unit2 ? [{ type: 'value' as const, scale: true, name: p.unit2, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { show: false } }] : []),
      ],
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 10, borderColor: '#DCE7EE', backgroundColor: '#F1F5F9', fillerColor: accent + '26', handleSize: 12, textStyle: { color: '#64748b' } }],
      series,
    }
  }, [p.series, p.bands, p.refLines, p.unit, p.unit2, type, compare, marks, smooth, full, d, accent])

  const exportCsv = () => {
    const rows = [
      'timestamp,' +
        p.series
          .map((s) => `"${s.name} (${s.axis === 1 ? p.unit2 : p.unit})"`)
          .join(','),
    ];

    (firstSeries?.data ?? []).forEach((pt, i) => {
      rows.push(
        new Date(pt[0]).toISOString() +
          ',' +
          p.series.map((s) => s.data[i]?.[1] ?? '').join(','),
      );
    });
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    a.download = `${p.title.toLowerCase().replace(/\W+/g, '-')}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }
  const exportPng = () => {
    const url = chart.current?.getEchartsInstance().getDataURL({ pixelRatio: 2, backgroundColor: '#FFFFFF' })
    if (!url) return
    const a = document.createElement('a'); a.href = url; a.download = `${p.title.toLowerCase().replace(/\W+/g, '-')}.png`; a.click()
  }

  const btn = (on: boolean) => `rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${on ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
  const iconBtn = 'rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900'
  const cells = p.variant === 'sum'
    ? [['Total', fmt(st.total, d), accent], ['Peak', fmt(st.max, d), '#f472b6'], ['Average', fmt(st.avg, d), '#94a3b8'], ['Active %', fmt(((firstSeries?.data ?? []).filter((x) => x[1] > 0).length / Math.max(1, firstSeries?.data.length ?? 0)) * 100, 0), '#a78bfa']]
    : [['Current', fmt(st.cur, d), accent], ['Min', fmt(st.min, d), '#38bdf8'], ['Max', fmt(st.max, d), '#fbbf24'], ['Average', fmt(st.avg, d), '#94a3b8']]

  return (
    <>
      {full && <div className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-sm" onClick={() => setFull(false)} />}
      <div className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 ${full ? 'fixed inset-4 z-50' : ''}`} style={{ borderTopColor: accent + '99', borderTopWidth: 2 }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">{p.title}</h3>
            <p className="mt-0.5 text-xs text-slate-600">{p.subtitle} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{p.resolution}</span></p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {p.allowTypes && (['line', 'area', 'step', 'bar'] as ChartType[]).map((t) => <button key={t} className={btn(type === t)} onClick={() => setType(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
            {p.allowTypes && <span className="mx-0.5 h-4 w-px bg-slate-100" />}
            <button className={btn(smooth)} onClick={() => setSmooth(!smooth)}>Smooth</button>
            <button className={btn(marks)} onClick={() => setMarks(!marks)}>Min/Max</button>
            {hasCompare && <button className={btn(compare)} onClick={() => setCompare(!compare)}><GitCompare size={12} className="mr-1 inline" />Compare</button>}
            <span className="mx-0.5 h-4 w-px bg-slate-100" />
            <button className={iconBtn} title="Download CSV" aria-label="Download CSV" onClick={exportCsv}><Download size={14} /></button>
            <button className={iconBtn} title="Save image" aria-label="Save image" onClick={exportPng}><ImageDown size={14} /></button>
            <button className={iconBtn} title={full ? 'Exit full screen (Esc)' : 'Full screen'} aria-label="Toggle full screen" onClick={() => setFull(!full)}>{full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {cells.map(([l, v, c]) => (
            <div key={l} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{l}</p>
              <p className="mt-0.5 text-sm font-semibold" style={{ color: c }}>{v} <span className="text-[10px] font-normal text-slate-500">{p.unit}</span></p>
            </div>
          ))}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Change · rate</p>
            <p className="mt-0.5 text-sm font-semibold"><Trend v={st.delta} d={d} unit={p.unit} /></p>
            <p className="text-[10px] text-slate-500">{fmt(st.rateH, d)} {p.unit}/h</p>
          </div>
        </div>

        <div className="mt-2 min-h-0 flex-1">
          <ReactECharts
            ref={chart}
            option={option}
            notMerge={true}
            lazyUpdate={false}
            style={{ height: full ? '100%' : p.height ?? 300, width: '100%' }}
          />
        </div>
      </div>
    </>
  )
}

// ==========================================================================
// 5. PAGE
// ==========================================================================
const RANGES = { '1h': { ms: 36e5, label: '1 h' }, '6h': { ms: 6 * 36e5, label: '6 h' }, '24h': { ms: 24 * 36e5, label: '24 h' }, '7d': { ms: 7 * 864e5, label: '7 days' }, '30d': { ms: 30 * 864e5, label: '30 days' } } as const
type RangeKey = keyof typeof RANGES

const card = 'rounded-2xl border border-slate-200 bg-white'
const f1 = (v: number, d = 1) => v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d })

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; t: string }[]; label: string }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {options.map((o) => (
          <button key={o.v} onClick={() => onChange(o.v)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${value === o.v ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}>{o.t}</button>
        ))}
      </div>
    </div>
  )
}

function Monitoring() {
  const [damId, setDamId] = useState<DamId>('tawa')
  const [range, setRange] = useState<RangeKey>('24h')
  const [flowUnit, setFlowUnit] = useState<'m3s' | 'cusecs'>('m3s')
  const [levelUnit, setLevelUnit] = useState<'m' | 'ft'>('m')
  const [intervalMs, setIntervalMs] = useState(2000)
  const [paused, setPaused] = useState(false)
  const [clock, setClock] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(t) }, [])

  const { profile, hist, live, spark, tick } = useLiveDam(damId, intervalMs, paused)
  const fq = (v: number) => (flowUnit === 'cusecs' ? v * M3S_TO_CUSECS : v)
  const lq = (v: number) => (levelUnit === 'ft' ? v * M_TO_FT : v)
  const flowLbl = flowUnit === 'cusecs' ? 'cusecs' : 'm³/s'
  const lvlLbl = levelUnit
  const flowD = flowUnit === 'cusecs' ? 0 : 1

  // ---------- derived series for the chosen range ----------
  const v = useMemo(() => {
    const now = hist.t[hist.t.length - 1], W = RANGES[range].ms
    const i0 = firstIndex(hist.t, now - W), i1 = hist.t.length
    const stride = Math.max(1, Math.ceil((i1 - i0) / 240))
    const mins = stride * (STEP_MS / 6e4)
    const resolution = `${mins < 60 ? mins + ' min' : mins < 1440 ? f1(mins / 60, 0) + ' h' : f1(mins / 1440, 1) + ' d'} resolution`
    const canCompare = hist.t[0] <= now - 2 * W
    const c0 = firstIndex(hist.t, now - 2 * W)
    const mk = (arr: number[], conv: (x: number) => number, mode: 'avg' | 'sum' = 'avg') => ({
      data: bucket(hist.t, arr, i0, i1, stride, mode).map(([t, x]) => [t, conv(x)] as [number, number]),
      compare: canCompare && mode === 'avg' ? bucket(hist.t, arr, c0, i0, stride, mode, W).map(([t, x]) => [t, conv(x)] as [number, number]) : undefined,
    })
    const id = (x: number) => x
    const net = hist.inflow.map((x, i) => x - hist.outflow[i])
    const netB = bucket(hist.t, net, i0, i1, stride, 'avg')
    let cum = 0
    const netCum = netB.map(([t, x]) => { cum += (x * stride * 300) / 1e6; return [t, +cum.toFixed(3)] as [number, number] })
    const rainB = bucket(hist.t, hist.rain, i0, i1, stride, 'sum')
    let rc = 0
    const rainCum = rainB.map(([t, x]) => { rc += x; return [t, +rc.toFixed(2)] as [number, number] })

    // gate heat-map
    const hs = Math.max(1, Math.ceil((i1 - i0) / 48))
    const cols = Math.ceil((i1 - i0) / hs)
    const xs: string[] = []
    const heat: [number, number, number][] = []
    for (let c = 0; c < cols; c++) {
      const a = i0 + c * hs, b = Math.min(a + hs, i1)
      const ts = new Date(hist.t[b - 1])
      xs.push(W > 864e5 ? ts.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }))
      hist.gates.forEach((g, gi) => { let s = 0; for (let q = a; q < b; q++) s += g[q]; heat.push([c, gi, +(s / (b - a)).toFixed(1)]) })
    }
    return {
      resolution, i0, now,
      level: mk(hist.level, lq), storage: mk(hist.storage, id), inflow: mk(hist.inflow, fq), outflow: mk(hist.outflow, fq),
      gateFlow: mk(hist.gateFlow, fq), canal: mk(hist.canal, fq),
      netB: netB.map(([t, x]) => [t, fq(x)] as [number, number]), netCum, rainB, rainCum, xs, heat,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, damId, range, flowUnit, levelUnit])

  const last = hist.t.length - 1, h1 = Math.max(0, last - 12)
  const bands = useMemo(() => zoneBands(profile).map((b) => ({ ...b, from: lq(b.from), to: lq(b.to) })), [profile, levelUnit]) // eslint-disable-line react-hooks/exhaustive-deps
  const frlLine = [{ value: lq(profile.frl), label: `FRL ${f1(lq(profile.frl), 2)} ${lvlLbl}`, color: PALETTE.red }]
  const zone = zoneOfLevel(profile, live.level)
  const chip = zone === 'normal' ? { text: 'Normal', tone: 'ok' as const } : zone === 'yellow' ? { text: 'Watch (illustrative)', tone: 'watch' as const } : { text: `${zone[0].toUpperCase() + zone.slice(1)} band (illustrative)`, tone: 'alert' as const }
  const dir = (x: number) => (Math.abs(x) < 1e-3 ? 'flat' : x > 0 ? 'up' : 'down') as 'up' | 'down' | 'flat'
  const sgn = (x: number) => (x > 0 ? '+' : '')
  const fill = (live.storage / profile.capMcm) * 100
  const dLevel = lq(live.level) - lq(hist.level[h1]), dStor = live.storage - hist.storage[h1]
  const dIn = fq(live.inflow) - fq(hist.inflow[h1]), dOut = fq(live.outflow) - fq(hist.outflow[h1])
  const rain1 = hist.rain.slice(-12).reduce((a, b) => a + b, 0), rainPrev = hist.rain.slice(-24, -12).reduce((a, b) => a + b, 0)
  const ago = Math.max(0, Math.round((clock - live.at) / 1000))
  const running = !paused && intervalMs > 0
  const events = useMemo(() => buildEvents(profile, hist, clock), [profile, hist, Math.floor(clock / 60000), Math.floor(tick / 30)]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- series definitions ----------
  const s = (key: string, name: string, color: string, src: { data: [number, number][]; compare?: [number, number][] }, extra: Partial<TrendSeries> = {}): TrendSeries => ({ key, name, color, ...src, ...extra })

  const gaugeOption: EChartsOption = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge', startAngle: 215, endAngle: -35, min: 0, max: 100, radius: '96%', center: ['50%', '58%'],
      axisLine: { lineStyle: { width: 16, color: [[0.6, '#38bdf8'], [0.85, '#14b8a6'], [0.95, '#fbbf24'], [1, '#f87171']] } },
      pointer: { width: 5, length: '58%', itemStyle: { color: '#CBD5E1' } }, anchor: { show: true, size: 12, itemStyle: { color: '#FFFFFF', borderColor: '#64748B', borderWidth: 2 } },
      axisTick: { show: false }, splitLine: { length: 8, lineStyle: { color: '#CBD5E1', width: 2 } },
      axisLabel: { color: '#64748b', fontSize: 10, distance: 22 },
      detail: { valueAnimation: true, formatter: '{value}%', color: '#102B3D', fontSize: 30, fontWeight: 600, offsetCenter: [0, '72%'] },
      title: { show: false }, data: [{ value: +fill.toFixed(1) }],
    }],
  }

  const curveOption = useMemo<EChartsOption>(() => {
    const curve: [number, number][] = []
    for (let i = 0; i <= 60; i++) { const l = profile.mddl + ((profile.frl - profile.mddl) * i) / 60; curve.push([+lq(l).toFixed(2), +storageAt(profile, hist.k, l).toFixed(1)]) }
    const trace: [number, number][] = []
    for (let i = 0; i < hist.t.length; i += 24) trace.push([+lq(hist.level[i]).toFixed(2), +hist.storage[i].toFixed(1)])
    return {
      backgroundColor: 'transparent', grid: { top: 24, left: 6, right: 20, bottom: 30, containLabel: true },
      tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#DCE7EE', textStyle: { color: '#334155', fontSize: 12 } },
      xAxis: { type: 'value', scale: true, name: lvlLbl, nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } } },
      yAxis: { type: 'value', name: 'MCM', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } } },
      series: [
        { name: 'Elevation-capacity (illustrative)', type: 'line', data: curve, showSymbol: false, smooth: true, lineStyle: { width: 2.5, color: PALETTE.storage }, areaStyle: { color: PALETTE.storage + '1a' } },
        { name: 'Last 60 days', type: 'scatter', data: trace, symbolSize: 3, itemStyle: { color: PALETTE.rain, opacity: 0.35 } },
        { name: 'Now', type: 'effectScatter', data: [[+lq(live.level).toFixed(2), +live.storage.toFixed(1)]], symbolSize: 11, rippleEffect: { scale: 3.5 }, itemStyle: { color: PALETTE.level } },
      ],
    }
  }, [profile, hist, tick, levelUnit]) // eslint-disable-line react-hooks/exhaustive-deps

  const heatOption: EChartsOption = {
    backgroundColor: 'transparent', animation: false,
    grid: { top: 8, left: 6, right: 12, bottom: 54, containLabel: true },
    tooltip: { position: 'top', backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#DCE7EE', textStyle: { color: '#334155', fontSize: 12 },
      formatter: (q: unknown) => { const d = (q as { value: [number, number, number] }).value; return `Gate ${String(d[1] + 1).padStart(2, '0')} · ${v.xs[d[0]]}<br/><b>${d[2]}%</b> open` } },
    xAxis: { type: 'category', data: v.xs, axisLabel: { color: '#64748b', fontSize: 10, interval: Math.ceil(v.xs.length / 8) }, axisLine: { lineStyle: { color: '#CBD5E1' } } },
    yAxis: { type: 'category', inverse: true, data: hist.gates.map((_, i) => `G${String(i + 1).padStart(2, '0')}`), axisLabel: { color: '#64748B', fontSize: 10 }, axisLine: { show: false } },
    visualMap: { min: 0, max: 100, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 140, calculable: false, textStyle: { color: '#64748b', fontSize: 10 },
      inRange: { color: ['#E0F2FE', '#7DD3FC', '#38BDF8', '#0284C7', '#075985'] } },
    series: [{ type: 'heatmap', data: v.heat, itemStyle: { borderColor: '#FFFFFF', borderWidth: 1, borderRadius: 2 }, emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } } }],
  }

  const evTone = { gate: '#22d3ee', rain: '#a78bfa', zone: '#fbbf24' }

  return (
    <div className="min-w-0 space-y-6 bg-white">
      <PageHeader title="Live Monitoring" description="Reservoir, hydrology and gate operation monitoring." />

      {/* ---------- control bar ---------- */}
      <div className="sticky top-0 z-30 -mx-1 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select dam">
            {(Object.values(PROFILES)).map((d) => (
              <button key={d.id} onClick={() => setDamId(d.id)} aria-pressed={damId === d.id}
                className={`rounded-xl border px-4 py-2 text-left transition ${damId === d.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="block text-sm font-semibold text-slate-900">{d.name}</span>
                <span className="block text-[11px] text-slate-600">{d.river} · {d.type}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Segmented label="Range" value={range} onChange={setRange} options={(Object.keys(RANGES) as RangeKey[]).map((k) => ({ v: k, t: RANGES[k].label }))} />
            <Segmented label="Flow" value={flowUnit} onChange={setFlowUnit} options={[{ v: 'm3s', t: 'm³/s' }, { v: 'cusecs', t: 'cusecs' }]} />
            <Segmented label="Level" value={levelUnit} onChange={setLevelUnit} options={[{ v: 'm', t: 'm' }, { v: 'ft', t: 'ft' }]} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
              <span className="relative flex h-2 w-2"><span className={`absolute inline-flex h-full w-full rounded-full bg-amber-400 ${running ? 'animate-ping' : ''} opacity-70`} /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" /></span>
              {running ? ' ' : 'SIMULATION PAUSED'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600"><Clock size={13} />Updated {ago}s ago · {new Date(live.at).toLocaleTimeString('en-IN')}</span>
            <span className="inline-flex items-center gap-1.5 text-slate-500"><Radio size={13} />{profile.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500" htmlFor="refresh">Refresh</label>
            <select id="refresh" value={intervalMs} onChange={(e) => setIntervalMs(+e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-800 outline-none focus:border-sky-500">
              <option value={2000}>2 s</option><option value={5000}>5 s</option><option value={10000}>10 s</option><option value={0}>Off</option>
            </select>
            <button onClick={() => setPaused(!paused)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-800 transition hover:bg-slate-200">
              {paused ? <Play size={13} /> : <Pause size={13} />}{paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- KPIs ---------- */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Key readings">
        <KpiCard label="Reservoir level" icon={Waves} color={PALETTE.level} value={f1(lq(live.level), 2)} unit={lvlLbl} spark={spark.level.map(lq)}
          deltaText={`${sgn(dLevel)}${f1(dLevel, 2)} ${lvlLbl}`} deltaDir={dir(dLevel)} sub={`FRL ${f1(lq(profile.frl), 2)} · ${f1(lq(profile.frl) - lq(live.level), 2)} ${lvlLbl} below`} chip={chip} />
        <KpiCard label="Live storage" icon={Droplets} color={PALETTE.storage} value={f1(live.storage, 1)} unit="MCM" spark={spark.storage}
          deltaText={`${sgn(dStor)}${f1(dStor, 2)} MCM`} deltaDir={dir(dStor)} sub={`of ${f1(profile.capMcm, 0)} MCM capacity (placeholder)`} />
        <KpiCard label="Filling" icon={Gauge} color="#2dd4bf" value={f1(fill, 2)} unit="%" spark={spark.fill}
          deltaText={`${sgn(fill - (hist.storage[h1] / profile.capMcm) * 100)}${f1(fill - (hist.storage[h1] / profile.capMcm) * 100, 2)} pts`} deltaDir={dir(dStor)} sub="Share of live capacity" />
        <KpiCard label="Inflow" icon={TrendingUp} color={PALETTE.inflow} value={f1(fq(live.inflow), flowD)} unit={flowLbl} spark={spark.inflow.map(fq)}
          deltaText={`${sgn(dIn)}${f1(dIn, flowD)} ${flowLbl}`} deltaDir={dir(dIn)} sub={`24 h peak ${f1(fq(Math.max(...hist.inflow.slice(-288))), flowD)} ${flowLbl}`} />
        <KpiCard label="Total outflow" icon={TrendingDown} color={PALETTE.outflow} value={f1(fq(live.outflow), flowD)} unit={flowLbl} spark={spark.outflow.map(fq)}
          deltaText={`${sgn(dOut)}${f1(dOut, flowD)} ${flowLbl}`} deltaDir={dir(dOut)} sub={`Gates ${f1(fq(live.gateFlow), flowD)} · Canal ${f1(fq(live.canal), flowD)}`} />
        <KpiCard label="Rainfall (24 h)" icon={CloudRain} color={PALETTE.rain} value={f1(live.rain24, 1)} unit="mm" spark={spark.rain}
          deltaText={`${sgn(rain1 - rainPrev)}${f1(rain1 - rainPrev, 1)} mm`} deltaDir={dir(rain1 - rainPrev)} sub={`Now ${f1(live.rainNow, 1)} mm/h`} deltaSuffix="last hour vs previous" />
      </section>

      {/* ---------- hero: gauge + hydrograph ---------- */}
      <section className="grid gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5">
          <div className={`${card} p-5`}>
            <h3 className="font-semibold text-slate-900">Reservoir filling</h3>
            <p className="mt-0.5 text-xs text-slate-600">Share of live capacity · colour bands are illustrative</p>
            <ReactECharts option={gaugeOption} notMerge={true} lazyUpdate={false} style={{ height: 250 }} />
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              {[['Level', `${f1(lq(live.level), 2)} ${lvlLbl}`, PALETTE.level], ['Storage', `${f1(live.storage, 0)} MCM`, PALETTE.storage], ['Net flow', `${sgn(live.inflow - live.outflow)}${f1(fq(live.inflow - live.outflow), flowD)}`, live.inflow >= live.outflow ? PALETTE.pos : PALETTE.neg]].map(([l, val, c]) => (
                <div key={l} className="rounded-lg border border-slate-200 bg-slate-50 py-2"><p className="text-slate-500">{l}</p><p className="mt-0.5 font-semibold" style={{ color: c }}>{val}</p></div>
              ))}
            </div>
          </div>
          <div className={`${card} p-5`}>
            <h3 className="font-semibold text-slate-900">Event log</h3>
            <p className="mt-0.5 text-xs text-slate-600">Today's events · {formatTodayIndia(clock)} · IST · simulated sample data</p>
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {events.length === 0 && <li className="text-xs text-slate-500">No events recorded today.</li>}
              {events.map((e, i) => (
                <li key={i} className="flex items-start gap-3 text-xs">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: evTone[e.kind] }} />
                  <span className="flex-1 text-slate-700">{e.text}</span>
                  <span className="shrink-0 text-slate-500">{formatEventTime(e.t)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="xl:col-span-2">
          <TrendPanel title="Combined hydrograph" subtitle="Reservoir level against inflow and outflow" unit={lvlLbl} unit2={flowLbl} resolution={v.resolution} height={520}
            allowTypes defaultType="line" bands={bands} refLines={frlLine} decimals={2} accent={PALETTE.level}
            series={[s('level', 'Reservoir level', PALETTE.level, v.level, { area: true }), s('in', 'Inflow', PALETTE.inflow, v.inflow, { axis: 1 }), s('out', 'Total outflow', PALETTE.outflow, v.outflow, { axis: 1 })]} />
        </div>
      </section>

      {/* ---------- level + storage ---------- */}
      <section className="grid gap-5 xl:grid-cols-2">
        <TrendPanel title="Reservoir level" subtitle="Water level against illustrative warning bands" unit={lvlLbl} resolution={v.resolution} allowTypes defaultType="area"
          bands={bands} refLines={frlLine} decimals={2} accent={PALETTE.level} series={[s('level', 'Reservoir level', PALETTE.level, v.level)]} />
        <TrendPanel title="Live storage" subtitle="Stored volume in the reservoir" unit="MCM" resolution={v.resolution} allowTypes defaultType="area" decimals={1} accent={PALETTE.storage}
          refLines={[{ value: profile.capMcm, label: `Capacity ${f1(profile.capMcm, 0)} MCM`, color: PALETTE.red }]} series={[s('st', 'Live storage', PALETTE.storage, v.storage)]} />
      </section>

      {/* ---------- discharge ---------- */}
      <section className="grid gap-5 xl:grid-cols-2">
        <TrendPanel title="Inflow vs outflow" subtitle="Gate discharge and canal release against inflow" unit={flowLbl} resolution={v.resolution} allowTypes defaultType="line" decimals={flowD} accent={PALETTE.inflow}
          series={[s('in', 'Inflow', PALETTE.inflow, v.inflow, { area: true }), s('gate', 'Gate discharge', PALETTE.outflow, v.gateFlow), s('canal', 'Canal release', PALETTE.canal, v.canal)]} />
        <TrendPanel title="Water balance" subtitle="Net inflow (bars) and cumulative volume change (line)" unit={flowLbl} unit2="MCM" resolution={v.resolution} decimals={2} accent={PALETTE.pos}
          series={[s('net', 'Net inflow', PALETTE.pos, { data: v.netB }, { kind: 'bar', colorFn: (x) => (x >= 0 ? PALETTE.pos : PALETTE.neg) }), s('cum', 'Cumulative volume', '#e879f9', { data: v.netCum }, { axis: 1 })]} />
      </section>

      {/* ---------- gates ---------- */}
      <section className="grid gap-5 xl:grid-cols-5">
        <div className={`${card} p-5 xl:col-span-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-semibold text-slate-900">Gate opening heat-map</h3><p className="mt-0.5 text-xs text-slate-600">{profile.gateCount} gates · opening % over the selected range</p></div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] text-sky-700">Simulated</span>
          </div>
          <ReactECharts option={heatOption} notMerge={true} lazyUpdate={false} style={{ height: Math.max(300, profile.gateCount * 20 + 90), width: '100%' }} />
        </div>
        <div className={`${card} p-5 xl:col-span-2`}>
          <h3 className="font-semibold text-slate-900">Gate status</h3>
          <p className="mt-0.5 text-xs text-slate-600">Current opening and discharge · {live.gates.filter((g) => g > 1).length} of {profile.gateCount} open</p>
          <div className="mt-3 max-h-[28rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr><th className="py-2 font-medium">Gate</th><th className="py-2 font-medium">Opening</th><th className="py-2 text-right font-medium">Discharge</th><th className="py-2 text-right font-medium">Status</th></tr>
              </thead>
              <tbody>
                {live.gates.map((o, i) => {
                  const st = o > 50 ? ['Open', 'bg-emerald-50 text-emerald-700'] : o > 1 ? ['Partial', 'bg-amber-50 text-amber-700'] : ['Closed', 'bg-slate-100 text-slate-600']
                  return (
                    <tr key={i} className="border-t border-slate-200/70">
                      <td className="py-2 font-medium text-slate-800">Gate {String(i + 1).padStart(2, '0')}</td>
                      <td className="py-2"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-300 transition-all duration-700" style={{ width: `${o}%` }} /></div><span className="w-10 text-xs tabular-nums text-slate-700">{f1(o, 0)}%</span></div></td>
                      <td className="py-2 text-right text-xs tabular-nums text-slate-700">{f1(fq((o / 100) * hist.qmax), flowD)} <span className="text-slate-500">{flowLbl}</span></td>
                      <td className="py-2 text-right"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st[1]}`}>{st[0]}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------- rain + curve ---------- */}
      <section className="grid gap-5 xl:grid-cols-2">
        <TrendPanel title="Rainfall" subtitle="Rain per interval (bars) and accumulated total (line)" unit="mm" unit2="mm total" resolution={v.resolution} variant="sum" decimals={1} accent={PALETTE.rain}
          series={[s('rain', 'Rainfall', PALETTE.rain, { data: v.rainB }, { kind: 'bar', colorFn: (x) => (x < 1 ? '#c4b5fd' : x < 4 ? '#a78bfa' : x < 9 ? '#e879f9' : '#fb7185') }), s('cum', 'Accumulated', PALETTE.rainCum, { data: v.rainCum }, { axis: 1 })]} />
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-slate-900">Elevation–capacity curve</h3>
          <p className="mt-0.5 text-xs text-slate-600">Where the reservoir sits now against the last 60 days (illustrative curve)</p>
          <ReactECharts option={curveOption} notMerge={true} lazyUpdate={false} style={{ height: 380, width: '100%' }} />
        </div>
      </section>

      <p className="rounded-xl border border-amber-200 bg-amber-500/5 p-3 text-xs leading-5 text-amber-800">
        All readings, trends, gate behaviour, capacity, FRL and warning bands on this page are simulated placeholders. They are not connected to SCADA and must not be used for operational decisions or dam-safety assessment.
      </p>
    </div>
  )
}

export default Monitoring