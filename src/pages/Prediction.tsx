

import { useEffect, useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity, AlertTriangle, BrainCircuit, CalendarDays, CheckCircle2, ChevronDown, Clock, CloudRain, Droplets, Gauge, Info,
  Layers3, MapPin, RadioTower, ShieldAlert, Target, TrendingUp, Waves, Wind, Zap,
} from 'lucide-react'

// ============================================================================
// 1.                 + MACHINE-LEARNING CORE
// ============================================================================
type DamKey = 'Tawa Dam' | 'Bansagar Dam'
interface Dam { key: DamKey; base: number; frl: number; ref: number; area: number; qBase: number; qRel: number; gain: number; seed: number }
const DAMS: Record<DamKey, Dam> = {
  'Tawa Dam': { key: 'Tawa Dam', base: 354.19, frl: 358.75, ref: 356.2, area: 1.8e7, qBase: 325, qRel: 325, gain: 230, seed: 7 },
  'Bansagar Dam': { key: 'Bansagar Dam', base: 340.82, frl: 341.64, ref: 341.5, area: 4.5e7, qBase: 436, qRel: 436, gain: 300, seed: 19 },
}
const N_HIST = 120 * 24, H_TRAIN = 90 * 24, FUT = 168, HOUR =            0e3
const LEADS = [6, 12, 24, 48, 72, 120, 168]
const SCEN = { normal: 1, heavy: 1.6, extreme: 2.4 } as const
type ScenKey = keyof typeof SCEN

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
function rng(seed: number) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r())

interface Data { issue: number; rain: number[]; api: number[]; q: number[]; level: number[] }
function genData(d: Dam, issue: number): Data {
  const N = N_HIST + FUT, r = rng(d.seed * 977)
  const rain = new Array<number>(N).fill(0)
  for (let day = 0; day < N / 24; day++) if (r() < 0.2) {
    const start = day * 24 + Math.floor(r() * 20), dur = 3 + Math.floor(r() * 12), peak = Math.exp(1.3 + 0.8 * gauss(r))
    for (let j = 0; j < dur && start + j < N; j++) rain[start + j] += peak * Math.pow(Math.sin((Math.PI * (j + 0.5)) / dur), 2) * (0.7 + 0.6 * r())
  }
  for (const day of [93, 99, 106, 112, 117]) { const st = day * 24 + Math.floor(r() * 14), du = 6 + Math.floor(r() * 8), pk = 5 + 8 * r(); for (let j = 0; j < du; j++) rain[st + j] += pk * Math.pow(Math.sin((Math.PI * (j + 0.5)) / du), 2) }
  const fs = N_HIST + 14 + Math.floor(r() * 24)
  for (let j = 0; j < 10; j++) rain[fs + j] += (6 + 4 * r()) * Math.pow(Math.sin((Math.PI * (j + 0.5)) / 10), 2)
  for (let t = 0; t < N; t++) { if (r() < 0.04) rain[t] += r() * 0.6; rain[t] = Math.min(45, rain[t]) }
  const api: number[] = [], q: number[] = []
  let a = 10, q1 = 0, q2 = 0
  for (let t = 0; t < N; t++) {
    a = a * 0.985 + rain[t]; api.push(a)
    const c = 0.1 + 0.45 / (1 + Math.exp(-(a - 30) / 12))
    q1 += (c * rain[t] * d.gain - q1) / 5; q2 += (q1 - q2) / 9
    const hr = new Date(issue + (t - (N_HIST - 1)) * HOUR).getHours()
    q.push(d.qBase * (0.88 + 0.1 * Math.sin((2 * Math.PI * (hr - 6)) / 24)) + d.qBase * 0.12 * clamp(a / 40, 0, 2) + q2 + (r() - 0.5) * d.qBase * 0.03)
  }
  const level = [d.base - 0.2]
  for (let t = 0; t < N_HIST - 1; t++) {
    const rel = d.qRel * (1 + 2 * clamp((level[t] - (d.base - 0.3)) / 2, 0, 1))
    level.push(clamp(level[t] + ((q[t] - rel) *            0) / d.area, d.base - 4, d.frl + 0.3))
  }
  const fix = d.base - level[N_HIST - 1]
  for (let t = 0; t < N_HIST; t++) level[t] += fix * (t / (N_HIST - 1))
  return { issue, rain, api, q, level }
}

const FEATURES = ['Inflow now', 'Inflow 3 h ago', 'Inflow 6 h ago', 'Inflow 12 h ago', 'Inflow 24 h ago', 'Rain next hour', 'Rain this hour', 'Rain 3 h', 'Rain 6 h', 'Rain 12 h', 'Rain 24 h', 'Rain 48 h', 'Soil wetness index', 'Wetness × rain 6 h', 'Time of day (sin)', 'Time of day (cos)']
const sumR = (a: number[], from: number, to: number) => { let s = 0; for (let i = Math.max(0, from); i <= to; i++) s += a[i]; return s }
function feats(q: number[], rain: number[], api: number, t: number, hr: number): number[] {
  const g = (i: number) => q[Math.max(0, i)]
  return [g(t), g(t - 2), g(t - 5), g(t - 11), g(t - 23), rain[t + 1], rain[t], sumR(rain, t - 2, t), sumR(rain, t - 5, t), sumR(rain, t - 11, t), sumR(rain, t - 23, t), sumR(rain, t - 47, t), api, (api * sumR(rain, t - 5, t)) / 100, Math.sin((2 * Math.PI * hr) / 24), Math.cos((2 * Math.PI * hr) / 24)]
}

interface Model { mu: number[]; sd: number[]; w: number[]; b: number; sigRel: number; lambda: number; nTrain: number; r2Train: number; r2Test: number; trainedAt: number }
function solve(A: number[][], y: number[]) {
  const n = y.length, M = A.map((row, i) => [...row, y[i]])
  for (let i = 0; i < n; i++) {
    let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k
    ;[M[i], M[p]] = [M[p], M[i]]
    for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j] }
  }
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i] }
  return x
}
const hrAt = (issue: number, t: number) => new Date(issue + (t - (N_HIST - 1)) * HOUR).getHours()

function train(data: Data, lambda = 3): Model {
  const X: number[][] = [], Y: number[] = [], idx: number[] = []
  for (let t = 48; t < H_TRAIN - 1; t++) { X.push(feats(data.q, data.rain, data.api[t], t, hrAt(data.issue, t))); Y.push(data.q[t + 1]); idx.push(t) }
  const p = X[0].length, n = X.length
  const mu = new Array<number>(p).fill(0), sd = new Array<number>(p).fill(0)
  X.forEach((r) => r.forEach((v, j) => (mu[j] += v / n)))
  X.forEach((r) => r.forEach((v, j) => (sd[j] += (v - mu[j]) ** 2 / n)))
  for (let j = 0; j < p; j++) sd[j] = Math.sqrt(sd[j]) || 1
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]))
  const ym = Y.reduce((a, b) => a + b, 0) / n
  const A = Array.from({ length: p }, () => new Array<number>(p).fill(0)), yv = new Array<number>(p).fill(0)
  Z.forEach((r, i) => { for (let a = 0; a < p; a++) { yv[a] += r[a] * (Y[i] - ym); for (let b = a; b < p; b++) A[a][b] += r[a] * r[b] } })
  for (let a = 0; a < p; a++) { for (let b = 0; b < a; b++) A[a][b] = A[b][a]; A[a][a] += lambda }
  const w = solve(A, yv)
  const pred = (z: number[]) => ym + z.reduce((s, v, j) => s + v * w[j], 0)
  let sse = 0, sst = 0; const rel: number[] = []
  Z.forEach((r, i) => { const e = Y[i] - pred(r); sse += e * e; sst += (Y[i] - ym) ** 2; rel.push(e / Math.max(Y[i], 50)) })
  const rm = rel.reduce((a, b) => a + b, 0) / rel.length
  const sigRel = Math.sqrt(rel.reduce((a, b) => a + (b - rm) ** 2, 0) / rel.length)
  const model: Model = { mu, sd, w, b: ym, sigRel, lambda, nTrain: n, r2Train: 1 - sse / sst, r2Test: 0, trainedAt: Date.now() }
  let se2 = 0, st2 = 0, mt = 0, cnt = 0
  for (let t = H_TRAIN; t < N_HIST - 1; t++) { mt += data.q[t + 1]; cnt++ }
  mt /= cnt
  for (let t = H_TRAIN; t < N_HIST - 1; t++) { const e = data.q[t + 1] - one(model, feats(data.q, data.rain, data.api[t], t, hrAt(data.issue, t))); se2 += e * e; st2 += (data.q[t + 1] - mt) ** 2 }
  model.r2Test = 1 - se2 / st2
  return model
}
const one = (m: Model, x: number[]) => m.b + x.reduce((s, v, j) => s + ((v - m.mu[j]) / m.sd[j]) * m.w[j], 0)

