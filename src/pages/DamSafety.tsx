/* eslint-disable @typescript-eslint/no-explicit-any */
// SMART DAM 360 - Dam Safety Monitoring page (single file).
// Everything on this page is SIMULATED. Sections 1-2 (data engine + hook) are the only parts to
// replace with real instrumentation data; sections 3-4 (UI) can stay as they are.
// Needs: react, react-router-dom, echarts, echarts-for-react, lucide-react, and your PageHeader.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import type { LucideIcon } from 'lucide-react'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, ChartLine, CheckCircle2, ChevronRight, Clock, Download,
  Gauge, ImageDown, LayoutDashboard, Maximize2, Minimize2, Minus, Pause, Play, Radio, RadioTower, Search,
  ShieldCheck, Waves, Wrench,
} from 'lucide-react'

import PageHeader from '../components/common/PageHeader'

// ===========================================================================
// 1. SIMULATED DATA ENGINE
// 30 days of 30-minute readings for ~29 instruments per dam. Instruments respond to a simulated
// reservoir level (with lag), rainfall and temperature. A few are deliberately drifting, stale or
// offline so every state of the UI can be shown. Warning bands are ILLUSTRATIVE, not approved limits.
// ===========================================================================

type DamId = 'tawa' | 'bansagar'
type InstType = 'piezo' | 'seep' | 'crack' | 'settle' | 'incl' | 'pend'
type State = 'normal' | 'watch' | 'alert' | 'stale' | 'offline'

interface Profile {
  id: DamId; name: string; location: string; river: string; type: string
  mddl: number; frl: number; baseLevel: number; tail: number; seed: number
  n: Record<InstType, number>
}

const PROFILES: Record<DamId, Profile> = {
  tawa: { id: 'tawa', name: 'Tawa Dam', location: 'Narmadapuram, Madhya Pradesh', river: 'Tawa River', type: 'Earth-fill Dam', mddl: 336, frl: 358.75, baseLevel: 354.19, tail: 300, seed: 11, n: { piezo: 8, seep: 4, crack: 6, settle: 6, incl: 3, pend: 2 } },
  bansagar: { id: 'bansagar', name: 'Bansagar Dam', location: 'Shahdol, Madhya Pradesh', river: 'Son River', type: 'Composite Dam', mddl: 327, frl: 341.64, baseLevel: 340.82, tail: 285, seed: 23, n: { piezo: 10, seep: 5, crack: 8, settle: 6, incl: 4, pend: 3 } },
}

const TYPE_META: Record<InstType, { label: string; unit: string; dec: number; color: string }> = {
  piezo: { label: 'Piezometer', unit: 'm', dec: 2, color: '#0098DB' },
  seep: { label: 'Seepage weir', unit: 'L/s', dec: 2, color: '#91D8F4' },
  crack: { label: 'Crack / joint meter', unit: 'mm', dec: 3, color: '#fb923c' },
  settle: { label: 'Settlement point', unit: 'mm', dec: 2, color: '#2dd4bf' },
  incl: { label: 'Inclinometer', unit: 'mm', dec: 2, color: '#f472b6' },
  pend: { label: 'Pendulum', unit: 'mm', dec: 3, color: '#a78bfa' },
}