function rollout(m: Model, qMin: number, qh: number[], rh: number[], api0: number, rainFut: number[], hr0: number, noise?: () => number): number[] {
  const q = qh.slice(-48), r = [...rh.slice(-48), ...rainFut], p0 = q.length - 1, out: number[] = []
  let api = api0
  for (let k = 0; k < rainFut.length; k++) {
    let y = one(m, feats(q, r, api, p0 + k, (hr0 + k + 1) % 24))
    if (noise) y *= 1 + noise() * m.sigRel
    y = Math.max(qMin, y); q.push(y); out.push(y); api = api * 0.985 + r[p0 + k + 1]
  }
  return out
}

function nwpMember(truth: number[], r: () => number, mult: number): number[] {
  let z = 0
  return truth.map((_, k) => {
    z = 0.8 * z + 0.6 * gauss(r)
    const sig = Math.min(1, 0.18 + 0.008 * (k + 1)), shift = Math.round(gauss(r) * ((k + 1) / 36) * 0.5)
    const v = truth[clamp(k + shift, 0, truth.length - 1)] * Math.exp(sig * z - (sig * sig) / 2)
    return Math.max(0, v * mult)
  })
}

const quantile = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo) }

interface Ens { q: number[][]; lvl: number[][]; rain: number[][] }
function runEnsemble(d: Dam, data: Data, m: Model, mult: number, rel: number, members = 100): Ens {
  const truth = data.rain.slice(N_HIST), t0 = N_HIST - 1, hr0 = hrAt(data.issue, t0)
  const out: Ens = { q: [], lvl: [], rain: [] }
  for (let k = 0; k < members; k++) {
    const r = rng(1000 + k * 31 + d.seed)
    const rf = nwpMember(truth, r, mult), nz = rng(5000 + k * 17)
    const q = rollout(m, d.qBase * 0.3, data.q.slice(0, t0 + 1), data.rain.slice(0, t0 + 1), data.api[t0], rf, hr0, () => gauss(nz))
    const lv: number[] = []; let L = d.base
    q.forEach((x) => { L = clamp(L + ((x - rel) *            0) / d.area, d.base - 4, d.frl + 1); lv.push(L) })
    out.q.push(q); out.lvl.push(lv); out.rain.push(rf)
  }
  return out
}

interface Perf { lead: number; rmse: number; mae: number; nse: number; bias: number; persist: number; skill: number }
interface Backtest { perf: Perf[]; t: number[]; obs: number[]; pred: number[] }
function backtest(d: Dam, data: Data, m: Model): Backtest {
  const r = rng(d.seed * 31 + 5), maxL = 168
  const err: Record<number, { e: number[]; o: number[]; p: number[]; pe: number[] }> = {}
  LEADS.forEach((l) => (err[l] = { e: [], o: [], p: [], pe: [] }))
  for (let t0 = H_TRAIN + 48; t0 < N_HIST - maxL - 1; t0 += 6) {
    const truth = data.rain.slice(t0 + 1, t0 + 1 + maxL), rf = nwpMember(truth, r, 1)
    const out = rollout(m, d.qBase * 0.3, data.q.slice(0, t0 + 1), data.rain.slice(0, t0 + 1), data.api[t0], rf, hrAt(data.issue, t0))
    LEADS.forEach((l) => { const o = data.q[t0 + l], p = out[l - 1]; err[l].e.push(p - o); err[l].o.push(o); err[l].p.push(p); err[l].pe.push(data.q[t0] - o) })
  }
  const all = data.q.slice(H_TRAIN, N_HIST), mo = all.reduce((a, b) => a + b, 0) / all.length, sst = all.reduce((a, b) => a + (b - mo) ** 2, 0) / all.length
  const perf = LEADS.map((l) => {
    const e = err[l].e, n = e.length, rmse = Math.sqrt(e.reduce((a, b) => a + b * b, 0) / n), mae = e.reduce((a, b) => a + Math.abs(b), 0) / n
    const persist = Math.sqrt(err[l].pe.reduce((a, b) => a + b * b, 0) / n), mean = err[l].o.reduce((a, b) => a + b, 0) / n
    return { lead: l, rmse, mae, nse: 1 - (rmse * rmse) / sst, bias: (e.reduce((a, b) => a + b, 0) / n / mean) * 100, persist, skill: 1 - rmse / persist }
  })
  const t: number[] = [], obs: number[] = [], pred: number[] = []
  for (let t0 = N_HIST - 14 * 24 - 25; t0 < N_HIST - 25; t0 += 3) {
    const rf = nwpMember(data.rain.slice(t0 + 1, t0 + 25), r, 1)
    const out = rollout(m, d.qBase * 0.3, data.q.slice(0, t0 + 1), data.rain.slice(0, t0 + 1), data.api[t0], rf, hrAt(data.issue, t0))
    t.push(data.issue + (t0 + 24 - (N_HIST - 1)) * HOUR); obs.push(data.q[t0 + 24]); pred.push(out[23])
  }
  return { perf, t, obs, pred }
}

function psi(a: number[], b: number[], bins = 8) {
  const edges = Array.from({ length: bins - 1 }, (_, i) => quantile(a, (i + 1) / bins))
  const hist = (x: number[]) => { const h = new Array<number>(bins).fill(0); x.forEach((v) => { let k = 0; while (k < edges.length && v > edges[k]) k++; h[k]++ }); return h.map((c) => Math.max(c / x.length, 1e-4)) }
  const pa = hist(a), pb = hist(b)
  return pa.reduce((s, v, i) => s + (pb[i] - v) * Math.log(pb[i] / v), 0)
}

// ============================================================================
// PAGE
// ============================================================================
const BRAND = '#0098DB', LIGHT = '#91D8F4', INK = '#0f172a', MUTE = '#64748b', GRID = '#e2e8f0'
const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm'
const HORIZONS: { label: string; h: number }[] = [{ label: '6 Hours', h: 6 }, { label: '24 Hours', h: 24 }, { label: '72 Hours', h: 72 }, { label: '7 Days', h: 168 }]
const SCEN_META: Record<ScenKey, { title: string; caption: string; icon: LucideIcon; color: string }> = {
  normal: { title: 'Baseline scenario', caption: 'Generated rainfall series', icon: CloudRain, color: BRAND },
  heavy: { title: 'Heavy rainfall', caption: '1.6× generated rainfall', icon: Waves, color: '#f59e0b' },
  extreme: { title: 'Extreme rainfall', caption: '2.4× generated rainfall', icon: AlertTriangle, color: '#ef4444' },
}
const RISK = (v: number) => (v < 25 ? { label: 'Low', c: '#10b981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' } : v < 50 ? { label: 'Moderate', c: '#f59e0b', bg: 'bg-amber-50 text-amber-700 border-amber-200' } : v < 75 ? { label: 'High', c: '#f97316', bg: 'bg-orange-50 text-orange-700 border-orange-200' } : { label: 'Severe', c: '#ef4444', bg: 'bg-red-50 text-red-700 border-red-200' })