const STATE_META: Record<State, { label: string; color: string; chip: string }> = {
  normal: { label: 'Normal', color: '#059669', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  watch: { label: 'Watch', color: '#D97706', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  alert: { label: 'Alert', color: '#E11D48', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
  stale: { label: 'Stale', color: '#7C3AED', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  offline: { label: 'Offline', color: '#64748B', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const SERIES_COLORS = ['#0098DB', '#91D8F4', '#087DB5', '#58BDE8', '#0B5F8A', '#B8E8F8', '#3B9CCB', '#6CC9EB', '#174C69', '#D9F3FC']
const STEP = 30 * 60e3
const N = 30 * 48
const BASE_STEPS = 20 * 48

interface Instrument { id: string; type: InstType; location: string; v: number[]; lo: number; hi: number; span: number; mode: 'live' | 'stale' | 'offline' }
interface Data { t: number[]; level: number[]; inst: Instrument[] }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const pad = (n: number) => String(n).padStart(2, '0')
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const ema = (src: number[], alpha: number) => { const o: number[] = []; let x = src[0]; for (const s of src) { x += alpha * (s - x); o.push(x) } return o }

function generate(p: Profile, now: number): Data {
  const rnd = mulberry32(p.seed)
  const rain = new Array<number>(N).fill(0)
  const storms = Array.from({ length: 9 }, () => ({ at: Math.floor(rnd() * (N - 160)), dur: 12 + Math.floor(rnd() * 60), peak: 2 + rnd() * 12 }))
  storms.push({ at: N - 90, dur: 40, peak: 5 })
  for (const s of storms) for (let j = 0; j < s.dur && s.at + j < N; j++) { const x = Math.sin((Math.PI * j) / s.dur); rain[s.at + j] += s.peak * x * x * (0.7 + 0.6 * rnd()) }

  const t = Array.from({ length: N }, (_, i) => now - (N - 1 - i) * STEP)
  const level: number[] = []
  let L = p.baseLevel - 0.3, r = 0
  for (let i = 0; i < N; i++) { r = r * 0.97 + rain[i] * 0.005; L += r * 0.003 - (L - p.baseLevel) * 0.004 + (rnd() - 0.5) * 0.004; level.push(L) }
  const fix = p.baseLevel - level[N - 1]
  for (let i = 0; i < N; i++) level[i] += fix * (i / (N - 1))

  const temp = t.map((ts) => { const d = new Date(ts); return 26 + 3 * Math.sin((2 * Math.PI * (d.getHours() + d.getMinutes() / 60 - 9)) / 24) })
  const lag1 = ema(level, 0.02), lag2 = ema(level, 0.006), tlag = ema(temp, 0.01), rainE = ema(rain, 0.05)
  const frac = (x: number) => clamp((x - p.mddl) / (p.frl - p.mddl), 0, 1.2)

  const inst: Instrument[] = []
  const mk = (type: InstType, id: string, location: string, gen: (i: number) => number) =>
    inst.push({ id, type, location, v: Array.from({ length: N }, (_, i) => gen(i)), lo: 0, hi: 0, span: 1, mode: 'live' })

  for (let k = 0; k < p.n.piezo; k++) { const att = 0.25 + 0.6 * rnd(); mk('piezo', `PZ-${pad(k + 1)}`, `Block ${3 + k * 2} · gallery`, (i) => p.tail + att * (lag1[i] - p.tail) + (rnd() - 0.5) * 0.02) }
  for (let k = 0; k < p.n.seep; k++) { const b = 2 + rnd() * 10; mk('seep', `SW-${pad(k + 1)}`, k % 2 ? `Gallery drain ${k}` : `Toe drain ${k + 1}`, (i) => b * (0.6 + 1.2 * Math.pow(frac(lag2[i]), 3)) + rainE[i] * b * 0.05 + (rnd() - 0.5) * b * 0.02) }
  for (let k = 0; k < p.n.crack; k++) { const b = 0.2 + 1.2 * rnd(), tc = 0.01 + 0.02 * rnd(), lc = 0.004 + 0.006 * rnd(); mk('crack', `CJ-${pad(k + 1)}`, `Block ${4 + k * 2} joint`, (i) => b + tc * (tlag[i] - 26) + lc * (lag1[i] - p.baseLevel) + (rnd() - 0.5) * 0.004) }
  for (let k = 0; k < p.n.settle; k++) { const b = 4 + 20 * rnd(), c = (0.015 + 0.03 * rnd()) / 48; mk('settle', `SP-${pad(k + 1)}`, `Crest · chainage ${100 + k * 120} m`, (i) => b + c * i + (rnd() - 0.5) * 0.01) }
  for (let k = 0; k < p.n.incl; k++) { const b = 1 + 6 * rnd(), c = 0.01 / 48; mk('incl', `IN-${pad(k + 1)}`, k % 2 ? 'Right abutment' : 'Left abutment', (i) => b + 0.02 * (lag1[i] - p.baseLevel) + c * i + (rnd() - 0.5) * 0.01) }
  for (let k = 0; k < p.n.pend; k++) mk('pend', `PD-${pad(k + 1)}`, `Block ${6 + k * 4} shaft`, (i) => 1.2 + 0.6 * frac(lag1[i]) + 0.03 * (tlag[i] - 26) + (rnd() - 0.5) * 0.004)

  // baseline band from the first 20 days, then illustrative drift / dropouts / stale / offline
  const inject: Record<string, number> = { 'PZ-03': 0.45, 'SW-02': 0.4, 'CJ-04': 0.9 }
  for (const m of inst) {
    const b = m.v.slice(0, BASE_STEPS), mean = b.reduce((a, c) => a + c, 0) / b.length
    m.lo = Math.min(...b); m.hi = Math.max(...b); m.span = Math.max(m.hi - m.lo, Math.abs(mean) * 0.004 + 0.002)
    const amp = inject[m.id]
    if (amp) for (let i = N - 144; i < N; i++) { const x = clamp((i - (N - 144)) / 144, 0, 1); m.v[i] += m.span * amp * x * x * (3 - 2 * x) }
    if (rnd() < 0.35) { const s = N - 14 * 48 + Math.floor(rnd() * (13 * 48 - 40)), len = 8 + Math.floor(rnd() * 22); for (let i = s; i < s + len; i++) m.v[i] = NaN }
    if (m.id === 'IN-02') { m.mode = 'stale'; for (let i = N - 8; i < N; i++) m.v[i] = NaN }
    if (m.id === 'SP-05') { m.mode = 'offline'; for (let i = N - 100; i < N; i++) m.v[i] = NaN }
  }
  return { t, level, inst }
}

const lastValid = (v: number[]) => { for (let i = v.length - 1; i >= 0; i--) if (!Number.isNaN(v[i])) return i; return -1 }
const bandRatio = (m: Instrument, x: number) => (x > m.hi ? x - m.hi : x < m.lo ? m.lo - x : 0) / m.span
const bandState = (m: Instrument, x: number): State => { const r = bandRatio(m, x); return r > 0.6 ? 'alert' : r > 0.25 ? 'watch' : 'normal' }

function statusOf(m: Instrument, t: number[], now: number): { state: State; value: number; at: number } {
  const li = lastValid(m.v)
  if (li < 0) return { state: 'offline', value: NaN, at: 0 }
  const age = now - t[li]
  const value = m.v[li]
  if (age > 24 * 36e5) return { state: 'offline', value, at: t[li] }
  if (age > 90 * 6e4) return { state: 'stale', value, at: t[li] }
  return { state: bandState(m, value), value, at: t[li] }
}

interface Ev { id: string; t: number; sev: 'alert' | 'watch' | 'comm' | 'info'; text: string }
function buildEvents(data: Data): Ev[] {
  const out: Ev[] = []
  for (const m of data.inst) {
    const meta = TYPE_META[m.type]
    let prev: State = 'normal', gap = 0
    for (let i = 0; i < N; i++) {
      const x = m.v[i]
      if (Number.isNaN(x)) { gap++; if (gap === 6) out.push({ id: `${m.id}-g${i}`, t: data.t[i], sev: 'comm', text: `${m.id}: no data for 3 h` }); continue }
      if (gap >= 6 && i < N) out.push({ id: `${m.id}-r${i}`, t: data.t[i], sev: 'info', text: `${m.id}: communication restored` })
      gap = 0
      const s = bandState(m, x)
      if (s !== prev) {
        if (s === 'normal') out.push({ id: `${m.id}-n${i}`, t: data.t[i], sev: 'info', text: `${m.id} back inside the normal band` })
        else out.push({ id: `${m.id}-${s}${i}`, t: data.t[i], sev: s, text: `${m.id} ${x.toFixed(meta.dec)} ${meta.unit} outside the illustrative ${s} limit` })
        prev = s
      }
    }
  }
  return out.sort((a, b) => b.t - a.t).slice(0, 60)
}

function corr(a: number[], b: number[]) {
  const xs: number[] = [], ys: number[] = []
  a.forEach((x, i) => { if (!Number.isNaN(x) && !Number.isNaN(b[i])) { xs.push(x); ys.push(b[i]) } })
  const n = xs.length; if (n < 3) return NaN
  const mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2 }
  return sxy / Math.sqrt(sxx * syy || 1)
}

// ===========================================================================
// 2. LIVE FEED HOOK  (swap for a real telemetry hook later)
// ===========================================================================

function useLiveSafety(id: DamId, intervalMs: number, paused: boolean) {
  const profile = PROFILES[id]
  const data = useMemo(() => generate(profile, Date.now()), [profile])
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (paused || intervalMs <= 0) return
    const timer = setInterval(() => {
      const j = () => Math.random() - 0.5
      const n = data.t.length - 1, now = Date.now()
      data.level[n] += j() * 0.003
      for (const m of data.inst) {
        if (m.mode !== 'live' || Number.isNaN(m.v[n])) continue
        m.v[n] += j() * m.span * 0.012 + (m.v[n - 1] - m.v[n]) * 0.05
      }
      if (now - data.t[n] >= STEP) {                                 // roll a new 30-minute bucket
        data.t.push(now); data.level.push(data.level[n])
        for (const m of data.inst) m.v.push(m.mode === 'live' ? m.v[n] : NaN)
        data.t.shift(); data.level.shift(); for (const m of data.inst) m.v.shift()
      }
      setTick((x) => x + 1)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [data, intervalMs, paused])
  return { profile, data, tick }
}

// ===========================================================================
// 3. UI PRIMITIVES
// ===========================================================================

const card = 'rounded-2xl border border-[#DCE7EE] bg-white shadow-sm'
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }) : '–')
const ago = (ms: number) => { const m = Math.max(0, Math.round(ms / 6e4)); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago` }

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; t: string }[]; label: string }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-0.5">
        {options.map((o) => <button key={o.v} onClick={() => onChange(o.v)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${value === o.v ? 'bg-[#0098DB] text-white' : 'text-slate-600 hover:text-[#102B3D]'}`}>{o.t}</button>)}
      </div>
    </div>
  )
}

function Sparkline({ data, color, h = 40 }: { data: number[]; color: string; h?: number }) {
  const id = useId()
  const pts = data.filter((x) => Number.isFinite(x))
  if (pts.length < 2) return <div style={{ height: h }} />
  const w = 140, mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - 4 - ((v - mn) / sp) * (h - 8)])
  const line = 'M' + xy.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L')
  const last = xy[xy.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ height: h }} className="w-full" preserveAspectRatio="none" aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  )
}