const f = (v: number, d = 0) => (Number.isFinite(v) ? v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }) : '–')
const tfmt = (ts: number, o: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) => new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...o })
// const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
const pctRank = (arr: number[], v: number) => (arr.filter((x) => x <= v).length / arr.length) * 100

interface Stat { pkQ: number[]; pkL: number[]; endL: number[]; rain: number[]; pEx: number; exBy: number[]; medFirst: number | null; risk: number; qS: Q5[]; lS: Q5[]; rS: Q5[]; cum: Q5[] }
interface Q5 { p05: number; p10: number; p50: number; p90: number; p95: number }
const q5 = (a: number[]): Q5 => ({ p05: quantile(a, 0.05), p10: quantile(a, 0.1), p50: quantile(a, 0.5), p90: quantile(a, 0.9), p95: quantile(a, 0.95) })

function stat(e: Ens, d: Dam, h: number): Stat {
  const n = e.q.length
  const pkQ = e.q.map((q) => Math.max(...q.slice(0, h))), pkL = e.lvl.map((l) => Math.max(...l.slice(0, h))), endL = e.lvl.map((l) => l[h - 1])
  const rain = e.rain.map((r) => r.slice(0, h).reduce((a, b) => a + b, 0))
  const firsts = e.lvl.map((l) => l.slice(0, h).findIndex((x) => x >= d.ref))
  const exBy = Array.from({ length: 168 }, (_, k) => e.lvl.filter((l) => Math.max(...l.slice(0, k + 1)) >= d.ref).length / n)
  const ex = firsts.filter((x) => x >= 0)
  const pEx = ex.length / n
  const scale = 150 * Math.pow(h / 72, 0.6)
  const risk = Math.round(100 * (0.55 * pEx + 0.25 * clamp((quantile(pkL, 0.9) - (d.ref - 1)) / 1.5, 0, 1) + 0.2 * clamp(quantile(rain, 0.9) / scale, 0, 1)))
  const cum = Array.from({ length: h }, (_, k) => q5(e.rain.map((r) => r.slice(0, k + 1).reduce((a, b) => a + b, 0))))
  return {
    pkQ, pkL, endL, rain, pEx, exBy, medFirst: ex.length ? quantile(ex, 0.5) + 1 : null, risk,
    qS: Array.from({ length: h }, (_, k) => q5(e.q.map((q) => q[k]))), lS: Array.from({ length: h }, (_, k) => q5(e.lvl.map((l) => l[k]))), rS: Array.from({ length: h }, (_, k) => q5(e.rain.map((r) => r[k]))), cum,
  }
}

function Segmented<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; t: string }[]; label?: string }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      {label && <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {options.map((o) => <button key={String(o.v)} type="button" onClick={() => onChange(o.v)} aria-pressed={value === o.v} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${value === o.v ? 'bg-[#0098DB] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{o.t}</button>)}
      </div>
    </div>
  )
}

function Spark({ data, color = BRAND }: { data: number[]; color?: string }) {
  const id = useId(), w = 120, h = 28, mn = Math.min(...data), sp = Math.max(...data) - mn || 1
  const xy = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - mn) / sp) * (h - 6)])
  const line = 'M' + xy.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} /><path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Metric({ title, value, unit, detail, icon: Icon, tone, chip }: { title: string; value: string; unit?: string; detail: string; icon: LucideIcon; tone: string; chip?: { t: string; cls: string } }) {
  return (
    <div className={`${card} min-w-0 p-4 transition hover:border-sky-200 hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{title}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5"><span className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">{value}</span>{unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}</div></div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={19} /></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500"><span>{detail}</span>{chip && <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${chip.cls}`}>{chip.t}</span>}</div>
    </div>
  )
}

function Title({ eyebrow, title, desc, right }: { eyebrow?: string; title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>{eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0098DB]">{eyebrow}</p>}<h2 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>{desc && <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>}</div>
      {right}
    </div>
  )
}

const axisX = () => ({ type: 'time', axisLine: { lineStyle: { color: '#cbd5e1' } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontSize: 10, hideOverlap: true }, splitLine: { show: false } })
const axisY = (name: string, extra: any = {}) => ({ type: 'value', name, nameTextStyle: { color: MUTE, fontSize: 10 }, scale: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: MUTE, fontSize: 10 }, splitLine: { lineStyle: { color: GRID, type: 'dashed' } }, ...extra })
const tip = (formatter?: any) => ({ trigger: 'axis', backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { color: INK, fontSize: 11 }, extraCssText: 'box-shadow:0 8px 24px rgba(15,23,42,.12)', axisPointer: { type: 'line', lineStyle: { color: '#94a3b8' } }, formatter })
const base = () => ({ backgroundColor: 'transparent', animationDuration: 500, grid: { left: 8, right: 14, top: 36, bottom: 26, containLabel: true }, legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 5, icon: 'roundRect', textStyle: { color: MUTE, fontSize: 10 } } })
const band = (name: string, color: string, lo: [number, number][], hi: [number, number][], op: number, stack: string) => [
  { name: name + '-lo', type: 'line', data: lo, stack, symbol: 'none', lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false } },
  { name, type: 'line', data: hi.map((p, i) => [p[0], p[1] - lo[i][1]]), stack, symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color, opacity: op }, silent: true, tooltip: { show: false } },
]