function Kpi(k: { label: string; icon: LucideIcon; value: string; unit: string; color: string; spark: number[]; delta?: { text: string; dir: 'up' | 'down' | 'flat' }; sub: string; chip?: { text: string; state: State } }) {
  const [flash, setFlash] = useState(false)
  const prev = useRef(k.value)
  useEffect(() => { if (prev.current === k.value) return; prev.current = k.value; setFlash(true); const t = setTimeout(() => setFlash(false), 450); return () => clearTimeout(t) }, [k.value])
  const Icon = k.icon
  const Dir = k.delta?.dir === 'up' ? ArrowUpRight : k.delta?.dir === 'down' ? ArrowDownRight : Minus
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#DCE7EE] bg-white p-4">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: k.color }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2"><span className="rounded-lg p-1.5" style={{ background: k.color + '22', color: k.color }}><Icon size={16} /></span><span className="text-xs font-medium text-slate-600">{k.label}</span></div>
        {k.chip && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATE_META[k.chip.state].chip}`}>{k.chip.text}</span>}
      </div>
      <p className="mt-3 flex items-baseline gap-1.5"><span className="text-3xl font-semibold tabular-nums transition-colors duration-300" style={{ color: flash ? k.color : '#fff' }}>{k.value}</span><span className="text-sm text-slate-500">{k.unit}</span></p>
      {k.delta && <p className={`mt-1 inline-flex items-center gap-1 text-xs ${k.delta.dir === 'up' ? 'text-emerald-700' : k.delta.dir === 'down' ? 'text-amber-700' : 'text-slate-600'}`}><Dir size={13} />{k.delta.text}<span className="text-slate-500"> vs 24 h ago</span></p>}
      <div className="mt-2"><Sparkline data={k.spark} color={k.color} /></div>
      <p className="mt-1 text-[11px] text-slate-500">{k.sub}</p>
    </div>
  )
}

interface LS { name: string; color: string; data: [number, number | null][]; axis?: 0 | 1; dashed?: boolean }
interface Band { from: number; to: number; color: string; label: string }

function LinePanel(p: { title: string; subtitle?: string; unit: string; unit2?: string; series: LS[]; bands?: Band[]; refLines?: { value: number; label: string; color: string }[]; height?: number; decimals?: number; statsIdx?: number; accent?: string; badge?: string }) {
  const d = p.decimals ?? 2
  const [type, setType] = useState<'line' | 'area' | 'step'>('line')
  const [smooth, setSmooth] = useState(false)
  const [full, setFull] = useState(false)
  const chart = useRef<ReactECharts>(null)
  const accent = p.accent ?? p.series[0]?.color ?? '#0098DB'
  useEffect(() => { if (!full) return; const esc = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false); addEventListener('keydown', esc); return () => removeEventListener('keydown', esc) }, [full])

  const st = useMemo(() => {
    if (p.statsIdx === undefined) return null
    const pts = p.series[p.statsIdx].data.filter((x): x is [number, number] => x[1] !== null)
    if (!pts.length) return null
    const vals = pts.map((x) => x[1]), cur = vals[vals.length - 1]
    return { cur, min: Math.min(...vals), max: Math.max(...vals), avg: vals.reduce((a, b) => a + b, 0) / vals.length, delta: cur - vals[0] }
  }, [p.series, p.statsIdx])

  const option = useMemo<any>(() => {
    const series: any[] = p.series.map((s, i) => ({
      name: s.name, type: 'line', yAxisIndex: s.axis ?? 0, data: s.data, showSymbol: false, connectNulls: false, smooth, step: type === 'step' ? 'end' : undefined, z: 3,
      lineStyle: { width: s.dashed ? 1.5 : 2.2, type: s.dashed ? 'dashed' : 'solid', color: s.color }, itemStyle: { color: s.color }, emphasis: { focus: 'series' },
      areaStyle: type === 'area' && !s.dashed ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: s.color + '55' }, { offset: 1, color: s.color + '00' }]) } : undefined,
      markLine: i === 0 && p.refLines?.length ? { symbol: 'none', silent: true, animation: false, data: p.refLines.map((r) => ({ yAxis: r.value, lineStyle: { color: r.color, type: 'dashed', width: 1.2 }, label: { formatter: r.label, color: r.color, fontSize: 10, position: 'insideEndTop' } })) } : undefined,
      markArea: i === 0 && p.bands?.length ? { silent: true, data: p.bands.map((b) => [{ yAxis: b.from, itemStyle: { color: b.color + '1c' } }, { yAxis: b.to }]) } : undefined,
    }))
    const first = p.series[0]?.data.filter((x) => x[1] !== null).slice(-1)[0]
    if (first) series.push({ name: '__live', type: 'effectScatter', yAxisIndex: p.series[0].axis ?? 0, data: [first], symbolSize: 8, z: 10, rippleEffect: { scale: 3.2, brushType: 'stroke' }, itemStyle: { color: p.series[0].color }, tooltip: { show: false } })
    return {
      backgroundColor: 'transparent', animationDuration: 500, animationDurationUpdate: 300,
      grid: { top: 40, left: 6, right: p.unit2 ? 6 : 18, bottom: 62, containLabel: true },
      legend: { top: 0, right: 0, type: 'scroll', itemWidth: 14, itemHeight: 5, icon: 'roundRect', textStyle: { color: '#64748B', fontSize: 11 }, data: p.series.map((s) => s.name) },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#DCE7EE', textStyle: { color: '#102B3D', fontSize: 12 }, axisPointer: { type: 'cross', lineStyle: { color: '#64748B' }, label: { backgroundColor: '#CBD5E1' } }, valueFormatter: (v: any) => (typeof v === 'number' ? fmt(v, d) : 'no data') },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: { type: 'time', axisLine: { lineStyle: { color: '#CBD5E1' } }, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { show: false } },
      yAxis: [
        { type: 'value', scale: true, name: p.unit, nameTextStyle: { color: '#64748B' }, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } } },
        ...(p.unit2 ? [{ type: 'value', scale: true, name: p.unit2, nameTextStyle: { color: '#64748B' }, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { show: false } }] : []),
      ],
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 10, borderColor: '#E2E8F0', backgroundColor: '#F1F7FA', fillerColor: accent + '26', handleSize: 12, textStyle: { color: '#64748B' } }],
      series,
    }
  }, [p.series, p.bands, p.refLines, p.unit, p.unit2, type, smooth, d, accent])

  const csv = () => {
    const rows = ['timestamp,' + p.series.map((s) => `"${s.name}"`).join(',')]
    p.series[0].data.forEach((pt, i) => rows.push(new Date(pt[0]).toISOString() + ',' + p.series.map((s) => s.data[i]?.[1] ?? '').join(',')))
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = `${p.title.toLowerCase().replace(/\W+/g, '-')}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }
  const png = () => { const u = chart.current?.getEchartsInstance().getDataURL({ pixelRatio: 2, backgroundColor: '#FFFFFF' }); if (!u) return; const a = document.createElement('a'); a.href = u; a.download = `${p.title.toLowerCase().replace(/\W+/g, '-')}.png`; a.click() }
  const b = (on: boolean) => `rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${on ? 'bg-[#0098DB] text-white' : 'text-slate-600 hover:bg-[#EAF7FD] hover:text-[#102B3D]'}`
  const ib = 'rounded-md p-1.5 text-slate-600 transition hover:bg-[#EAF7FD] hover:text-[#102B3D]'
  return (
    <>
      {full && <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-sm" onClick={() => setFull(false)} />}
      <div className={`flex flex-col ${card} p-5 ${full ? 'fixed inset-4 z-50' : ''}`} style={{ borderTopColor: accent + '99', borderTopWidth: 2 }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-semibold text-[#102B3D]">{p.title}</h3><p className="mt-0.5 text-xs text-slate-600">{p.subtitle} {p.badge && <span className="ml-1 rounded bg-[#EAF7FD] px-1.5 py-0.5 text-[10px]">{p.badge}</span>}</p></div>
          <div className="flex items-center gap-1 rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-1">
            {(['line', 'area', 'step'] as const).map((t) => <button key={t} className={b(type === t)} onClick={() => setType(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
            <button className={b(smooth)} onClick={() => setSmooth(!smooth)}>Smooth</button>
            <span className="mx-0.5 h-4 w-px bg-[#EAF7FD]" />
            <button className={ib} title="Download CSV" aria-label="Download CSV" onClick={csv}><Download size={14} /></button>
            <button className={ib} title="Save image" aria-label="Save image" onClick={png}><ImageDown size={14} /></button>
            <button className={ib} title={full ? 'Exit full screen (Esc)' : 'Full screen'} aria-label="Toggle full screen" onClick={() => setFull(!full)}>{full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
          </div>
        </div>
        {st && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[['Current', st.cur, accent], ['Min', st.min, '#0098DB'], ['Max', st.max, '#fbbf24'], ['Average', st.avg, '#94a3b8'], ['Change', st.delta, st.delta >= 0 ? '#34d399' : '#fbbf24']].map(([l, v, c]) => (
              <div key={l as string} className="rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">{l as string}</p><p className="mt-0.5 text-sm font-semibold" style={{ color: c as string }}>{(l === 'Change' && (v as number) > 0 ? '+' : '') + fmt(v as number, d)} <span className="text-[10px] font-normal text-slate-500">{p.unit}</span></p></div>
            ))}
          </div>
        )}
        <div className="mt-2 min-h-0 flex-1">
          <ReactECharts ref={chart} option={option} lazyUpdate style={{ height: full ? '100%' : p.height ?? 300, width: '100%' }} onChartReady={(c) => { c.group = 'safety'; echarts.connect('safety') }} />
        </div>
      </div>
    </>
  )
}

// ===========================================================================
// 4. PAGE
// ===========================================================================

const safetyNavigation = [
  { label: 'Overview', path: '/dam-safety', icon: LayoutDashboard },
  { label: 'Instrumentation', path: '/dam-safety/instrumentation', icon: RadioTower },
  { label: 'Safety Parameters', path: '/dam-safety/parameters', icon: ChartLine },
  { label: 'Safety Events', path: '/dam-safety/events', icon: AlertTriangle },
]
const RANGES = { '24h': { steps: 48, label: '24 h' }, '7d': { steps: 336, label: '7 days' }, '30d': { steps: 1440, label: '30 days' } } as const
type RangeKey = keyof typeof RANGES
const SEV: Record<Ev['sev'], { label: string; color: string; chip: string }> = {
  alert: { label: 'Alert', color: '#fb7185', chip: 'bg-rose-50 text-rose-700' },
  watch: { label: 'Watch', color: '#fbbf24', chip: 'bg-amber-50 text-amber-700' },
  comm: { label: 'Comms', color: '#a78bfa', chip: 'bg-violet-50 text-violet-700' },
  info: { label: 'Info', color: '#0098DB', chip: 'bg-sky-50 text-sky-700' },
}

const MAINTENANCE_MONTHS = ['Nov', 'Oct', 'Sep', 'Aug', 'Jul'] as const
type MaintenanceMark = 'A' | 'H' | 'M' | 'Q' | '—'
const DAM_INSTRUMENT_MAINTENANCE: { instrument: string; schedule: Record<(typeof MAINTENANCE_MONTHS)[number], MaintenanceMark> }[] = [
  { instrument: 'Gate position transmitter', schedule: { Nov: 'M', Oct: 'M', Sep: 'M', Aug: 'M', Jul: 'M' } },
  { instrument: 'Rotary encoder', schedule: { Nov: '—', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
  { instrument: 'Open / close limit switch', schedule: { Nov: 'M', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
  { instrument: 'Water level transmitter', schedule: { Nov: 'M', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
  { instrument: 'Pressure transmitter', schedule: { Nov: 'Q', Oct: '—', Sep: '—', Aug: 'Q', Jul: '—' } },
  { instrument: 'Load cell', schedule: { Nov: 'Q', Oct: '—', Sep: '—', Aug: 'Q', Jul: '—' } },
  { instrument: 'Flow meter', schedule: { Nov: 'Q', Oct: '—', Sep: '—', Aug: 'Q', Jul: '—' } },
  { instrument: 'Vibration sensor', schedule: { Nov: 'M', Oct: 'M', Sep: 'M', Aug: 'M', Jul: '—' } },
  { instrument: 'Temperature sensor', schedule: { Nov: 'M', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
  { instrument: 'PLC panel', schedule: { Nov: 'M', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
  { instrument: 'SCADA server', schedule: { Nov: 'M', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
  { instrument: 'VFD', schedule: { Nov: 'M', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
  { instrument: 'Hydraulic power pack', schedule: { Nov: 'M', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
  { instrument: 'UPS', schedule: { Nov: 'M', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
  { instrument: 'Ethernet switch', schedule: { Nov: 'M', Oct: '—', Sep: '—', Aug: '—', Jul: '—' } },
]

export default function DamSafety() {
  const [damId, setDamId] = useState<DamId>('tawa')
  const [range, setRange] = useState<RangeKey>('7d')
  const [intervalMs, setIntervalMs] = useState(3000)
  const [paused, setPaused] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const [typeF, setTypeF] = useState<InstType | 'all'>('all')
  const [stateF, setStateF] = useState<State | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selId, setSelId] = useState('PZ-01')
  const [acked, setAcked] = useState<Set<string>>(new Set())
  const [evShow, setEvShow] = useState(8)
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { setSelId('PZ-01'); setAcked(new Set()) }, [damId])

  const { profile, data, tick } = useLiveSafety(damId, intervalMs, paused)
  const now = Date.now()
  const last = data.t.length - 1
  const i0 = Math.max(0, data.t.length - RANGES[range].steps)

  const rows = useMemo(() => data.inst.map((m) => {
    const st = statusOf(m, data.t, Date.now())
    const li = lastValid(m.v)
    const prev = li >= 48 ? m.v[li - 48] : NaN
    const sp = Array.from({ length: 28 }, (_, k) => m.v[Math.max(0, data.t.length - 336 + k * 12)])
    return { m, ...st, d24: Number.isNaN(prev) ? NaN : st.value - prev, spark: sp }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [tick, data])

  const counts = useMemo(() => { const c: Record<State, number> = { normal: 0, watch: 0, alert: 0, stale: 0, offline: 0 }; rows.forEach((r) => c[r.state]++); return c }, [rows])
  const total = rows.length
  const online = counts.normal + counts.watch + counts.alert
  const typed = (t: InstType) => rows.filter((r) => r.m.type === t)
  const worst = (t: InstType): State => { const s = typed(t).map((r) => r.state); return s.includes('alert') ? 'alert' : s.includes('watch') ? 'watch' : 'normal' }
  const seriesOf = (arr: number[]): [number, number | null][] => data.t.slice(i0).map((t, j) => [t, Number.isNaN(arr[i0 + j]) ? null : +arr[i0 + j].toFixed(4)])
  const agg = (f: (r: number[]) => number, t: InstType) => Array.from({ length: 48 }, (_, k) => { const idx = last - 47 + k; const vals = data.inst.filter((m) => m.type === t).map((m) => m.v[idx]).filter((x) => !Number.isNaN(x)); return vals.length ? f(vals) : NaN })
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
  const complete = Array.from({ length: 48 }, (_, k) => { const idx = last - 47 + k; return (data.inst.filter((m) => !Number.isNaN(m.v[idx])).length / total) * 100 })

  const pz = typed('piezo'), sw = typed('seep'), se = typed('settle'), cr = typed('crack')
  const pzMean = mean(pz.map((r) => r.value).filter(Number.isFinite)), pz24 = mean(pz.map((r) => r.value - r.d24).filter(Number.isFinite))
  const swSum = sum(sw.map((r) => r.value).filter(Number.isFinite)), sw24 = swSum - sum(sw.map((r) => r.d24).filter(Number.isFinite))
  const seMax = Math.max(...se.map((r) => r.value).filter(Number.isFinite)), crMax = Math.max(...cr.map((r) => r.value - r.m.lo).filter(Number.isFinite))
  const pzTop = pz.reduce((a, b) => (b.value > a.value ? b : a), pz[0])
  const dir = (x: number): 'up' | 'down' | 'flat' => (Math.abs(x) < 1e-4 ? 'flat' : x > 0 ? 'up' : 'down')
  const sgn = (x: number) => (x > 0 ? '+' : '')
  const activeAlerts = counts.watch + counts.alert
  const dq = (online / total) * 100
  const alertSpark = Array.from({ length: 48 }, (_, k) => { const idx = last - 47 + k; return data.inst.filter((m) => !Number.isNaN(m.v[idx]) && bandState(m, m.v[idx]) !== 'normal').length })

  const events = useMemo(() => buildEvents(data), [data, Math.floor(tick / 20)]) // eslint-disable-line react-hooks/exhaustive-deps
  const openEvents = events.filter((e) => (e.sev === 'alert' || e.sev === 'watch' || e.sev === 'comm') && !acked.has(e.id)).length

  const filtered = rows.filter((r) => (typeF === 'all' || r.m.type === typeF) && (stateF === 'all' || r.state === stateF) && (r.m.id + r.m.location + TYPE_META[r.m.type].label).toLowerCase().includes(query.toLowerCase()))
  const sel = rows.find((r) => r.m.id === selId) ?? rows[0]
  const levelSeries: LS = { name: 'Reservoir level (m)', color: '#64748B', dashed: true, axis: 1, data: seriesOf(data.level) }
  const palette = (list: typeof rows) => list.map((r, i) => ({ name: r.m.id, color: SERIES_COLORS[i % SERIES_COLORS.length], data: seriesOf(r.m.v) }) as LS)

  const detail = useMemo(() => {
    const m = sel.m, s = m.span
    return {
      bands: [
        { from: m.lo - 0.25 * s, to: m.hi + 0.25 * s, color: '#34d399', label: 'normal' },
        { from: m.hi + 0.25 * s, to: m.hi + 0.6 * s, color: '#fbbf24', label: 'watch' }, { from: m.lo - 0.6 * s, to: m.lo - 0.25 * s, color: '#fbbf24', label: 'watch' },
        { from: m.hi + 0.6 * s, to: m.hi + 1.6 * s, color: '#fb7185', label: 'alert' }, { from: m.lo - 1.6 * s, to: m.lo - 0.6 * s, color: '#fb7185', label: 'alert' },
      ],
      r: corr(m.v.slice(i0), data.level.slice(i0)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.m.id, damId, range, tick])

  const donut: any = { backgroundColor: 'transparent', tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#DCE7EE', textStyle: { color: '#102B3D' } },
    series: [{ type: 'pie', radius: ['58%', '82%'], center: ['50%', '50%'], avoidLabelOverlap: false, label: { show: true, position: 'center', formatter: `{a|${online}/${total}}\n{b|online}`, rich: { a: { color: '#fff', fontSize: 26, fontWeight: 600, lineHeight: 32 }, b: { color: '#64748B', fontSize: 11 } } },
      itemStyle: { borderColor: '#FFFFFF', borderWidth: 3, borderRadius: 6 }, data: (Object.keys(counts) as State[]).filter((k) => counts[k] > 0).map((k) => ({ name: STATE_META[k].label, value: counts[k], itemStyle: { color: STATE_META[k].color } })) }] }

  const profileOpt: any = useMemo(() => ({
    backgroundColor: 'transparent', grid: { top: 30, left: 6, right: 14, bottom: 24, containLabel: true },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#DCE7EE', textStyle: { color: '#102B3D', fontSize: 12 }, valueFormatter: (v: any) => `${fmt(v)} m` },
    xAxis: { type: 'category', data: pz.map((r) => r.m.id), axisLabel: { color: '#64748B', fontSize: 10 }, axisLine: { lineStyle: { color: '#CBD5E1' } } },
    yAxis: { type: 'value', scale: true, name: 'm', nameTextStyle: { color: '#64748B' }, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } } },
    series: [{ type: 'bar', barMaxWidth: 26, data: pz.map((r) => ({ value: +r.value.toFixed(2), itemStyle: { color: STATE_META[r.state].color, borderRadius: [4, 4, 0, 0] } })),
      markLine: { symbol: 'none', silent: true, data: [{ yAxis: data.level[last], lineStyle: { color: '#0098DB', type: 'dashed' }, label: { formatter: 'Reservoir', color: '#0098DB', fontSize: 10, position: 'insideEndTop' } }] } }],
  }), [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const scatterOpt: any = useMemo(() => {
    const swi = data.inst.filter((m) => m.type === 'seep')
    const pts: [number, number][] = []
    for (let i = i0; i < data.t.length; i += 2) { const vs = swi.map((m) => m.v[i]).filter((x) => !Number.isNaN(x)); if (vs.length) pts.push([+data.level[i].toFixed(3), +sum(vs).toFixed(2)]) }
    const n = pts.length, mx = mean(pts.map((p) => p[0])), my = mean(pts.map((p) => p[1]))
    let sxy = 0, sxx = 0, syy = 0; pts.forEach((p) => { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) ** 2; syy += (p[1] - my) ** 2 })
    const slope = sxy / (sxx || 1), icpt = my - slope * mx, r2 = (sxy * sxy) / ((sxx * syy) || 1)
    const xs = pts.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs)
    return {
      backgroundColor: 'transparent', grid: { top: 36, left: 6, right: 18, bottom: 32, containLabel: true },
      title: { text: n > 2 ? `R² = ${r2.toFixed(2)}` : '', right: 6, top: 4, textStyle: { color: '#64748B', fontSize: 11, fontWeight: 400 } },
      tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#DCE7EE', textStyle: { color: '#102B3D', fontSize: 12 } },
      xAxis: { type: 'value', scale: true, name: 'Reservoir level (m)', nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: '#64748B' }, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } } },
      yAxis: { type: 'value', scale: true, name: 'Seepage (L/s)', nameTextStyle: { color: '#64748B' }, axisLabel: { color: '#64748B', fontSize: 10 }, splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } } },
      series: [
        { name: 'Readings', type: 'scatter', data: pts, symbolSize: 5, itemStyle: { color: '#91D8F4', opacity: 0.55 } },
        { name: 'Trend', type: 'line', data: [[x0, slope * x0 + icpt], [x1, slope * x1 + icpt]], showSymbol: false, lineStyle: { color: '#fbbf24', width: 2, type: 'dashed' } },
        { name: 'Now', type: 'effectScatter', data: [pts[pts.length - 1]], symbolSize: 10, rippleEffect: { scale: 3.4 }, itemStyle: { color: '#0098DB' } },
      ],
    }
  }, [tick, damId, range]) // eslint-disable-line react-hooks/exhaustive-deps

  const heatOpt: any = useMemo(() => {
    const days = 14, xs = Array.from({ length: days }, (_, k) => new Date(Date.now() - (days - 1 - k) * 864e5).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }))
    const cells: [number, number, number][] = []
    data.inst.forEach((m, yi) => { for (let dI = 0; dI < days; dI++) { const a = data.t.length - (days - dI) * 48, b = Math.min(data.t.length, a + 48); let ok = 0; for (let q = Math.max(0, a); q < b; q++) if (!Number.isNaN(m.v[q])) ok++; cells.push([dI, yi, Math.round((ok / (b - Math.max(0, a))) * 100)]) } })
    return {
      backgroundColor: 'transparent', animation: false, grid: { top: 6, left: 6, right: 12, bottom: 54, containLabel: true },
      tooltip: { position: 'top', backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#DCE7EE', textStyle: { color: '#102B3D', fontSize: 12 }, formatter: (q: any) => `${data.inst[q.value[1]].id} · ${xs[q.value[0]]}<br/><b>${q.value[2]}%</b> of readings received` },
      xAxis: { type: 'category', data: xs, axisLabel: { color: '#64748B', fontSize: 10, interval: 1 }, axisLine: { lineStyle: { color: '#CBD5E1' } } },
      yAxis: { type: 'category', inverse: true, data: data.inst.map((m) => m.id), axisLabel: { color: '#64748B', fontSize: 9 }, axisLine: { show: false } },
      visualMap: { min: 0, max: 100, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 140, calculable: false, textStyle: { color: '#64748B', fontSize: 10 }, inRange: { color: ['#7f1d1d', '#b45309', '#07577c', '#0098DB', '#91D8F4'] } },
      series: [{ type: 'heatmap', data: cells, itemStyle: { borderColor: '#FFFFFF', borderWidth: 1, borderRadius: 2 } }],
    }
  }, [damId, Math.floor(tick / 20)]) // eslint-disable-line react-hooks/exhaustive-deps

  const exportTable = () => {
    const rowsCsv = ['id,type,location,value,unit,status,last_reading', ...filtered.map((r) => [r.m.id, TYPE_META[r.m.type].label, `"${r.m.location}"`, Number.isFinite(r.value) ? r.value.toFixed(4) : '', TYPE_META[r.m.type].unit, r.state, r.at ? new Date(r.at).toISOString() : ''].join(','))]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rowsCsv.join('\n')], { type: 'text/csv' })); a.download = 'instrumentation.csv'; a.click(); URL.revokeObjectURL(a.href)
  }
  const running = !paused && intervalMs > 0
  const secs = Math.max(0, Math.round((clock - now) / 1000))
  const selMeta = TYPE_META[sel.m.type]

  return (
    <div className="space-y-6">
      <PageHeader title="Dam Safety Monitoring" subtitle="Monitor dam instrumentation, structural parameters and safety events." />

      {/* Dam Safety sub-navigation */}
      <div className="rounded-xl border border-[#DCE7EE] bg-white p-2">
        <div className="flex flex-wrap gap-2">
          {safetyNavigation.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.path} to={item.path} end={item.path === '/dam-safety'}
                className={({ isActive }) => `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-[#EAF7FD] text-[#0098DB]' : 'text-slate-600 hover:bg-[#EAF7FD] hover:text-[#102B3D]'}`}>
                <Icon size={17} />{item.label}<ChevronRight size={14} className="opacity-50" />
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Simulation notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={20} />
        <div>
          <h3 className="text-sm font-semibold text-amber-700">Simulated instrumentation data</h3>
          <p className="mt-1 text-sm text-slate-600">Readings, drift, communication gaps and warning bands on this page are synthetic. Warning bands are illustrative and are not approved dam-specific safety criteria. Stale or offline instruments are shown as unavailable, never interpreted as a safety alarm.</p>
        </div>
      </div>

      {/* Control bar */}
      <div className="sticky top-0 z-30 -mx-1 rounded-2xl border border-[#DCE7EE] bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select dam">
            {Object.values(PROFILES).map((d) => (
              <button key={d.id} onClick={() => setDamId(d.id)} aria-pressed={damId === d.id} className={`rounded-xl border px-4 py-2 text-left transition ${damId === d.id ? 'border-[#0098DB]/60 bg-[#0098DB]/10' : 'border-[#DCE7EE] bg-white hover:border-slate-600'}`}>
                <span className="block text-sm font-semibold text-[#102B3D]">{d.name}</span><span className="block text-[11px] text-slate-600">{d.river} · {d.type}</span>
              </button>
            ))}
          </div>
          <Segmented label="Range" value={range} onChange={setRange} options={(Object.keys(RANGES) as RangeKey[]).map((k) => ({ v: k, t: RANGES[k].label }))} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE7EE] pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-semibold text-amber-700">
              <span className="relative flex h-2 w-2"><span className={`absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70 ${running ? 'animate-ping' : ''}`} /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" /></span>
              {running ? 'SIMULATED LIVE FEED' : 'SIMULATION PAUSED'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600"><Clock size={13} />{new Date(clock).toLocaleTimeString('en-IN')}{secs > 0 ? '' : ''}</span>
            <span className="inline-flex items-center gap-1.5 text-slate-500"><Radio size={13} />{profile.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500" htmlFor="refresh">Refresh</label>
            <select id="refresh" value={intervalMs} onChange={(e) => setIntervalMs(+e.target.value)} className="rounded-lg border border-[#B8D5E5] bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-500">
              <option value={3000}>3 s</option><option value={10000}>10 s</option><option value={30000}>30 s</option><option value={0}>Off</option>
            </select>
            <button onClick={() => setPaused(!paused)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAF7FD] px-3 py-1.5 font-medium text-slate-700 transition hover:bg-[#D8F0FA]">{paused ? <Play size={13} /> : <Pause size={13} />}{paused ? 'Resume' : 'Pause'}</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Safety indicators">
        <Kpi label="Instrumentation" icon={Radio} color="#0098DB" value={`${online}/${total}`} unit="online" spark={complete}
          chip={{ text: `${fmt(dq, 0)}% healthy`, state: dq >= 95 ? 'normal' : dq >= 85 ? 'watch' : 'alert' }} sub={`${counts.stale} stale · ${counts.offline} offline`} />
        <Kpi label="Piezometric level (mean)" icon={Waves} color="#91D8F4" value={fmt(pzMean)} unit="m" spark={agg(mean, 'piezo')} chip={{ text: STATE_META[worst('piezo')].label, state: worst('piezo') }}
          delta={{ text: `${sgn(pzMean - pz24)}${fmt(pzMean - pz24)} m`, dir: dir(pzMean - pz24) }} sub={`Highest ${pzTop?.m.id} · ${fmt(pzTop?.value ?? NaN)} m`} />
        <Kpi label="Seepage (total)" icon={Activity} color="#34d399" value={fmt(swSum)} unit="L/s" spark={agg(sum, 'seep')} chip={{ text: STATE_META[worst('seep')].label, state: worst('seep') }}
          delta={{ text: `${sgn(swSum - sw24)}${fmt(swSum - sw24)} L/s`, dir: dir(swSum - sw24) }} sub={`${sw.length} seepage weirs`} />
        <Kpi label="Settlement (max)" icon={Gauge} color="#2dd4bf" value={fmt(seMax)} unit="mm" spark={agg((a) => Math.max(...a), 'settle')} chip={{ text: STATE_META[worst('settle')].label, state: worst('settle') }}
          sub={`Crack/joint drift max ${fmt(crMax, 3)} mm`} />
        <Kpi label="Active warnings" icon={AlertTriangle} color="#fbbf24" value={String(activeAlerts)} unit="instruments" spark={alertSpark} chip={{ text: counts.alert ? 'Alert' : counts.watch ? 'Watch' : 'Clear', state: counts.alert ? 'alert' : counts.watch ? 'watch' : 'normal' }}
          sub={`${counts.alert} alert · ${counts.watch} watch (illustrative)`} />
        <Kpi label="Data completeness" icon={ShieldCheck} color="#a78bfa" value={fmt(complete[complete.length - 1], 0)} unit="%" spark={complete} sub="Readings received this interval" />
      </section>

      {/* Row 1: status board, events, piezometric profile */}
      <section className="grid gap-5 xl:grid-cols-3">
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-[#102B3D]">Instrument status board</h3>
          <p className="mt-0.5 text-xs text-slate-600">{total} instruments · {profile.name}</p>
          <ReactECharts option={donut} style={{ height: 210 }} />
          <div className="grid grid-cols-5 gap-1.5 text-center text-[11px]">
            {(Object.keys(STATE_META) as State[]).map((k) => (
              <button key={k} onClick={() => setStateF(stateF === k ? 'all' : k)} className={`rounded-lg border py-2 transition ${stateF === k ? 'border-white/40 bg-[#EAF7FD]' : 'border-[#DCE7EE] bg-[#F5FAFD] hover:border-slate-600'}`}>
                <p className="text-lg font-semibold" style={{ color: STATE_META[k].color }}>{counts[k]}</p><p className="text-slate-500">{STATE_META[k].label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className={`${card} p-5`}>
          <div className="flex items-start justify-between gap-2">
            <div><h3 className="font-semibold text-[#102B3D]">Safety events</h3><p className="mt-0.5 text-xs text-slate-600">{openEvents} unacknowledged · simulated</p></div>
            <button onClick={() => setAcked(new Set(events.map((e) => e.id)))} className="rounded-md bg-[#EAF7FD] px-2.5 py-1.5 text-[11px] text-slate-700 transition hover:bg-[#D8F0FA]">Acknowledge all</button>
          </div>
          <ul className="mt-3 max-h-[19rem] space-y-2 overflow-y-auto pr-1">
            {events.slice(0, evShow).map((e) => (
              <li key={e.id} className={`flex items-start gap-3 rounded-lg border border-[#DCE7EE] bg-[#F8FBFD] p-2.5 text-xs ${acked.has(e.id) ? 'opacity-50' : ''}`}>
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${SEV[e.sev].chip}`}>{SEV[e.sev].label}</span>
                <div className="min-w-0 flex-1"><p className="text-slate-700">{e.text}</p><p className="mt-0.5 text-slate-500">{new Date(e.t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</p></div>
                {e.sev !== 'info' && !acked.has(e.id) && <button onClick={() => setAcked(new Set(acked).add(e.id))} className="shrink-0 rounded bg-[#EAF7FD] px-2 py-1 text-[10px] text-slate-700 hover:bg-[#D8F0FA]">Ack</button>}
              </li>
            ))}
            {events.length === 0 && <li className="text-xs text-slate-500">No events recorded.</li>}
          </ul>
          <div className="mt-3 flex items-center justify-between">
            {events.length > evShow ? <button onClick={() => setEvShow(evShow + 8)} className="text-xs text-slate-600 hover:text-[#102B3D]">Show more</button> : <span />}
            <NavLink to="/dam-safety/events" className="inline-flex items-center gap-1 text-sm font-medium text-[#0098DB] hover:text-[#087DB5]">View Safety Events<ChevronRight size={16} /></NavLink>
          </div>
        </div>

        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-[#102B3D]">Piezometric profile</h3>
          <p className="mt-0.5 text-xs text-slate-600">Current level per piezometer · bar colour = status</p>
          <ReactECharts option={profileOpt} style={{ height: 300 }} lazyUpdate />
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">{(['normal', 'watch', 'alert', 'stale', 'offline'] as State[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: STATE_META[k].color }} />{STATE_META[k].label}</span>)}</div>
        </div>
      </section>

      {/* Row 2: piezometer trends + scatter */}
      <section className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LinePanel title="Piezometric levels" subtitle="All piezometers against the reservoir level (right axis)" unit="m" unit2="m (reservoir)" badge={RANGES[range].label} accent="#0098DB" height={330}
            series={[...palette(pz), levelSeries]} />
        </div>
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-[#102B3D]">Seepage vs reservoir level</h3>
          <p className="mt-0.5 text-xs text-slate-600">Total seepage against level with trend line · {RANGES[range].label}</p>
          <ReactECharts option={scatterOpt} style={{ height: 390 }} lazyUpdate />
        </div>
      </section>

      {/* Row 3: seepage + deformation */}
      <section className="grid gap-5 xl:grid-cols-2">
        <LinePanel title="Seepage flow" subtitle="Per weir, with reservoir level" unit="L/s" unit2="m (reservoir)" badge={RANGES[range].label} accent="#91D8F4" decimals={2} series={[...palette(sw), levelSeries]} />
        <LinePanel title="Crack and joint movement" subtitle="Displacement per meter" unit="mm" badge={RANGES[range].label} accent="#fb923c" decimals={3} series={palette(cr)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <LinePanel title="Settlement and tilt" subtitle="Settlement points and inclinometers" unit="mm" badge={RANGES[range].label} accent="#2dd4bf" decimals={2} series={palette([...se, ...typed('incl')])} />
        <div className={`${card} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-[#102B3D]">Data completeness</h3><p className="mt-0.5 text-xs text-slate-600">Share of readings received per instrument, last 14 days</p></div><span className="rounded-full bg-violet-500/10 px-3 py-1 text-[11px] text-violet-700">Data quality</span></div>
          <ReactECharts option={heatOpt} style={{ height: Math.max(320, total * 15 + 90), width: '100%' }} lazyUpdate />
        </div>
      </section>

      {/* Dam instrument maintenance plan */}
      <section className={`${card} space-y-5 p-5`} aria-label="Dam instrument maintenance plan">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="text-[#0098DB]" size={21} />
              <h2 className="text-lg font-semibold text-[#102B3D]">Dam Instrument Maintenance</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Preventive maintenance and inspection schedule for dam instrumentation and control equipment.
            </p>
          </div>
          <span className="rounded-full border border-[#B8DFF0] bg-[#EAF7FD] px-3 py-1 text-xs font-medium text-[#087DB5]">
            {DAM_INSTRUMENT_MAINTENANCE.length} equipment items
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { code: 'A', title: 'Annual maintenance', desc: 'Comprehensive yearly maintenance', color: '#0098DB' },
            { code: 'H', title: 'Half-year inspection', desc: 'Inspection twice a year', color: '#8b5cf6' },
            { code: 'M', title: 'Monthly inspection', desc: 'Routine monthly checks', color: '#0d9488' },
            { code: 'Q', title: 'Quarterly maintenance', desc: 'Maintenance every quarter', color: '#d97706' },
          ].map((item) => (
            <div key={item.code} className="flex items-center gap-3 rounded-xl border border-[#DCE7EE] bg-[#F5FAFD] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold" style={{ color: item.color, backgroundColor: `${item.color}20` }}>{item.code}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#102B3D]">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#B8DFF0] bg-cyan-500/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#0098DB]" size={19} />
            <div>
              <h3 className="text-sm font-semibold text-[#102B3D]">Annual maintenance planning</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Keep a yearly maintenance record for every dam instrument, including inspection date, calibration or functional-check result, work performed, technician, and next due date. The annual maintenance dates are not specified in the supplied schedule, so they are left for the maintenance team to confirm.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[#102B3D]">Maintenance calendar</h3>
              <p className="mt-0.5 text-xs text-slate-600">Schedule transcribed from the supplied maintenance note.</p>
            </div>
            <span className="text-xs text-slate-500">Month-wise view</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#DCE7EE]">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-medium">Instrument / equipment</th>
                  {MAINTENANCE_MONTHS.map((month) => <th key={month} className="px-4 py-3 text-center font-medium">{month}</th>)}
                </tr>
              </thead>
              <tbody>
                {DAM_INSTRUMENT_MAINTENANCE.map((item) => (
                  <tr key={item.instrument} className="border-t border-[#DCE7EE]/70 hover:bg-[#EAF7FD]/30">
                    <td className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-700">{item.instrument}</td>
                    {MAINTENANCE_MONTHS.map((month) => {
                      const mark = item.schedule[month]
                      const colors: Record<MaintenanceMark, string> = {
                        A: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
                        H: 'bg-violet-500/15 text-violet-700 border-violet-500/30',
                        M: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
                        Q: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
                        '—': 'text-slate-600',
                      }
                      return <td key={month} className="px-4 py-3 text-center"><span className={`inline-flex min-w-7 items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold ${colors[mark]}`}>{mark}</span></td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            A = Annual maintenance · H = Half-year inspection · M = Monthly inspection · Q = Quarterly maintenance · — = No activity marked in the supplied note.
          </p>
        </div>
      </section>

      {/* Instrument inventory */}
      <section className={`${card} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3"><ShieldCheck className="text-[#0098DB]" size={22} /><div><h3 className="font-semibold text-[#102B3D]">Instrument health</h3><p className="mt-0.5 text-xs text-slate-600">Availability, last reading, data quality and status · {filtered.length} of {total} shown</p></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ID or location" aria-label="Search instruments" className="w-48 rounded-lg border border-[#B8D5E5] bg-white py-2 pl-8 pr-3 text-xs text-[#102B3D] outline-none focus:border-cyan-500" /></div>
            <select value={typeF} onChange={(e) => setTypeF(e.target.value as any)} aria-label="Filter by type" className="rounded-lg border border-[#B8D5E5] bg-white px-2 py-2 text-xs text-slate-700 outline-none focus:border-cyan-500">
              <option value="all">All types</option>{(Object.keys(TYPE_META) as InstType[]).map((k) => <option key={k} value={k}>{TYPE_META[k].label}</option>)}
            </select>
            <select value={stateF} onChange={(e) => setStateF(e.target.value as any)} aria-label="Filter by status" className="rounded-lg border border-[#B8D5E5] bg-white px-2 py-2 text-xs text-slate-700 outline-none focus:border-cyan-500">
              <option value="all">All statuses</option>{(Object.keys(STATE_META) as State[]).map((k) => <option key={k} value={k}>{STATE_META[k].label}</option>)}
            </select>
            <button onClick={exportTable} className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAF7FD] px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-[#D8F0FA]"><Download size={13} />CSV</button>
          </div>
        </div>
        <div className="mt-4 max-h-[26rem] overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white text-[10px] uppercase tracking-wider text-slate-500">
              <tr><th className="py-2 font-medium">Instrument</th><th className="py-2 font-medium">Type · location</th><th className="py-2 text-right font-medium">Reading</th><th className="py-2 text-right font-medium">24 h change</th><th className="py-2 pl-4 font-medium">7-day trend</th><th className="py-2 text-right font-medium">Last reading</th><th className="py-2 text-right font-medium">Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const meta = TYPE_META[r.m.type], unavailable = r.state === 'stale' || r.state === 'offline'
                return (
                  <tr key={r.m.id} onClick={() => setSelId(r.m.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelId(r.m.id)} className={`cursor-pointer border-t border-[#DCE7EE]/70 transition hover:bg-[#EAF7FD]/40 ${sel.m.id === r.m.id ? 'bg-[#0098DB]/5' : ''}`}>
                    <td className="py-2.5 font-medium text-[#102B3D]"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: meta.color }} />{r.m.id}</td>
                    <td className="py-2.5 text-xs text-slate-600">{meta.label} · {r.m.location}</td>
                    <td className={`py-2.5 text-right tabular-nums ${unavailable ? 'text-slate-500' : 'text-slate-100'}`}>{fmt(r.value, meta.dec)} <span className="text-xs text-slate-500">{meta.unit}</span>{unavailable && <span className="ml-1 text-[10px] text-slate-500">(last known)</span>}</td>
                    <td className="py-2.5 text-right text-xs tabular-nums text-slate-600">{Number.isFinite(r.d24) ? `${sgn(r.d24)}${fmt(r.d24, meta.dec)}` : '–'}</td>
                    <td className="w-36 py-2.5 pl-4"><Sparkline data={r.spark} color={STATE_META[r.state].color} h={24} /></td>
                    <td className="py-2.5 text-right text-xs text-slate-600">{r.at ? ago(now - r.at) : 'never'}</td>
                    <td className="py-2.5 text-right"><span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATE_META[r.state].chip}`}>{STATE_META[r.state].label}</span></td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-500">No instruments match the filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <NavLink to="/dam-safety/instrumentation" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#0098DB] hover:text-[#087DB5]">View Instrumentation<ChevronRight size={16} /></NavLink>
      </section>

      {/* Instrument detail */}
      <section className="space-y-4" aria-label="Selected instrument">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-[#102B3D]">{sel.m.id} · {selMeta.label}</h2><p className="text-xs text-slate-600">{sel.m.location} · last reading {sel.at ? ago(now - sel.at) : 'never'}</p></div>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STATE_META[sel.state].chip}`}>{STATE_META[sel.state].label}{sel.state === 'stale' || sel.state === 'offline' ? ' · not an alarm' : ''}</span>
        </div>
        <div className="grid gap-5 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <LinePanel title="Reading history" subtitle="Shaded bands: normal, watch, alert (illustrative)" unit={selMeta.unit} unit2="m (reservoir)" badge={RANGES[range].label} accent={selMeta.color} decimals={selMeta.dec} statsIdx={0} bands={detail.bands}
              refLines={[{ value: sel.m.hi, label: 'baseline max', color: '#64748B' }, { value: sel.m.lo, label: 'baseline min', color: '#64748B' }]}
              series={[{ name: sel.m.id, color: selMeta.color, data: seriesOf(sel.m.v) }, levelSeries]} />
          </div>
          <div className={`${card} p-5`}>
            <h3 className="font-semibold text-[#102B3D]">Diagnostics</h3>
            <dl className="mt-3 space-y-3 text-sm">
              {[['Current', `${fmt(sel.value, selMeta.dec)} ${selMeta.unit}`], ['Baseline band', `${fmt(sel.m.lo, selMeta.dec)} to ${fmt(sel.m.hi, selMeta.dec)}`], ['Watch beyond', `±${fmt(sel.m.span * 0.25, selMeta.dec)} of band`], ['Alert beyond', `±${fmt(sel.m.span * 0.6, selMeta.dec)} of band`], ['Correlation with level', Number.isNaN(detail.r) ? '–' : `r = ${detail.r.toFixed(2)}`], ['Mode', sel.m.mode === 'live' ? 'Reporting' : sel.m.mode === 'stale' ? 'Delayed (simulated)' : 'Not reporting (simulated)']].map(([l, v]) => (
                <div key={l} className="flex items-start justify-between gap-3 border-b border-[#DCE7EE] pb-2 last:border-0"><dt className="text-slate-600">{l}</dt><dd className="text-right font-medium text-slate-100">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-4 rounded-lg border border-[#DCE7EE] bg-[#F5FAFD] p-3 text-[11px] leading-5 text-slate-600">Baseline band = range of the first 20 days of the simulated history. Real limits must come from the dam&apos;s approved instrumentation and safety criteria.</p>
          </div>
        </div>
      </section>

      {/* Safety information */}
      <div className={`${card} p-5`}>
        <div className="flex items-center gap-3"><CheckCircle2 className="text-[#0098DB]" size={21} /><h3 className="font-semibold text-[#102B3D]">Safety Monitoring Information</h3></div>
        <p className="mt-3 text-sm leading-6 text-slate-600">Dam safety monitoring requires verified instrumentation readings and approved engineering limits for each dam. Missing or outdated readings are shown as unavailable, not interpreted as a safety alarm. Automated monitoring supports, and does not replace, routine inspections and qualified engineering review.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE7EE] pt-5 text-xs text-slate-500">
        <p>SMART DAM 360 · Dam Safety Monitoring</p>
        <p>Simulated dataset · all values illustrative · not for operational decisions or safety assessment</p>
      </div>
    </div>
  )
}