export default function Prediction() {
  const [damKey, setDamKey] = useState<DamKey>('Tawa Dam')
  const [h, setH] = useState(72)
  const [scen, setScen] = useState<ScenKey>('normal')
  const [wide, setWide] = useState(false)
  const [members, setMembers] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const [tick, setTick] = useState(0)
  const dam = DAMS[damKey]
  const [release, setRelease] = useState(dam.qRel)
  useEffect(() => { setRelease(DAMS[damKey].qRel) }, [damKey])
  useEffect(() => { const a = setInterval(() => setClock(Date.now()), 1000), b = setInterval(() => setTick((x) => x + 1), 3000); return () => { clearInterval(a); clearInterval(b) } }, [])

  const issue = useMemo(() => Math.floor(Date.now() / HOUR) * HOUR, [])
  const data = useMemo(() => genData(dam, issue), [dam, issue])
  const model = useMemo(() => train(data), [data])
  const bt = useMemo(() => backtest(dam, data, model), [dam, data, model])
  const ens = useMemo(() => ({ normal: runEnsemble(dam, data, model, SCEN.normal, release), heavy: runEnsemble(dam, data, model, SCEN.heavy, release), extreme: runEnsemble(dam, data, model, SCEN.extreme, release) }), [dam, data, model, release])
  const S = useMemo(() => ({ normal: stat(ens.normal, dam, h), heavy: stat(ens.heavy, dam, h), extreme: stat(ens.extreme, dam, h) }), [ens, dam, h])
  const cur = S[scen], risk = RISK(cur.risk)
  const perf24 = bt.perf.find((p) => p.lead === 24)!

  // release planning: P90 peak level vs planned release
  const plan = useMemo(() => {
    const cand = Array.from({ length: 17 }, (_, i) => dam.qRel + i * 50)
    const rows = cand.map((rel) => { const e = runEnsemble(dam, data, model, SCEN[scen], rel, 40); const pk = e.lvl.map((l) => Math.max(...l.slice(0, h))); return { rel, p50: quantile(pk, 0.5), p90: quantile(pk, 0.9) } })
    const ok = rows.find((r) => r.p90 < dam.ref - 0.05)
    return { rows, rec: ok ? ok.rel : null }
  }, [dam, data, model, scen, h])

  // chart data
  const T = (k: number) => issue + (k + 1) * HOUR
  const past = (arr: number[], n = 48) => arr.slice(N_HIST - n, N_HIST).map((v, i) => [issue + (i - (n - 1)) * HOUR, +v.toFixed(2)] as [number, number])
  const series = (list: Q5[], k: keyof Q5) => list.map((x, i) => [T(i), +x[k].toFixed(2)] as [number, number])
  const nowMark = { symbol: 'none', silent: true, animation: false, data: [{ xAxis: issue, lineStyle: { color: '#64748b', type: 'solid', width: 1 }, label: { formatter: 'Issued', color: MUTE, fontSize: 10, position: 'insideStartTop' } }] }

  const tipFor = (name: string, unit: string, list: Q5[], obs: number[], d = 1) => (p: any) => {
    const ts = p[0].value[0], k = Math.round((ts - issue) / HOUR) - 1
    const head = `<b>${tfmt(ts)}</b>`
    if (k >= 0 && k < list.length) { const q = list[k]; return `${head}<br/>${name} P50 <b>${f(q.p50, d)}</b> ${unit}<br/><span style="color:${MUTE}">P10–P90: ${f(q.p10, d)} – ${f(q.p90, d)}</span><br/><span style="color:${MUTE}">P05–P95: ${f(q.p05, d)} – ${f(q.p95, d)}</span>` }
    const i = N_HIST - 1 + Math.round((ts - issue) / HOUR); return `${head}<br/>Observed <b>${f(obs[i], d)}</b> ${unit}`
  }

  const inflowOpt: any = useMemo(() => ({
    ...base(), tooltip: tip(tipFor('Inflow', 'm³/s', cur.qS, data.q, 0)), xAxis: axisX(), yAxis: axisY('m³/s'), animation: false,
    series: [
      ...(wide ? band('P05–P95', LIGHT, series(cur.qS, 'p05'), series(cur.qS, 'p95'), 0.25, 'w') : []),
      ...band('P10–P90', BRAND, series(cur.qS, 'p10'), series(cur.qS, 'p90'), 0.22, 'n'),
      { name: 'Observed', type: 'line', data: past(data.q), symbol: 'none', lineStyle: { color: INK, width: 2 }, markLine: nowMark },
      { name: 'Forecast (median)', type: 'line', data: series(cur.qS, 'p50'), symbol: 'none', lineStyle: { color: BRAND, width: 2.6 } },
      ...(members ? ens[scen].q.slice(0, 14).map((q, i) => ({ name: 'm' + i, type: 'line', data: q.slice(0, h).map((v, k) => [T(k), +v.toFixed(0)]), symbol: 'none', lineStyle: { color: BRAND, width: 0.7, opacity: 0.25 }, silent: true, tooltip: { show: false } })) : []),
    ],
  }), [cur, data, wide, members, scen, h, ens]) // eslint-disable-line react-hooks/exhaustive-deps

  const levelOpt: any = useMemo(() => ({
    ...base(), tooltip: tip(tipFor('Level', 'm', cur.lS, data.level, 2)), xAxis: axisX(), yAxis: axisY('m', { min: (v: any) => Math.floor((v.min - 0.2) * 10) / 10, max: (v: any) => Math.ceil((Math.max(v.max, dam.ref + 0.3)) * 10) / 10 }),
    series: [
      ...(wide ? band('P05–P95', LIGHT, series(cur.lS, 'p05'), series(cur.lS, 'p95'), 0.25, 'w') : []),
      ...band('P10–P90', BRAND, series(cur.lS, 'p10'), series(cur.lS, 'p90'), 0.22, 'n'),
      { name: 'Observed', type: 'line', data: past(data.level), symbol: 'none', lineStyle: { color: INK, width: 2 }, markLine: { ...nowMark, data: [...nowMark.data, { yAxis: dam.ref, lineStyle: { color: '#ef4444', type: 'dashed' }, label: { formatter: `Illustrative reference ${dam.ref.toFixed(2)} m`, color: '#ef4444', fontSize: 10, position: 'insideStartTop' } }] } },
      { name: 'Forecast (median)', type: 'line', data: series(cur.lS, 'p50'), symbol: 'none', lineStyle: { color: BRAND, width: 2.6 } },
      ...(members ? ens[scen].lvl.slice(0, 14).map((l, i) => ({ name: 'm' + i, type: 'line', data: l.slice(0, h).map((v, k) => [T(k), +v.toFixed(2)]), symbol: 'none', lineStyle: { color: BRAND, width: 0.7, opacity: 0.25 }, silent: true, tooltip: { show: false } })) : []),
    ],
  }), [cur, data, wide, members, scen, h, ens, dam]) // eslint-disable-line react-hooks/exhaustive-deps

  const rainOpt: any = useMemo(() => ({
    ...base(), tooltip: tip(tipFor('Rain', 'mm/h', cur.rS, data.rain, 1)), xAxis: axisX(),
    yAxis: [axisY('mm/h', { scale: false, min: 0 }), axisY('mm total', { scale: false, min: 0, splitLine: { show: false } })],
    series: [
      { name: 'Observed', type: 'bar', data: past(data.rain), itemStyle: { color: INK, opacity: 0.75 }, barMaxWidth: 7, markLine: nowMark },
      { name: 'Forecast P50', type: 'bar', data: series(cur.rS, 'p50'), itemStyle: { color: BRAND }, barMaxWidth: 7 },
      { name: 'Forecast P90', type: 'line', data: series(cur.rS, 'p90'), symbol: 'none', lineStyle: { color: LIGHT, width: 1.6, type: 'dashed' } },
      ...band('Accumulated P10–P90', '#a78bfa', cur.cum.map((x, i) => [T(i), +x.p10.toFixed(1)] as [number, number]), cur.cum.map((x, i) => [T(i), +x.p90.toFixed(1)] as [number, number]), 0.18, 'c').map((s: any) => ({ ...s, yAxisIndex: 1 })),
      { name: 'Accumulated P50', type: 'line', yAxisIndex: 1, data: cur.cum.map((x, i) => [T(i), +x.p50.toFixed(1)]), symbol: 'none', lineStyle: { color: '#7c3aed', width: 2 } },
    ],
  }), [cur, data, h]) // eslint-disable-line react-hooks/exhaustive-deps

  const exceedOpt: any = useMemo(() => ({
    ...base(), tooltip: tip((p: any) => `<b>+${Math.round((p[0].value[0] - issue) / HOUR)} h</b><br/>` + p.map((x: any) => `${x.marker}${x.seriesName}: <b>${f(x.value[1], 0)}%</b>`).join('<br/>')), xAxis: axisX(), yAxis: axisY('% probability', { scale: false, min: 0, max: 100 }),
    series: (Object.keys(SCEN) as ScenKey[]).map((k) => ({ name: SCEN_META[k].title, type: 'line', step: 'end', data: S[k].exBy.slice(0, h).map((v, i) => [T(i), +(v * 100).toFixed(0)]), symbol: 'none', lineStyle: { color: SCEN_META[k].color, width: k === scen ? 3 : 1.5, opacity: k === scen ? 1 : 0.55 }, areaStyle: k === scen ? { color: SCEN_META[k].color, opacity: 0.1 } : undefined, markLine: k === 'normal' ? { symbol: 'none', silent: true, data: [{ yAxis: 50, lineStyle: { color: '#94a3b8', type: 'dashed' }, label: { formatter: '50%', color: MUTE, fontSize: 10 } }] } : undefined })),
  }), [S, scen, h]) // eslint-disable-line react-hooks/exhaustive-deps

  const planOpt: any = useMemo(() => ({
    ...base(), tooltip: { ...tip(), trigger: 'axis' }, xAxis: { type: 'value', name: 'Planned release (m³/s)', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: MUTE, fontSize: 10 }, axisLabel: { color: MUTE, fontSize: 10 }, min: dam.qRel, max: dam.qRel + 800, splitLine: { show: false } }, yAxis: axisY('Peak level (m)'),
    series: [
      ...band('P50 to P90', BRAND, plan.rows.map((r) => [r.rel, +r.p50.toFixed(2)] as [number, number]), plan.rows.map((r) => [r.rel, +r.p90.toFixed(2)] as [number, number]), 0.18, 'p'),
      { name: 'Peak level P90', type: 'line', data: plan.rows.map((r) => [r.rel, +r.p90.toFixed(2)]), symbol: 'circle', symbolSize: 5, lineStyle: { color: BRAND, width: 2.5 }, itemStyle: { color: BRAND },
        markLine: { symbol: 'none', silent: true, data: [{ yAxis: dam.ref, lineStyle: { color: '#ef4444', type: 'dashed' }, label: { formatter: 'Reference', color: '#ef4444', fontSize: 10, position: 'insideEndTop' } }, { xAxis: release, lineStyle: { color: INK }, label: { formatter: 'Selected', color: INK, fontSize: 10 } }, ...(plan.rec !== null ? [{ xAxis: plan.rec, lineStyle: { color: '#10b981', type: 'dashed' }, label: { formatter: 'Suggested', color: '#10b981', fontSize: 10, position: 'insideStartTop' } }] : [])] } },
    ],
  }), [plan, release, dam]) // eslint-disable-line react-hooks/exhaustive-deps

  const skillOpt: any = useMemo(() => ({
    ...base(), tooltip: { ...tip(), trigger: 'axis' }, xAxis: { type: 'category', data: bt.perf.map((p) => (p.lead < 24 ? `${p.lead} h` : `${p.lead / 24 >= 1 && p.lead % 24 === 0 ? p.lead / 24 + ' d' : p.lead + ' h'}`)), axisLabel: { color: MUTE, fontSize: 10 }, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisTick: { show: false } },
    yAxis: [axisY('RMSE (m³/s)', { scale: false }), axisY('NSE', { scale: false, max: 1, min: -0.6, splitLine: { show: false } })],
    series: [
      { name: 'ML model RMSE', type: 'bar', data: bt.perf.map((p) => +p.rmse.toFixed(1)), itemStyle: { color: BRAND, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 18 },
      { name: 'Persistence RMSE', type: 'bar', data: bt.perf.map((p) => +p.persist.toFixed(1)), itemStyle: { color: '#cbd5e1', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 18 },
      { name: 'Model NSE', type: 'line', yAxisIndex: 1, data: bt.perf.map((p) => +p.nse.toFixed(2)), symbol: 'circle', symbolSize: 6, lineStyle: { color: '#10b981', width: 2.2 }, itemStyle: { color: '#10b981' } },
    ],
  }), [bt]) // eslint-disable-line react-hooks/exhaustive-deps

  const backOpt: any = useMemo(() => ({
    ...base(), tooltip: tip((p: any) => `<b>${tfmt(p[0].value[0])}</b><br/>` + p.map((x: any) => `${x.marker}${x.seriesName}: <b>${f(x.value[1], 0)}</b> m³/s`).join('<br/>')), xAxis: axisX(), yAxis: axisY('m³/s'),
    series: [
      { name: 'Observed inflow', type: 'line', data: bt.t.map((t, i) => [t, +bt.obs[i].toFixed(0)]), symbol: 'none', lineStyle: { color: INK, width: 2 } },
      { name: 'Predicted (24 h lead)', type: 'line', data: bt.t.map((t, i) => [t, +bt.pred[i].toFixed(0)]), symbol: 'none', lineStyle: { color: BRAND, width: 2.2 } },
    ],
  }), [bt]) // eslint-disable-line react-hooks/exhaustive-deps

  const imp = useMemo(() => { const tot = model.w.reduce((s, v) => s + Math.abs(v), 0); return FEATURES.map((n, i) => ({ n, v: (Math.abs(model.w[i]) / tot) * 100, pos: model.w[i] >= 0 })).sort((a, b) => b.v - a.v).slice(0, 9) }, [model])
  const impOpt: any = { ...base(), grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true }, legend: undefined, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#fff', borderColor: '#e2e8f0', textStyle: { color: INK, fontSize: 11 }, valueFormatter: (v: number) => `${v.toFixed(1)}%` },
    xAxis: { type: 'value', axisLabel: { color: MUTE, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: GRID, type: 'dashed' } } }, yAxis: { type: 'category', inverse: true, data: imp.map((x) => x.n), axisLabel: { color: '#334155', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: 'bar', barMaxWidth: 14, data: imp.map((x) => ({ value: +x.v.toFixed(1), itemStyle: { color: x.pos ? BRAND : '#f59e0b', borderRadius: [0, 4, 4, 0] } })) }] }

  // drift + context
  const drift = useMemo(() => {
    const roll = (a: number[], from: number, to: number) => { const o: number[] = []; for (let t = from; t < to; t++) o.push(sumR(a, t - 23, t)); return o }
    const items = [
      { n: 'Rainfall (24 h total)', v: psi(roll(data.rain, 48, H_TRAIN), roll(data.rain, N_HIST - 168, N_HIST)) },
      { n: 'Inflow', v: psi(data.q.slice(48, H_TRAIN), data.q.slice(N_HIST - 168, N_HIST)) },
      { n: 'Soil wetness index', v: psi(data.api.slice(48, H_TRAIN), data.api.slice(N_HIST - 168, N_HIST)) },
    ]
    return items.map((x) => ({ ...x, s: x.v < 0.1 ? { t: 'Stable', c: 'bg-emerald-50 text-emerald-700 border-emerald-200' } : x.v < 0.25 ? { t: 'Moderate shift', c: 'bg-amber-50 text-amber-700 border-amber-200' } : { t: 'Drift detected', c: 'bg-red-50 text-red-700 border-red-200' } }))
  }, [data])
  const rain72 = useMemo(() => { const o: number[] = []; for (let t = 72; t < N_HIST; t += 6) o.push(sumR(data.rain, t - 71, t)); return o }, [data])
  const rain30 = useMemo(() => { const o: number[] = []; for (let t = 720; t < N_HIST; t += 24) o.push(sumR(data.rain, t - 719, t)); return o }, [data])
  const fc72 = quantile(S[scen].rain.length ? ens[scen].rain.map((r) => r.slice(0, 72).reduce((a, b) => a + b, 0)) : [0], 0.5)
  const apiNow = data.api[N_HIST - 1], apiPct = pctRank(data.api.slice(0, N_HIST), apiNow), dry = pctRank(rain30, rain30[rain30.length - 1])
  const wx = ens.normal.rain.map((r) => r.slice(0, 24)), wxMed = Array.from({ length: 24 }, (_, k) => quantile(wx.map((r) => r[k]), 0.5)), wxPeakK = wxMed.indexOf(Math.max(...wxMed))
  const wxMax90 = quantile(wx.map((r) => Math.max(...r)), 0.9)

  const rows: [string, number, string][] = [
    ['Scenario rainfall (72 h)', pctRank(rain72, fc72), `Percentile of ${f(fc72, 0)} mm against the last 120 days`],
    ['Soil wetness', apiPct, `Antecedent index ${f(apiNow, 0)} · percentile`],
    ['Inflow rise', clamp((quantile(cur.pkQ, 0.5) / (dam.qBase * 2.5)) * 100, 0, 100), `Median peak ${f(quantile(cur.pkQ, 0.5))} m³/s`],
    ['Reservoir cushion used', clamp(((quantile(cur.pkL, 0.5) - dam.base) / (dam.ref - dam.base)) * 100, 0, 100), `${f(dam.ref - dam.base, 2)} m below the illustrative reference`],
    ['Probability of exceeding reference', cur.pEx * 100, `Within ${h} h`],
  ]
  const recs: string[] = [
    cur.risk >= 50 ? `Review release options: ${plan.rec !== null ? `a planned release near ${f(plan.rec)} m³/s keeps the P90 peak under the reference in this scenario` : 'no tested release keeps the P90 peak under the reference; escalate for expert review'}.` : 'Routine monitoring is sufficient for this scenario; keep gate readiness checks on schedule.',
    cur.medFirst !== null ? `If the reference is reached, the median time is about ${f(cur.medFirst)} h after the forecast was issued.` : 'No exceedance of the illustrative reference in the selected window.',
    `Validate rainfall against rain-gauge observations: forecast uncertainty is largest beyond 72 h (model skill at 5 days is limited).`,
    'Confirm current observations, approved limits and duty-engineer instructions before any action.',
  ]

  // live observation strip
  const j = (i: number, a: number) => 1 + a * Math.sin(tick * 0.9 + i * 2.3)
  const last = (a: number[], n = 24) => a.slice(N_HIST - n, N_HIST)
  const obs = [
    { l: 'Rainfall now', v: f(data.rain[N_HIST - 1] * j(1, 0.04), 1), u: 'mm/h', s: last(data.rain), c: '#7c3aed' },
    { l: 'River inflow', v: f(data.q[N_HIST - 1] * j(2, 0.004), 0), u: 'm³/s', s: last(data.q), c: BRAND },
    { l: 'Reservoir level', v: f(data.level[N_HIST - 1] + Math.sin(tick * 0.7) * 0.002, 2), u: 'm', s: last(data.level), c: '#0e7490' },
    { l: 'Soil wetness index', v: f(apiNow * j(3, 0.002), 1), u: '', s: last(data.api), c: '#d97706' },
  ]
  const next = issue + HOUR - clock, mm = Math.max(0, Math.floor(next / 60000)), ss = Math.max(0, Math.floor((next % 60000) / 1000))
  const horizonLabel = HORIZONS.find((x) => x.h === h)!.label

  return (
    <div className="min-h-screen min-w-0 space-y-4 bg-white p-2 text-slate-800 sm:space-y-5 sm:p-4 lg:p-5">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-[#0098DB]"><BrainCircuit size={25} /></div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {/* <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0098DB]">SMART DAM  </span> */}
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">               </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-600">Illustrative model · runs in browser</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Predictive Analysis</h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm">Scenario-based rainfall, inflow and reservoir estimates. This page uses generated sample data, not connected dam telemetry.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm"><MapPin size={14} className="text-[#0098DB]" />
            <select value={damKey} onChange={(e) => setDamKey(e.target.value as DamKey)} aria-label="Select dam" className="max-w-[150px] bg-transparent font-semibold text-slate-900 outline-none"><option>Tawa Dam</option><option>Bansagar Dam</option></select><ChevronDown size={13} className="text-slate-400" /></label>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 shadow-sm"><CalendarDays size={14} className="text-[#0098DB]" />Issued {tfmt(issue, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })} IST</div>
        </div>
      </div>

      {/* Sample-data summary strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {obs.map((o) => (
          <div key={o.l} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{o.l}</span><span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">SAMPLE</span></div>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{o.v} <span className="text-[11px] font-medium text-slate-400">{o.u}</span></p><Spark data={o.s} color={o.c} />
          </div>
        ))}
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3"><span className="text-[11px] text-slate-500">Next forecast cycle</span><p className="mt-1 flex items-center gap-1.5 text-lg font-bold tabular-nums text-slate-900"><Clock size={16} className="text-[#0098DB]" />{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</p><p className="mt-1 text-[10px] text-slate-500">Hourly simulation cycle · 100 ensemble members</p></div>
      </div>

      {/* Controls */}
      <section className={`${card} flex flex-col justify-between gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4`}>
        <Segmented label="Horizon" value={h} onChange={setH} options={HORIZONS.map((x) => ({ v: x.h, t: x.label }))} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rainfall scenario">
          {(Object.keys(SCEN) as ScenKey[]).map((k) => { const m = SCEN_META[k], I = m.icon, on = scen === k; return (
            <button key={k} type="button" onClick={() => setScen(k)} aria-pressed={on} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${on ? 'border-[#0098DB] bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <I size={16} style={{ color: m.color }} /><span><span className="block text-xs font-bold text-slate-900">{m.title}</span><span className="block text-[10px] text-slate-500">{m.caption}</span></span>
            </button>) })}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={wide} onChange={(e) => setWide(e.target.checked)} className="accent-[#0098DB]" />P05–P95 band</label>
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={members} onChange={(e) => setMembers(e.target.checked)} className="accent-[#0098DB]" />Show ensemble members</label>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Metric title="Peak inflow (median)" value={f(quantile(cur.pkQ, 0.5))} unit="m³/s" detail={`P90 ${f(quantile(cur.pkQ, 0.9))} m³/s`} icon={Waves} tone="bg-sky-50 text-sky-600" />
        <Metric title={`Level at +${h === 168 ? '7 d' : h + ' h'}`} value={f(quantile(cur.endL, 0.5), 2)} unit="m" detail={`P10–P90 ${f(quantile(cur.endL, 0.1), 2)} – ${f(quantile(cur.endL, 0.9), 2)}`} icon={Gauge} tone="bg-cyan-50 text-cyan-600" />
        <Metric title="Chance of exceeding reference" value={f(cur.pEx * 100)} unit="%" detail={cur.medFirst !== null ? `Median time ${f(cur.medFirst)} h` : 'No exceedance expected'} icon={TrendingUp} tone="bg-orange-50 text-orange-600" />
        <Metric title="Rainfall total (median)" value={f(quantile(cur.rain, 0.5))} unit={`mm / ${horizonLabel.toLowerCase()}`} detail={`P90 ${f(quantile(cur.rain, 0.9))} mm`} icon={CloudRain} tone="bg-violet-50 text-violet-600" />
        <Metric title="Flood-risk index" value={String(cur.risk)} unit="/ 100" detail="Scenario indicator, not official" icon={ShieldAlert} tone="bg-amber-50 text-amber-600" chip={{ t: risk.label, cls: risk.bg }} />
        <Metric title="Model skill (24 h lead)" value={f(perf24.nse, 2)} unit="NSE" detail={`RMSE ${f(perf24.rmse, 0)} m³/s · ${f(perf24.skill * 100, 0)}% better than persistence`} icon={Target} tone="bg-emerald-50 text-emerald-600" />
      </section>

      {/* Forecast charts */}
      <section>
        <Title eyebrow="Forecast engine" title="Probabilistic hydrological forecast" desc={`${horizonLabel} forecast for ${damKey} · ${SCEN_META[scen].title.toLowerCase()} · ${ens[scen].q.length} ensemble members. Dark line is observed; blue is the median forecast; shading is the uncertainty range.`} />
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <div className={`${card} min-w-0 p-4`}><div className="mb-1 flex items-start justify-between"><div><h3 className="text-sm font-bold text-slate-900">Rainfall forecast</h3><p className="mt-1 text-[11px] text-slate-500">Hourly rainfall (bars) and accumulation (line), past 48 h and forecast</p></div><CloudRain size={19} className="text-violet-500" /></div>
            <ReactECharts option={rainOpt} lazyUpdate notMerge style={{ height: 280, width: '100%' }} /></div>
          <div className={`${card} min-w-0 p-4`}><div className="mb-1 flex items-start justify-between"><div><h3 className="text-sm font-bold text-slate-900">River inflow prediction</h3><p className="mt-1 text-[11px] text-slate-500">Inflow to the reservoir with P10–P90 range</p></div><Waves size={19} className="text-[#0098DB]" /></div>
            <ReactECharts option={inflowOpt} lazyUpdate notMerge style={{ height: 280, width: '100%' }} /></div>
          <div className={`${card} min-w-0 p-4`}><div className="mb-1 flex items-start justify-between"><div><h3 className="text-sm font-bold text-slate-900">Reservoir level prediction</h3><p className="mt-1 text-[11px] text-slate-500">Water balance with planned release {f(release)} m³/s; dashed line is an illustrative reference</p></div><Gauge size={19} className="text-cyan-600" /></div>
            <ReactECharts option={levelOpt} lazyUpdate notMerge style={{ height: 280, width: '100%' }} /></div>
          <div className={`${card} min-w-0 p-4`}><div className="mb-3 flex items-start justify-between"><div><h3 className="text-sm font-bold text-slate-900">Flood-risk indicators</h3><p className="mt-1 text-[11px] text-slate-500">Computed from the ensemble for the selected scenario</p></div><ShieldAlert size={19} className="text-amber-500" /></div>
            <div className="space-y-3.5">{rows.map(([l, v, d]) => <div key={l}><div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="font-medium text-slate-700">{l}</span><span className="font-semibold tabular-nums text-slate-900">{f(v, 0)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${clamp(v, 0, 100)}%`, background: RISK(v).c }} /></div><p className="mt-0.5 text-[10px] text-slate-400">{d}</p></div>)}</div>
            <div className={`mt-4 flex items-center justify-between rounded-xl border px-3 py-2 ${risk.bg}`}><span className="text-xs font-semibold">Overall index {cur.risk} / 100</span><span className="text-xs font-bold">{risk.label}</span></div></div>
        </div>
      </section>

      {/* Scenarios */}
      <section>
        <Title eyebrow="What-if analysis" title="Scenario comparison and exceedance probability" desc="All three rainfall scenarios are forecast at once. Probability is the share of ensemble members whose level reaches the illustrative reference by each hour." />
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={`${card} min-w-0 p-4`}><h3 className="text-sm font-bold text-slate-900">Probability the reference level is exceeded</h3><ReactECharts option={exceedOpt} lazyUpdate notMerge style={{ height: 290, width: '100%' }} /></div>
          <div className={`${card} overflow-x-auto p-4`}>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Scenario summary · {horizonLabel}</h3>
            <table className="w-full min-w-[460px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="pb-2 font-semibold">Scenario</th><th className="pb-2 text-right font-semibold">Peak inflow P50 / P90</th><th className="pb-2 text-right font-semibold">Peak level P50 / P90</th><th className="pb-2 text-right font-semibold">P(exceed)</th><th className="pb-2 text-right font-semibold">Risk</th></tr></thead>
              <tbody>{(Object.keys(SCEN) as ScenKey[]).map((k) => { const s = S[k], r = RISK(s.risk); return (
                <tr key={k} onClick={() => setScen(k)} className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${scen === k ? 'bg-sky-50/70' : ''}`}>
                  <td className="py-2.5 font-semibold text-slate-900"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: SCEN_META[k].color }} />{SCEN_META[k].title}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-700">{f(quantile(s.pkQ, 0.5))} / {f(quantile(s.pkQ, 0.9))}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-700">{f(quantile(s.pkL, 0.5), 2)} / {f(quantile(s.pkL, 0.9), 2)}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{f(s.pEx * 100)}%</td>
                  <td className="py-2.5 text-right"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${r.bg}`}>{r.label} · {s.risk}</span></td></tr>) })}</tbody></table>
            <p className="mt-3 text-[10px] leading-4 text-slate-400">Levels above the full reservoir level are capped at 1 m for display. The reference ({dam.ref.toFixed(2)} m) is illustrative.</p>
          </div>
        </div>
      </section>

      {/* Release planning */}
      <section>
        <Title eyebrow="Decision support" title="Release planning" desc="Test how a different planned release changes the predicted peak level. The model re-runs the whole ensemble when you move the slider." />
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={`${card} min-w-0 p-4`}><ReactECharts option={planOpt} lazyUpdate notMerge style={{ height: 290, width: '100%' }} /></div>
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between text-xs"><label htmlFor="rel" className="font-semibold text-slate-800">Planned release</label><span className="font-bold tabular-nums text-[#0098DB]">{f(release)} m³/s</span></div>
            <input id="rel" type="range" min={dam.qRel} max={dam.qRel + 800} step={25} value={release} onChange={(e) => setRelease(Number(e.target.value))} className="mt-2 w-full accent-[#0098DB]" />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>Current {f(dam.qRel)}</span><span>+800</span></div>
            <div className={`mt-4 rounded-xl border p-3 ${plan.rec === null ? 'border-red-200 bg-red-50' : plan.rec === dam.qRel ? 'border-emerald-200 bg-emerald-50' : 'border-sky-200 bg-sky-50'}`}>
              <p className="flex items-center gap-2 text-xs font-bold text-slate-900"><Zap size={14} className="text-amber-500" />Suggestion for {SCEN_META[scen].title.toLowerCase()}</p>
              <p className="mt-1 text-xs leading-5 text-slate-700">{plan.rec === null ? 'No tested release keeps the P90 peak level below the reference. Escalate for expert review.' : plan.rec === dam.qRel ? 'The current release already keeps the P90 peak level below the reference.' : `A planned release near ${f(plan.rec)} m³/s (+${f(plan.rec - dam.qRel)}) keeps the P90 peak level below the reference.`}</p>
              {plan.rec !== null && plan.rec !== release && <button type="button" onClick={() => setRelease(plan.rec as number)} className="mt-2 rounded-lg bg-[#0098DB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600">Apply {f(plan.rec)} m³/s</button>}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">Flood cushion to the reference: <b className="text-slate-800">{f(((dam.ref - dam.base) * dam.area) / 1e6, 1)} MCM</b>. Downstream effects of higher releases are not modelled here.</p>
          </div>
        </div>
      </section>

      {/* Model performance */}
      <section>
        <Title eyebrow="Model validation" title="How good is the model?" desc={`Hindcast on the held-out last 30 days (${f(bt.perf.length)} lead times, forecasts issued every 6 hours using noisy weather-model rainfall). Persistence means assuming inflow stays unchanged.`}
          right={<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600">Train R² {f(model.r2Train, 3)} · test 1-step R² {f(model.r2Test, 3)}</span>} />
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
          <div className={`${card} min-w-0 p-4`}><h3 className="text-sm font-bold text-slate-900">Skill by lead time</h3><p className="mt-1 text-[11px] text-slate-500">Error grows with lead time; beyond about 5 days the model is no better than persistence</p><ReactECharts option={skillOpt} lazyUpdate notMerge style={{ height: 270, width: '100%' }} /></div>
          <div className={`${card} min-w-0 p-4`}><h3 className="text-sm font-bold text-slate-900">24-hour forecasts vs observed</h3><p className="mt-1 text-[11px] text-slate-500">Last 14 days, each point predicted 24 h earlier</p><ReactECharts option={backOpt} lazyUpdate notMerge style={{ height: 270, width: '100%' }} /></div>
          <div className={`${card} min-w-0 p-4`}><h3 className="text-sm font-bold text-slate-900">What drives the forecast</h3><p className="mt-1 text-[11px] text-slate-500">Share of model weight per input (blue raises inflow, amber lowers)</p><ReactECharts option={impOpt} lazyUpdate notMerge style={{ height: 270, width: '100%' }} /></div>
        </div>
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
          <div className={`${card} p-4 xl:col-span-2`}><h3 className="mb-3 text-sm font-bold text-slate-900">Accuracy by lead time</h3>
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="pb-2 font-semibold">Lead</th><th className="pb-2 text-right font-semibold">RMSE</th><th className="pb-2 text-right font-semibold">MAE</th><th className="pb-2 text-right font-semibold">NSE</th><th className="pb-2 text-right font-semibold">Bias</th><th className="pb-2 text-right font-semibold">Persistence RMSE</th><th className="pb-2 text-right font-semibold">Skill</th></tr></thead>
              <tbody>{bt.perf.map((p) => <tr key={p.lead} className="border-b border-slate-100"><td className="py-2 font-semibold text-slate-900">{p.lead < 48 || p.lead % 24 ? `${p.lead} h` : `${p.lead / 24} days`}</td><td className="py-2 text-right tabular-nums">{f(p.rmse, 1)}</td><td className="py-2 text-right tabular-nums">{f(p.mae, 1)}</td><td className="py-2 text-right tabular-nums">{f(p.nse, 2)}</td><td className="py-2 text-right tabular-nums">{f(p.bias, 1)}%</td><td className="py-2 text-right tabular-nums text-slate-500">{f(p.persist, 1)}</td><td className={`py-2 text-right font-semibold tabular-nums ${p.skill > 0.3 ? 'text-emerald-600' : p.skill > 0 ? 'text-amber-600' : 'text-red-600'}`}>{f(p.skill * 100, 0)}%</td></tr>)}</tbody></table></div>
            <p className="mt-2 text-[10px] text-slate-400">Units: m³/s except NSE (1 = perfect) and skill (improvement over persistence).</p></div>
          <div className={`${card} p-4`}><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Activity size={16} className="text-[#0098DB]" />Input data drift</h3>
            <p className="mb-3 text-[11px] text-slate-500">Population stability index: last 7 days against the training period.</p>
            <ul className="space-y-2.5">{drift.map((x) => <li key={x.n} className="flex items-center justify-between gap-2 text-xs"><span className="text-slate-700">{x.n}<span className="ml-1 text-[10px] text-slate-400">PSI {f(x.v, 2)}</span></span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${x.s.c}`}>{x.s.t}</span></li>)}</ul></div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={`${card} p-4`}><div className="mb-3 flex items-center gap-2"><Zap size={18} className="text-amber-500" /><h3 className="text-sm font-bold text-slate-900">Planning guidance for this scenario</h3></div>
          <ul className="space-y-3">{recs.map((r, i) => <li key={i} className="flex items-start gap-2.5 text-xs leading-5 text-slate-700"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[10px] font-bold text-[#0098DB]">{i + 1}</span>{r}</li>)}</ul>
          <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-400">Planning prompts only. They are generated from                 and are not operating instructions.</p></div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { t: 'Weather intelligence', icon: Wind, tone: 'bg-sky-50 text-sky-600', v: `${f(Math.max(...wxMed), 1)} mm/h`, d: `Peak hourly rain (median) around ${tfmt(T(wxPeakK), { hour: '2-digit', minute: '2-digit', hour12: false })} IST · P90 peak ${f(wxMax90, 1)} mm/h` },
            { t: 'Drought outlook', icon: Droplets, tone: dry < 25 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600', v: dry < 25 ? 'Drier than usual' : dry > 75 ? 'Wetter than usual' : 'Near normal', d: `Last 30-day rainfall at the ${f(dry, 0)}th percentile of the record` },
            { t: 'Soil wetness', icon: Layers3, tone: 'bg-violet-50 text-violet-600', v: apiPct > 66 ? 'Wet' : apiPct < 33 ? 'Dry' : 'Moderate', d: `Antecedent index ${f(apiNow, 0)} · ${f(apiPct, 0)}th percentile; wet soil raises runoff` },
            { t: 'Input data health', icon: RadioTower, tone: 'bg-emerald-50 text-emerald-600', v: 'Sample inputs only', d: 'No rain gauge, river gauge, reservoir sensor or weather-service connection on this page' },
          ].map((x) => { const I = x.icon; return <div key={x.t} className={`${card} p-4`}><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${x.tone}`}><I size={17} /></div><h3 className="mt-3 text-xs font-bold text-slate-900">{x.t}</h3><p className="mt-1 text-sm font-bold text-slate-900">{x.v}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{x.d}</p></div> })}
        </div>
      </section>

      {/* Pipeline */}
      <section className={`${card} p-4 sm:p-5`}>
        <Title eyebrow="AI / ML workflow" title="From field data to predictive insight" desc="How this page produces its forecast, with the real figures from this session." />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { s: '01', t: 'Data ingestion', d: `${f(N_HIST)} hourly records per dam: rainfall, inflow, reservoir level (simulated)`, i: RadioTower },
            { s: '02', t: 'Feature engineering', d: `${FEATURES.length} inputs: inflow lags, rainfall sums, soil wetness index, time of day`, i: Layers3 },
            { s: '03', t: 'Model and ensemble', d: `Ridge regression (λ=${model.lambda}), ${f(model.nTrain)} training samples, 100-member ensemble with weather-model uncertainty`, i: BrainCircuit },
            { s: '04', t: 'Decision support', d: 'Probabilities, scenarios, release planning, drift monitoring, audit-ready exports', i: CheckCircle2 },
          ].map((x) => { const I = x.i; return <div key={x.s} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-widest text-[#0098DB]">{x.s}</span><I size={18} className="text-[#0098DB]" /></div><h3 className="mt-3 text-sm font-bold text-slate-900">{x.t}</h3><p className="mt-1 text-[11px] leading-4 text-slate-500">{x.d}</p></div> })}
        </div>
        <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
          {[['Algorithm', 'Ridge-regularised autoregressive model with weather inputs'], ['Training period', 'First 90 days (hourly)'], ['Validation period', 'Last 30 days, held out'], ['Trained', tfmt(model.trainedAt, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST (on page load)']].map(([k, v]) => <div key={k} className="rounded-lg border border-slate-200 p-2.5"><p className="text-[10px] uppercase tracking-wider text-slate-400">{k}</p><p className="mt-0.5 font-medium text-slate-800">{v}</p></div>)}
        </div>
      </section>

      {/* <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info size={17} className="mt-0.5 shrink-0 text-amber-700" />
        <div><p className="text-xs font-bold text-amber-900">Sample-data notice</p>
          <p className="mt-1 text-[11px] leading-5 text-amber-900/80">Rainfall, inflow, reservoir level, weather forecasts and the model training history shown here are generated for demonstration. This page is not connected to SCADA, telemetry or a weather service and does not represent current Tawa or Bansagar conditions. Risk levels, reference values and release planning are illustrative only and must not be be used for dam operation or safety decisions. Use verified readings, approved limits and the duty engineer’s assessment for operational decisions.</p></div>
      </div> */}
      <div className="flex flex-col justify-between gap-2 border-t border-slate-200 pt-4 text-[10px] text-slate-400 sm:flex-row sm:items-center"><span>SMART DAM · Predictive Analysis · Chetas Control Systems</span><span>Sample dataset · Not live telemetry</span></div>
    </div>
  )
}