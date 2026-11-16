






import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/* =====================================================================
   DAM AUTOMATION DIGITAL TWIN
   Chetas Control Systems Pvt Ltd

   Merged version: React Three Fiber scene + full automation simulation
   (gates, RTUs, SCADA, instruments, scenarios, guided tour) + extras:
     - rain particles, day / night mode, auto-orbit presentation mode
     - trend charts, time-to-alert estimate, storage, discharge split
     - gate load-sharing on fault, sensor drift with auto failover (RL-02)
     - alarm acknowledge, CSV event export, PNG screenshot
     - keyboard shortcuts (1-7 cameras, Space pause, N night, T tour)
   Requires three >= r152 (uses colorSpace). All data is simulated. Water-flow animation is oriented downstream (+Z).
   ===================================================================== */

// ---------------------------------------------------------------------
// Constants and helpers
// ---------------------------------------------------------------------

const PI = Math.PI;
const Y0 = 450;
const YS = 0.5;
const el2y = (e: number) => (e - Y0) * YS;

const LV = {
  MDDL: 470,
  SILL: 480,
  FRL: 490,
  ALERT: 492,
  DANGER: 493.5,
  CREST: 496,
} as const;

const BAYS = [-24, -12, 0, 12, 24];
const PIERX = [-30, -18, -6, 6, 18, 30];
const GATE_ORDER = [491.0, 490.0, 489.0, 490.0, 491.0];
const AREA = 20e6; // reservoir area, m2
const TSCALE = 1200; // simulated seconds per real second
const HIST_MAX = 150;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const fmt = (v: number, d = 1) => v.toFixed(d);

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

type V3 = [number, number, number];
type Mode = "AUTO" | "MANUAL";
type Scenario = "NORMAL" | "FLOOD" | "FAULT" | "SEEP" | "DRIFT" | "CUSTOM";
type AlarmState =
  | "NORMAL"
  | "WARNING"
  | "SEEPAGE"
  | "SENSOR"
  | "ALERT"
  | "DANGER"
  | "OVERTOPPING";
type Tone = "ok" | "warn" | "bad";
type LogFn = (text: string, tone: Tone) => void;
type CamKey =
  | "overview"
  | "upstream"
  | "gates"
  | "power"
  | "canal"
  | "control"
  | "safety";

interface GateState {
  o: number;
  target: number;
  fault: boolean;
}

interface Sim {
  L: number;
  Qin: number;
  Qout: number;
  Qg: number;
  Qp: number;
  Qc: number;
  mode: Mode;
  scenario: Scenario;
  t: number;
  clock: number;
  seep: number;
  alarm: AlarmState;
  rain: number;
  riverStage: number;
  siren: boolean;
  drift: number;
  sensorAlarm: boolean;
  compLogged: boolean;
  paused: boolean;
  speed: number;
  floodIntensity: number;
  customQin: number;
  gates: GateState[];
  manual: number[];
}

interface HistPt {
  t: number;
  L: number;
  Qin: number;
  Qout: number;
}

interface EventItem {
  id: number;
  t: string;
  text: string;
  tone: Tone;
}

interface CamCmd {
  p: V3;
  t: V3;
  dur: number;
}

interface OrbitLike {
  target: THREE.Vector3;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
}

// ---------------------------------------------------------------------
// Terrain function (shared by mesh, trees and instrument placement)
// ---------------------------------------------------------------------

function noise(x: number, z: number) {
  return (
    Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.05) * 2.2 +
    Math.sin(x * 0.11 + z * 0.07) * 1.1 +
    Math.cos(z * 0.031 - x * 0.02) * 1.6
  );
}

function Tbase(x: number, z: number) {
  const ax = Math.abs(x);
  let h = 0.03 * Math.pow(ax, 1.5);
  h -= 3 * Math.exp(-(x * x) / 81);
  if (z < 0) h += Math.max(0, -z - 25) * 0.05;
  h += noise(x, z) * smooth(14, 50, ax);
  return h;
}

const PLAT = [
  { x0: 24, x1: 72, z0: 26, z1: 50, y: 1.5, m: 14 },
  { x0: 8, x1: 28, z0: 33, z1: 41, y: -0.6, m: 3 },
  { x0: -66, x1: -46, z0: 22, z1: 100, y: 6, m: 8 },
  { x0: -108, x1: -92, z0: -12, z1: 4, y: Tbase(-100, -4), m: 8 },
];

function T(x: number, z: number) {
  let h = Tbase(x, z);
  for (const p of PLAT) {
    const dx = Math.max(p.x0 - x, 0, x - p.x1);
    const dz = Math.max(p.z0 - z, 0, z - p.z1);
    const w = 1 - smooth(0, p.m, Math.hypot(dx, dz));
    h = h * (1 - w) + p.y * w;
  }
  return h;
}

const CR = { x: -100, z: -4, y: PLAT[3].y };
const AWS = { x: -92, z: -50, y: T(-92, -50) };
const SIREN = { x: 14, z: 62, y: T(14, 62) };
const CAM = { x: 78, z: 0 };

// ---------------------------------------------------------------------
// Simulation engine (mutable, runs inside the render loop, no React churn)
// ---------------------------------------------------------------------

function createSim(): Sim {
  return {
    L: 488.5,
    Qin: 170,
    Qout: 160,
    Qg: 0,
    Qp: 120,
    Qc: 40,
    mode: "AUTO",
    scenario: "NORMAL",
    t: 0,
    clock: 8 * 60,
    seep: 4.2,
    alarm: "NORMAL",
    rain: 0,
    riverStage: 1.2,
    siren: false,
    drift: 0,
    sensorAlarm: false,
    compLogged: false,
    paused: false,
    speed: 1,
    floodIntensity: 1,
    customQin: 165,
    gates: BAYS.map(() => ({ o: 0, target: 0, fault: false })),
    manual: [0, 0, 0, 0, 0],
  };
}

const gateQ = (o: number, L: number) =>
  o * 1100 * Math.sqrt(Math.max(0, L - LV.SILL) / 14);

const powerMW = (s: Sim) =>
  (0.9 * 9.81 * s.Qp * Math.max(0, s.L - 452)) / 1000;

function inflowProfile(s: Sim): number {
  const t = s.t;
  switch (s.scenario) {
    case "NORMAL":
    case "DRIFT":
      s.rain = 0;
      return 165 + 12 * Math.sin(t / 12);
    case "FLOOD": {
      const k = s.floodIntensity;
      const hi = 200 + 5000 * k;
      s.rain =
        (t < 80 ? 55 * smooth(0, 15, t) : 55 * (1 - smooth(80, 110, t))) * k;
      if (t < 25) return 200 + 5000 * k * smooth(0, 25, t);
      if (t < 60) return hi;
      return hi - (hi - 400) * smooth(60, 120, t);
    }
    case "FAULT":
      s.rain = 40 * smooth(0, 15, t);
      if (t < 25) return 200 + 4200 * smooth(0, 25, t);
      return 4400;
    case "SEEP":
      s.rain = 0;
      return 190;
    default:
      s.rain = 0;
      return s.customQin;
  }
}

function applyScenario(s: Sim, name: Scenario | "RESET", log: LogFn) {
  s.t = 0;
  s.drift = 0;
  s.sensorAlarm = false;
  s.compLogged = false;
  s.gates.forEach((g) => {
    g.fault = false;
  });
  switch (name) {
    case "RESET":
      s.scenario = "NORMAL";
      s.L = 488.5;
      s.seep = 4.2;
      s.mode = "AUTO";
      s.alarm = "NORMAL";
      s.siren = false;
      s.paused = false;
      s.gates.forEach((g) => {
        g.o = 0;
        g.target = 0;
      });
      s.manual = [0, 0, 0, 0, 0];
      log("System reset", "ok");
      return;
    case "NORMAL":
      s.scenario = name;
      s.L = 488.5;
      s.seep = 4.2;
      s.mode = "AUTO";
      log("Normal operation", "ok");
      return;
    case "FLOOD":
      s.scenario = name;
      s.L = 488.6;
      s.seep = 4.6;
      s.mode = "AUTO";
      log("Monsoon flood scenario started", "warn");
      return;
    case "FAULT":
      s.scenario = name;
      s.L = 488.6;
      s.seep = 4.6;
      s.mode = "AUTO";
      s.gates[2].fault = true;
      log("GP-3 / gate 3 motor overload trip", "bad");
      return;
    case "SEEP":
      s.scenario = name;
      s.L = 489.5;
      s.seep = 4.4;
      s.mode = "AUTO";
      log("Seepage test started", "warn");
      return;
    case "DRIFT":
      s.scenario = name;
      s.L = 488.5;
      s.seep = 4.2;
      s.mode = "AUTO";
      log("Sensor drift test: RL-01 starts to drift", "warn");
      return;
    default:
      s.scenario = name;
  }
}

function stepSim(s: Sim, rawDt: number, log: LogFn) {
  if (s.paused) return;
  const dt = rawDt * s.speed;
  s.t += dt;
  s.clock += (dt * TSCALE) / 60;
  s.Qin = inflowProfile(s);

  // level sensors: RL-01 may drift, RL-02 is the healthy backup
  if (s.scenario === "DRIFT") s.drift = Math.min(1.5, s.drift + dt * 0.05);
  else s.drift *= 1 - Math.min(1, dt * 0.5);
  const dev = Math.abs(s.drift - 0.03);
  if (dev > 0.15 && !s.sensorAlarm) {
    s.sensorAlarm = true;
    log(`RL-01 / RL-02 deviation ${fmt(dev, 2)} m: sensor health alarm`, "warn");
    if (s.mode === "AUTO") log("AUTO: gate control switched to RL-02", "warn");
  } else if (dev < 0.05 && s.sensorAlarm) {
    s.sensorAlarm = false;
    log("Level sensors agree again", "ok");
  }
  const Lm = s.sensorAlarm ? s.L + 0.03 : s.L + s.drift;

  // gate load sharing: healthy gates open earlier when one is faulted
  const faults = s.gates.filter((g) => g.fault).length;
  const comp = faults > 0 && s.mode === "AUTO" ? 0.5 : 0;
  if (comp > 0 && !s.compLogged) {
    s.compLogged = true;
    log("AUTO: healthy gates open earlier to cover the faulted gate", "warn");
  }
  if (faults === 0) s.compLogged = false;

  s.gates.forEach((g, i) => {
    g.target =
      s.mode === "AUTO"
        ? clamp((Lm - GATE_ORDER[i] + comp) / 1.5, 0, 1)
        : s.manual[i];
    if (!g.fault) {
      const r = 0.12 * dt;
      g.o += clamp(g.target - g.o, -r, r);
    }
  });

  let Qg = 0;
  s.gates.forEach((g) => {
    Qg += gateQ(g.o, s.L);
  });
  s.Qg = Qg;
  s.Qp = s.L > LV.MDDL ? 120 : 0;
  s.Qc = s.L > 472 ? 40 : 0;
  s.Qout = Qg + s.Qp + s.Qc;
  s.L = clamp(s.L + ((s.Qin - s.Qout) * TSCALE * dt) / AREA, 465, 497);
  s.riverStage = 1.2 + 0.0011 * s.Qout;

  if (s.scenario === "SEEP") s.seep = Math.min(26, s.seep + dt * 1.4);
  else
    s.seep +=
      (4.2 + 0.08 * (s.L - 488) - s.seep) * Math.min(1, dt * 0.2);

  // alarm state machine
  let a: AlarmState = "NORMAL";
  if (s.L >= LV.CREST - 0.05) a = "OVERTOPPING";
  else if (s.L >= LV.DANGER) a = "DANGER";
  else if (s.L >= LV.ALERT) a = "ALERT";
  else if (s.L >= LV.FRL + 0.05) a = "WARNING";
  if (a === "NORMAL" && s.seep > 12) a = "SEEPAGE";
  if (a === "NORMAL" && s.sensorAlarm) a = "SENSOR";
  if (a !== s.alarm) {
    s.alarm = a;
    if (a === "NORMAL") log("Back to normal", "ok");
    else if (a === "SEEPAGE")
      log(`SEEPAGE state: SW-01 at ${fmt(s.seep, 1)} l/min`, "warn");
    else if (a === "SENSOR")
      log("SENSOR state: level transmitters disagree", "warn");
    else log(`${a} state: level ${fmt(s.L, 2)} m`, a === "WARNING" ? "warn" : "bad");
  }
  const sirenNow = a === "ALERT" || a === "DANGER" || a === "OVERTOPPING";
  if (sirenNow && !s.siren) log("Downstream siren SIR-01 activated", "bad");
  s.siren = sirenNow;
}

const alarmTone = (a: AlarmState): Tone =>
  a === "NORMAL"
    ? "ok"
    : a === "WARNING" || a === "SEEPAGE" || a === "SENSOR"
      ? "warn"
      : "bad";

const TONE_BG: Record<Tone, string> = {
  ok: "bg-emerald-600",
  warn: "bg-amber-600",
  bad: "bg-red-600",
};
const TONE_HEX: Record<Tone, string> = {
  ok: "#34d399",
  warn: "#fbbf24",
  bad: "#f87171",
};
const TONE_BORDER: Record<Tone, string> = {
  ok: "border-emerald-500",
  warn: "border-amber-500",
  bad: "border-red-500",
};

function clockStr(clock: number) {
  const m = Math.floor(clock % 1440);
  const h = Math.floor(m / 60);
  const mi = m % 60;
  const day = 1 + Math.floor(clock / 1440);
  return `D${day} ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

function makeSnap(s: Sim, hist: HistPt[]) {
  const net = s.Qin - s.Qout;
  return {
    L: s.L,
    Qin: s.Qin,
    Qout: s.Qout,
    Qg: s.Qg,
    Qp: s.Qp,
    Qc: s.Qc,
    MW: powerMW(s),
    river: s.riverStage,
    rain: s.rain,
    seep: s.seep,
    alarm: s.alarm,
    siren: s.siren,
    clock: s.clock,
    mode: s.mode,
    scenario: s.scenario,
    paused: s.paused,
    speed: s.speed,
    floodIntensity: s.floodIntensity,
    customQin: s.customQin,
    drift: s.drift,
    sensorAlarm: s.sensorAlarm,
    gates: s.gates.map((g) => ({ o: g.o, fault: g.fault })),
    manual: [...s.manual],
    storage: ((s.L - LV.MDDL) * AREA) / 1e6,
    etaH:
      net > 1 && s.L < LV.ALERT ? ((LV.ALERT - s.L) * AREA) / net / 3600 : null,
    hist: hist.slice(),
  };
}
type Snap = ReturnType<typeof makeSnap>;

// ---------------------------------------------------------------------
// Instruments (field devices, panels, SCADA)
// ---------------------------------------------------------------------

type Cat =
  | "Level"
  | "Flow"
  | "Gate"
  | "Weather"
  | "Geotech"
  | "Quality"
  | "Safety"
  | "Control";

const CAT_COLOR: Record<Cat, string> = {
  Level: "#2f9bff",
  Flow: "#19c3a6",
  Gate: "#ffb020",
  Weather: "#8bd450",
  Geotech: "#c58bff",
  Quality: "#ff7aa8",
  Safety: "#ff5a4d",
  Control: "#e0e6ef",
};

interface Instrument {
  tag: string;
  name: string;
  cat: Cat;
  pos: V3;
  loc: string;
  meas: string;
  range: string;
  sig: string;
  role: string;
  limit: string;
  live: (s: Sim) => string;
}

const GP_INSTR: Instrument[] = BAYS.map((bx, i) => ({
  tag: `GP-${i + 1}`,
  name: `Gate position encoder, gate ${i + 1}`,
  cat: "Gate",
  pos: [bx, 35.6, -1.4],
  loc: `Spillway hoist, bay ${i + 1}${i === 2 ? " (centre)" : ""}`,
  meas: "Gate opening",
  range: "0 to 100 % of travel",
  sig: "Absolute encoder, SSI or 4-20 mA, to RTU-01",
  role: "Closed-loop positioning, limit and overload interlocks, discharge calculation.",
  limit: "Fault if no movement within 5 s of command",
  live: (s) =>
    `${fmt(s.gates[i].o * 100, 0)} % open${s.gates[i].fault ? " (FAULT)" : ""}`,
}));

const INSTRUMENTS: Instrument[] = [
  {
    tag: "RL-01",
    name: "Reservoir level transmitter (radar)",
    cat: "Level",
    pos: [-40, 26.5, -3.5],
    loc: "Dam crest, upstream side",
    meas: "Reservoir water level",
    range: "Typical 0 to 40 m, mm-level resolution",
    sig: "4-20 mA with HART, or Modbus RTU, to RTU-01",
    role: "Main input for the gate opening logic, flood alarms and the level-storage curve.",
    limit: "Alert 492.0 m, Danger 493.5 m",
    live: (s) => `${fmt(s.L + s.drift, 2)} m`,
  },
  {
    tag: "RL-02",
    name: "Reservoir level (submersible pressure)",
    cat: "Level",
    pos: [45, 27.8, -8],
    loc: "Intake tower",
    meas: "Reservoir water level (backup)",
    range: "Typical 0 to 60 m of water column",
    sig: "4-20 mA to RTU-01",
    role: "Second, independent level reading. A difference from RL-01 raises a sensor-health alarm and control fails over to this sensor.",
    limit: "Deviation above 0.15 m",
    live: (s) => `${fmt(s.L + 0.03, 2)} m`,
  },
  {
    tag: "RG-01",
    name: "Automatic weather station and rain gauge",
    cat: "Weather",
    pos: [AWS.x + 1.2, AWS.y + 4.2, AWS.z],
    loc: "Left bank hill",
    meas: "Rainfall, temperature, humidity, wind, radiation",
    range: "Tipping bucket 0.2 mm; 15-minute logging",
    sig: "RS-485 Modbus RTU to the control room link",
    role: "Rain intensity feeds the inflow forecast and early flood warning.",
    limit: "Heavy rain above 30 mm/h",
    live: (s) => `${fmt(s.rain, 0)} mm/h`,
  },
  ...GP_INSTR,
  {
    tag: "RTU-01",
    name: "Spillway gate control RTU panel",
    cat: "Control",
    pos: [-36, 27, 4],
    loc: "Spillway bridge deck",
    meas: "Gate commands, motor status, local/remote selector",
    range: "5 gate drives, digital and analog I/O",
    sig: "Modbus RTU and Ethernet; IP65 panel with Li-ion battery backup",
    role: "Runs the gate logic locally, so the dam keeps working if the communication link is lost.",
    limit: "Local control always has priority",
    live: (s) => (s.mode === "AUTO" ? "Auto control" : "Manual control"),
  },
  {
    tag: "FM-01",
    name: "Penstock flow meter (ultrasonic)",
    cat: "Flow",
    pos: [45, 11.5, 22],
    loc: "Penstock to power house",
    meas: "Water flow to the turbine",
    range: "Typical 0 to 200 m3/s",
    sig: "Modbus RTU / 4-20 mA to RTU-02",
    role: "Water accounting and turbine efficiency; also part of the total release calculation.",
    limit: "Low-flow trip below 20 m3/s",
    live: (s) => `${fmt(s.Qp, 0)} m3/s`,
  },
  {
    tag: "TG-01",
    name: "Turbine-generator status gateway",
    cat: "Control",
    pos: [40, 13, 37],
    loc: "Power house",
    meas: "Power output, voltage, unit status",
    range: "Status, MW and kV tags",
    sig: "Modbus to RTU-02",
    role: "Brings generation data into SCADA and links turbine load to the reservoir level.",
    limit: "Unit trip alarm",
    live: (s) => `${fmt(powerMW(s), 1)} MW`,
  },
  {
    tag: "RTU-02",
    name: "Power house RTU panel",
    cat: "Control",
    pos: [30, 5, 30],
    loc: "Power house",
    meas: "Penstock flow, turbine data, downstream level, siren output",
    range: "Analog, digital and Modbus I/O",
    sig: "Modbus RTU and Ethernet; Li-ion battery backup",
    role: "Collects power house data and drives the flood siren.",
    limit: "Battery low alarm",
    live: () => "Online",
  },
  {
    tag: "DS-01",
    name: "Downstream river level (radar)",
    cat: "Level",
    pos: [12, 8.5, 56],
    loc: "River bank, downstream",
    meas: "River stage below the dam",
    range: "Typical 0 to 15 m",
    sig: "4-20 mA to RTU-02",
    role: "Limits gate release rate so the downstream stage does not rise too quickly.",
    limit: "Rate of rise limit",
    live: (s) => `${fmt(s.riverStage, 2)} m`,
  },
  {
    tag: "SIR-01",
    name: "Flood warning siren with strobe",
    cat: "Safety",
    pos: [SIREN.x, SIREN.y + 9.4, SIREN.z],
    loc: "Downstream bank",
    meas: "Warning output",
    range: "Siren and strobe, 24 V DC",
    sig: "Relay output from RTU-02",
    role: "Warns downstream villages when SCADA raises the alert or danger state.",
    limit: "On at Alert level and above",
    live: (s) => (s.siren ? "SOUNDING" : "Standby"),
  },
  {
    tag: "FM-02",
    name: "Canal discharge meter",
    cat: "Flow",
    pos: [-55, 8.8, 44],
    loc: "Left bank canal",
    meas: "Irrigation release",
    range: "Typical 0 to 60 m3/s",
    sig: "Modbus RTU / 4-20 mA to RTU-03",
    role: "Records water delivered to irrigation for water accounting.",
    limit: "Release schedule deviation",
    live: (s) => `${fmt(s.Qc, 0)} m3/s`,
  },
  {
    tag: "LV-03",
    name: "Canal level transmitter (ultrasonic)",
    cat: "Level",
    pos: [-55, 8.8, 60],
    loc: "Left bank canal",
    meas: "Canal water level",
    range: "Typical 0 to 5 m",
    sig: "4-20 mA to RTU-03",
    role: "Keeps the head regulator gates at the set canal level.",
    limit: "High and low level alarms",
    live: (s) => `${fmt(2.2 + s.Qc / 60, 2)} m`,
  },
  {
    tag: "RTU-03",
    name: "Canal head regulator RTU panel",
    cat: "Control",
    pos: [-52, 10, 27],
    loc: "Canal head regulator",
    meas: "Regulator gates, canal level and flow",
    range: "Analog, digital and Modbus I/O",
    sig: "Modbus RTU and Ethernet; Li-ion battery backup",
    role: "Controls the irrigation release at the canal head.",
    limit: "Battery low alarm",
    live: () => "Online",
  },
  {
    tag: "PZ-01",
    name: "Piezometer, left block",
    cat: "Geotech",
    pos: [-60, 8, 3],
    loc: "Inside dam, left block",
    meas: "Uplift (pore) pressure",
    range: "Vibrating wire, typical 0 to 0.7 MPa",
    sig: "Vibrating wire logger to RTU-01",
    role: "Dam stability watch: rising uplift reduces the safety margin.",
    limit: "Alert above design uplift line",
    live: (s) => `${fmt(0.18 + (0.02 * (s.L - 480)) / 10, 3)} MPa`,
  },
  {
    tag: "PZ-02",
    name: "Piezometer, spillway block",
    cat: "Geotech",
    pos: [0, 7, 3.5],
    loc: "Inside dam, spillway block",
    meas: "Uplift (pore) pressure",
    range: "Vibrating wire, typical 0 to 0.7 MPa",
    sig: "Vibrating wire logger to RTU-01",
    role: "Dam stability watch under the spillway.",
    limit: "Alert above design uplift line",
    live: (s) =>
      `${fmt(0.2 + (0.025 * (s.L - 480)) / 10 + s.seep * 0.004, 3)} MPa`,
  },
  {
    tag: "PZ-03",
    name: "Piezometer, right block",
    cat: "Geotech",
    pos: [60, 8, 3],
    loc: "Inside dam, right block",
    meas: "Uplift (pore) pressure",
    range: "Vibrating wire, typical 0 to 0.7 MPa",
    sig: "Vibrating wire logger to RTU-01",
    role: "Dam stability watch, right abutment.",
    limit: "Alert above design uplift line",
    live: (s) => `${fmt(0.17 + (0.02 * (s.L - 480)) / 10, 3)} MPa`,
  },
  {
    tag: "TLT-01",
    name: "Tiltmeter / inclinometer",
    cat: "Geotech",
    pos: [78, 25, 0],
    loc: "Dam crest, right block",
    meas: "Crest tilt and displacement",
    range: "Typical +/-5 degrees, fine resolution",
    sig: "RS-485 to RTU-01",
    role: "Detects slow movement of the structure.",
    limit: "Alert above set rate of change",
    live: (s) => `${fmt(0.012 + 0.0008 * (s.L - 480), 3)} deg`,
  },
  {
    tag: "SW-01",
    name: "Seepage weir with level sensor",
    cat: "Geotech",
    pos: [-62, T(-62, 24) + 3, 24],
    loc: "Downstream toe, left bank",
    meas: "Seepage flow (V-notch weir)",
    range: "Typical 0 to 50 l/min",
    sig: "4-20 mA to RTU-01",
    role: "A sudden rise in seepage or muddy water is an early sign of trouble.",
    limit: "Alarm above 12 l/min",
    live: (s) => `${fmt(s.seep, 1)} l/min`,
  },
  {
    tag: "SEI-01",
    name: "Accelerograph (seismic)",
    cat: "Safety",
    pos: [-30, 7, 6],
    loc: "Inspection gallery",
    meas: "Ground and structure acceleration",
    range: "Event triggered recording",
    sig: "Ethernet to RTU-01",
    role: "Logs earthquakes and prompts a post-event inspection.",
    limit: "Trigger at set acceleration",
    live: () => "No event",
  },
  {
    tag: "WQ-01",
    name: "Water quality sonde",
    cat: "Quality",
    pos: [45, 14, -12],
    loc: "Intake tower, submerged",
    meas: "pH, turbidity, temperature, dissolved oxygen, conductivity",
    range: "Multi-parameter, auto-cleaning",
    sig: "Modbus RTU to RTU-01",
    role: "Protects the intake and supports water-quality records.",
    limit: "Turbidity and pH alarm limits",
    live: (s) => (s.rain > 10 ? "Turbidity high" : "Normal"),
  },
  {
    tag: "CAM-01",
    name: "CCTV camera (PTZ)",
    cat: "Safety",
    pos: [CAM.x, 28.4, CAM.z],
    loc: "Dam crest, right end",
    meas: "Video of crest and spillway",
    range: "IP camera, night vision",
    sig: "Ethernet to the control room",
    role: "Remote visual check of gates and crest; security of the site.",
    limit: "Motion and intrusion alerts",
    live: () => "Streaming",
  },
  {
    tag: "COM-01",
    name: "Communication tower and radio link",
    cat: "Control",
    pos: [CR.x + 11, CR.y + 25, CR.z - 2],
    loc: "Control room hill",
    meas: "Data links to all RTU panels",
    range: "GSM/4G, radio and fibre options",
    sig: "VPN, private APN, Modbus TCP and MQTT",
    role: "Carries all field data to SCADA and to outside platforms.",
    limit: "Link-loss alarm",
    live: () => "Link up",
  },
  {
    tag: "SCADA",
    name: "SCADA control room",
    cat: "Control",
    pos: [CR.x, CR.y + 9, CR.z],
    loc: "Control room",
    meas: "All dam data and operator actions",
    range: "Servers, historian, HMI, video wall",
    sig: "Ethernet, open APIs for other systems",
    role: "Operators watch the dam, get alarms and can take manual control.",
    limit: "Alarm priorities 1 to 4",
    live: (s) => s.alarm,
  },
];

const BY_TAG: Record<string, Instrument> = {};
INSTRUMENTS.forEach((d) => {
  BY_TAG[d.tag] = d;
});

function isBad(tag: string, s: Sim) {
  if (tag === "SW-01") return s.seep > 12;
  if (tag === "RL-01") return s.L >= LV.ALERT || s.sensorAlarm;
  if (tag === "SIR-01") return s.siren;
  if (tag.startsWith("GP-")) return s.gates[Number(tag.slice(3)) - 1].fault;
  return false;
}

const LINKS: [string, string, string][] = [
  ...[
    "GP-1", "GP-2", "GP-3", "GP-4", "GP-5", "RL-01", "RL-02", "PZ-01",
    "PZ-02", "PZ-03", "TLT-01", "SW-01", "SEI-01", "WQ-01",
  ].map((t): [string, string, string] => [t, "RTU-01", "#7fd1ff"]),
  ...["FM-01", "TG-01", "DS-01", "SIR-01"].map(
    (t): [string, string, string] => [t, "RTU-02", "#7fd1ff"]
  ),
  ...["FM-02", "LV-03"].map((t): [string, string, string] => [
    t,
    "RTU-03",
    "#7fd1ff",
  ]),
  ...["RTU-01", "RTU-02", "RTU-03", "RG-01", "CAM-01"].map(
    (t): [string, string, string] => [t, "COM-01", "#ffd166"]
  ),
  ["COM-01", "SCADA", "#ffffff"],
];

const LABELS: { text: string; pos: V3 }[] = [
  { text: "Spillway gates", pos: [0, 42, 3] },
  { text: "Reservoir", pos: [-10, 28, -90] },
  { text: "Intake tower", pos: [45, 34, -8] },
  { text: "Power house", pos: [40, 17, 37] },
  { text: "Canal head regulator", pos: [-52, 14, 27] },
  { text: "Control room (SCADA)", pos: [CR.x, CR.y + 13, CR.z] },
  { text: "Dam body", pos: [70, 29, 6] },
  { text: "River", pos: [0, 7, 100] },
];

const PRESETS: Record<CamKey, { p: V3; t: V3 }> = {
  overview: { p: [170, 95, 230], t: [0, 12, -25] },
  upstream: { p: [-40, 48, -120], t: [0, 18, 0] },
  gates: { p: [14, 34, 46], t: [0, 20, 0] },
  power: { p: [105, 38, 105], t: [42, 5, 38] },
  canal: { p: [-125, 30, 95], t: [-56, 6, 50] },
  control: { p: [-150, 62, 45], t: [-100, 30, -4] },
  safety: { p: [62, 28, 58], t: [0, 8, 6] },
};

const CAM_BUTTONS: { key: CamKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "upstream", label: "Reservoir" },
  { key: "gates", label: "Gates" },
  { key: "power", label: "Power house" },
  { key: "canal", label: "Canal" },
  { key: "control", label: "Control room" },
  { key: "safety", label: "Dam safety" },
];

const INIT_TARGET: V3 = [0, 12, -25];

// ---------------------------------------------------------------------
// Shared materials / textures
// ---------------------------------------------------------------------

const concreteMat = new THREE.MeshStandardMaterial({
  color: 0xbdb9b0,
  roughness: 0.92,
});
const windowMat = new THREE.MeshStandardMaterial({
  color: 0x9cc7e8,
  emissive: 0x3a6a96,
  emissiveIntensity: 0.5,
});
const lampMat = new THREE.MeshStandardMaterial({
  color: 0xffe9a8,
  emissive: 0xffd36b,
  emissiveIntensity: 0.1,
});

function stripeTexture(rows: number) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#3b8fc6";
  g.fillRect(0, 0, 64, 256);
  const r = rng(5);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.5})`;
    g.fillRect(r() * 60, r() * 250, 1 + r() * 3, 8 + r() * 36);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, rows);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------
// Small 3D building blocks
// ---------------------------------------------------------------------

function Box({
  p,
  s,
  color = 0xcccccc,
  material,
  shadow = true,
  rough = 0.85,
  metal = 0,
  rotation,
}: {
  p: V3;
  s: V3;
  color?: THREE.ColorRepresentation;
  material?: THREE.Material;
  shadow?: boolean;
  rough?: number;
  metal?: number;
  rotation?: V3;
}) {
  return (
    <mesh
      position={p}
      rotation={rotation}
      castShadow={shadow}
      receiveShadow={shadow}
      material={material}
    >
      <boxGeometry args={s} />
      {!material && (
        <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
      )}
    </mesh>
  );
}

function Pipe({
  a,
  b,
  r,
  color,
}: {
  a: V3;
  b: V3;
  r: number;
  color: THREE.ColorRepresentation;
}) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const l = dir.length();
    return {
      pos: va.clone().add(vb).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.normalize()
      ),
      len: l,
    };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, 20]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

// ---------------------------------------------------------------------
// Environment: sky, fog, lights, day / night, shadows, x-ray
// ---------------------------------------------------------------------

function Environment({
  night,
  shadows,
  xray,
}: {
  night: boolean;
  shadows: boolean;
  xray: boolean;
}) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 256;
    const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, 256);
    if (night) {
      gr.addColorStop(0, "#050b1c");
      gr.addColorStop(0.6, "#13233f");
      gr.addColorStop(1, "#26354f");
    } else {
      gr.addColorStop(0, "#6fa6d6");
      gr.addColorStop(0.55, "#b9d7ee");
      gr.addColorStop(1, "#e6eef3");
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
    scene.fog = new THREE.Fog(night ? 0x0b1424 : 0xcfe0ec, 320, 820);
    windowMat.emissiveIntensity = night ? 1.6 : 0.5;
    lampMat.emissiveIntensity = night ? 2.2 : 0.1;
    return () => tex.dispose();
  }, [night, scene]);

  useEffect(() => {
    gl.shadowMap.enabled = shadows;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (!m) return;
      (Array.isArray(m) ? m : [m]).forEach((x) => {
        x.needsUpdate = true;
      });
    });
  }, [shadows, gl, scene]);

  useEffect(() => {
    concreteMat.transparent = xray;
    concreteMat.opacity = xray ? 0.22 : 1;
    concreteMat.depthWrite = !xray;
    concreteMat.needsUpdate = true;
  }, [xray]);

  return (
    <>
      <hemisphereLight
        color={night ? 0x28406a : 0xdcecff}
        groundColor={night ? 0x101820 : 0x5a6b4a}
        intensity={night ? 0.4 : 0.75}
      />
      <directionalLight
        position={night ? [-120, 160, -80] : [140, 190, 120]}
        color={night ? 0x9db8ff : 0xfff3d6}
        intensity={night ? 0.5 : 0.95}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-camera-left={-170}
        shadow-camera-right={170}
        shadow-camera-top={170}
        shadow-camera-bottom={-170}
        shadow-camera-near={20}
        shadow-camera-far={600}
      />
    </>
  );
}

// ---------------------------------------------------------------------
// Terrain, trees
// ---------------------------------------------------------------------

function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(440, 460, 160, 170);
    g.rotateX(-PI / 2);
    const pos = g.attributes.position;
    const n = pos.count;
    const col = new Float32Array(n * 3);
    const rnd = rng(7);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) - 50;
      pos.setZ(i, z);
      const y = T(x, z);
      pos.setY(i, y);
      const j = (rnd() - 0.5) * 0.05;
      let c: number[];
      if (y < -1.2) c = [0.55, 0.5, 0.38];
      else if (y < 1.6) c = [0.74, 0.69, 0.52];
      else if (y < 14) {
        const t = smooth(1.6, 14, y);
        c = [0.74 - 0.38 * t, 0.69 - 0.16 * t, 0.52 - 0.28 * t];
      } else if (y < 32) {
        const t2 = smooth(14, 32, y);
        c = [0.36 + 0.12 * t2, 0.53 - 0.04 * t2, 0.24 + 0.05 * t2];
      } else {
        const t3 = smooth(32, 60, y);
        c = [0.48 + 0.04 * t3, 0.49 - 0.02 * t3, 0.29 + 0.14 * t3];
      }
      col[i * 3] = clamp(c[0] + j, 0, 1);
      col[i * 3 + 1] = clamp(c[1] + j, 0, 1);
      col[i * 3 + 2] = clamp(c[2] + j, 0, 1);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

function Trees() {
  const pts = useMemo(() => {
    const r = rng(21);
    const out: [number, number, number, number][] = [];
    let tries = 0;
    while (out.length < 260 && tries < 4000) {
      tries++;
      const x = (r() - 0.5) * 420;
      const z = -270 + r() * 440;
      const y = T(x, z);
      if (y < 2.5 || y > 36) continue;
      if (z < -2 && y < 21) continue;
      if (x > -102 && x < 102 && z > -6 && z < 26) continue;
      if (x > 20 && x < 76 && z > 22 && z < 54) continue;
      if (x > -70 && x < -42 && z > 18 && z < 104) continue;
      if (x > -112 && x < -88 && z > -16 && z < 8) continue;
      out.push([x, y, z, 2.2 + r() * 2.2]);
    }
    return out;
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    pts.forEach((p, i) => {
      d.position.set(p[0], p[1] + p[3] * 1.1, p[2]);
      d.scale.setScalar(p[3] / 3);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [pts]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pts.length]} castShadow>
      <coneGeometry args={[1.5, 5, 7]} />
      <meshStandardMaterial color={0x2f5d2f} roughness={1} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------
// Water: reservoir, river, tailrace, canal, rain
// ---------------------------------------------------------------------

function Waters({ simRef }: { simRef: MutableRefObject<Sim> }) {
  const reservoir = useRef<THREE.Mesh>(null);
  const river = useRef<THREE.Mesh>(null);
  const riverTex = useMemo(() => stripeTexture(10), []);
  const tailTex = useMemo(() => stripeTexture(2), []);
  const canalTex = useMemo(() => stripeTexture(8), []);

  useFrame((_, d) => {
    const s = simRef.current;
    const dt = s.paused ? 0 : Math.min(d, 0.05) * s.speed;
    if (reservoir.current) reservoir.current.position.y = el2y(s.L);
    if (river.current) {
      river.current.position.y = 0.05 + 0.00055 * s.Qout;
      river.current.scale.x = 1 + s.Qout / 4000;
    }
    riverTex.offset.y += dt * (0.3 + s.Qout / 3000);
    tailTex.offset.y += dt * 0.6;
    canalTex.offset.y += dt * 0.5;
  });

  return (
    <group>
      <mesh
        ref={reservoir}
        rotation={[-PI / 2, 0, 0]}
        position={[0, el2y(488.5), -152]}
        receiveShadow
      >
        <planeGeometry args={[440, 300]} />
        <meshPhongMaterial
          color={0x2b78ad}
          transparent
          opacity={0.86}
          shininess={90}
          specular={0x88aacc}
        />
      </mesh>
      <mesh ref={river} rotation={[-PI / 2, 0, 0]} position={[0, 0.05, 125]}>
        <planeGeometry args={[36, 210]} />
        <meshPhongMaterial map={riverTex} transparent opacity={0.9} shininess={60} />
      </mesh>
      <mesh rotation={[-PI / 2, 0, PI / 2]} position={[18, -0.15, 37]}>
        <planeGeometry args={[20, 8]} />
        <meshPhongMaterial map={tailTex} transparent opacity={0.9} />
      </mesh>
      <mesh rotation={[-PI / 2, 0, 0]} position={[-55, 6.12, 68]}>
        <planeGeometry args={[4, 70]} />
        <meshPhongMaterial map={canalTex} transparent opacity={0.92} />
      </mesh>
    </group>
  );
}

function FlowDirectionArrows() {
  // Reservoir is upstream at negative Z. Releases travel downstream toward +Z.
  // Canal water travels from the head regulator toward the positive-Z side.
  const riverPositions: V3[] = [
    [-5, 1.2, 62],
    [5, 1.2, 88],
    [-5, 1.2, 116],
    [5, 1.2, 144],
  ];
  const canalPositions: V3[] = [
    [-55, 6.8, 43],
    [-55, 6.8, 62],
    [-55, 6.8, 81],
  ];

  return (
    <group>
      {riverPositions.map((position, index) => (
        <group key={`river-flow-${index}`} position={position} rotation={[PI / 2, 0, 0]}>
          <mesh>
            <coneGeometry args={[1.25, 3.8, 8]} />
            <meshBasicMaterial color={0x8be9ff} transparent opacity={0.9} />
          </mesh>
        </group>
      ))}
      {canalPositions.map((position, index) => (
        <group key={`canal-flow-${index}`} position={position} rotation={[PI / 2, 0, 0]}>
          <mesh>
            <coneGeometry args={[0.65, 2.2, 8]} />
            <meshBasicMaterial color={0xffd166} transparent opacity={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Rain({ simRef }: { simRef: MutableRefObject<Sim> }) {
  const N = 2200;
  const geo = useMemo(() => {
    const r = rng(99);
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      a[i * 3] = (r() - 0.5) * 360;
      a[i * 3 + 1] = r() * 90;
      a[i * 3 + 2] = -160 + r() * 300;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0xaed6ff,
        size: 0.7,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    []
  );
  useFrame((_, d) => {
    const s = simRef.current;
    const k = clamp(s.rain / 55, 0, 1);
    mat.opacity = k > 0.01 ? 0.25 + 0.5 * k : 0;
    const n = Math.floor(N * k);
    geo.setDrawRange(0, n);
    if (n === 0 || s.paused) return;
    const attr = geo.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const dy = Math.min(d, 0.05) * s.speed * 70;
    for (let i = 0; i < n; i++) {
      let y = arr[i * 3 + 1] - dy;
      if (y < 0) y += 90;
      arr[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

function WaterTag({ simRef }: { simRef: MutableRefObject<Sim> }) {
  const g = useRef<THREE.Group>(null);
  const d = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const s = simRef.current;
    if (g.current) g.current.position.y = el2y(s.L) + 2.5;
    if (d.current) d.current.textContent = `${fmt(s.L, 2)} m`;
  });
  return (
    <group ref={g} position={[0, el2y(488.5) + 2.5, -60]}>
      <Html center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div
          ref={d}
          className="whitespace-nowrap rounded-full border border-cyan-300/60 bg-cyan-900/80 px-2 py-0.5 text-[11px] font-bold tabular-nums text-cyan-100"
        />
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------
// Dam structure
// ---------------------------------------------------------------------

function damGeo(points: [number, number][], x0: number, x1: number) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false });
  g.rotateY(-PI / 2);
  g.translate(x1, 0, 0);
  return g;
}

const FULL_SHAPE: [number, number][] = [[-2, -6], [-2, 23], [2, 23], [22, 0], [22, -6]];
const SPILL_SHAPE: [number, number][] = [[-2, -6], [-2, 15], [2, 15], [22, 0], [22, -6]];

function DamBody() {
  const geos = useMemo(
    () => [
      damGeo(FULL_SHAPE, -95, -35),
      damGeo(FULL_SHAPE, 35, 95),
      damGeo(SPILL_SHAPE, -35, 35),
    ],
    []
  );
  const lamps = useMemo(() => {
    const out: number[] = [];
    for (let lp = -90; lp <= 90; lp += 15) if (Math.abs(lp) >= 36) out.push(lp);
    return out;
  }, []);
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={concreteMat} castShadow receiveShadow />
      ))}
      {[-65, 65].map((x) => (
        <group key={x}>
          <Box p={[x, 23.1, 0]} s={[60, 0.3, 3.4]} color={0x3a3d42} shadow={false} />
          <Box p={[x, 23.5, -1.7]} s={[60, 0.9, 0.3]} material={concreteMat} />
          <Box p={[x, 23.5, 1.7]} s={[60, 0.9, 0.3]} material={concreteMat} />
        </group>
      ))}
      {lamps.map((lp) => (
        <group key={lp}>
          <Box p={[lp, 25, 1.5]} s={[0.25, 4, 0.25]} color={0x555a60} />
          <mesh position={[lp, 27.2, 1.5]} material={lampMat}>
            <sphereGeometry args={[0.45, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SpillGate({
  index,
  x,
  simRef,
}: {
  index: number;
  x: number;
  simRef: MutableRefObject<Sim>;
}) {
  const gate = useRef<THREE.Mesh>(null);
  const rope = useRef<THREE.Mesh>(null);
  const foam = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => stripeTexture(3), []);
  const flowMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        shininess: 80,
      }),
    [tex]
  );
  const foamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
    []
  );
  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x20c060,
        emissive: 0x20c060,
        emissiveIntensity: 1,
      }),
    []
  );

  useFrame(({ clock }, d) => {
    const s = simRef.current;
    const g = s.gates[index];
    const dt = s.paused ? 0 : Math.min(d, 0.05) * s.speed;
    const gy = 18.7 + g.o * 8;
    if (gate.current) gate.current.position.y = gy;
    const top = gy + 3.7;
    const len = Math.max(0.2, 32.7 - top);
    if (rope.current) {
      rope.current.scale.y = len;
      rope.current.position.y = top + len / 2;
    }
    const q = gateQ(g.o, s.L);
    const vis = g.o > 0.02 ? clamp(q / 700, 0.15, 0.85) : 0;
    flowMat.opacity = vis;
    tex.offset.y += dt * (0.8 + q / 600);
    foamMat.opacity = vis * 0.8;
    const fs = 0.6 + q / 900;
    foam.current?.scale.set(fs, fs, 1);
    const moving = Math.abs(g.target - g.o) > 0.01 && !g.fault;
    const c = g.fault ? 0xff2d2d : moving ? 0xffa800 : 0x20c060;
    ledMat.color.setHex(c);
    ledMat.emissive.setHex(c);
    ledMat.emissiveIntensity = g.fault
      ? 0.4 + 0.6 * (Math.sin(clock.elapsedTime * 8) > 0 ? 1 : 0)
      : 1;
  });

  return (
    <group>
      <mesh ref={gate} position={[x, 18.7, -1.4]} castShadow receiveShadow>
        <boxGeometry args={[10.2, 7.4, 0.8]} />
        <meshStandardMaterial color={0x9a3b2f} roughness={0.6} metalness={0.3} />
      </mesh>
      <Box p={[x, 33.5, -1.4]} s={[2.6, 1.5, 2.4]} color={0xe0a21b} />
      <mesh position={[x, 34.5, -1.4]} material={ledMat}>
        <sphereGeometry args={[0.35, 10, 8]} />
      </mesh>
      <mesh ref={rope} position={[x, 25, -1.4]}>
        <cylinderGeometry args={[0.07, 0.07, 1, 6]} />
        <meshStandardMaterial color={0x222222} />
      </mesh>
      <mesh
        position={[x, 7.7, 12.15]}
        rotation={[-PI / 2 + Math.atan2(15, 20), 0, 0]}
        material={flowMat}
      >
        <planeGeometry args={[9.6, 25]} />
      </mesh>
      <mesh
        ref={foam}
        position={[x, 0.35, 26]}
        rotation={[-PI / 2, 0, 0]}
        material={foamMat}
      >
        <circleGeometry args={[5.6, 20]} />
      </mesh>
    </group>
  );
}

function Spillway({ simRef }: { simRef: MutableRefObject<Sim> }) {
  return (
    <group>
      {PIERX.map((px) => (
        <Box key={`p${px}`} p={[px, 19.75, 4]} s={[2, 9.5, 14]} material={concreteMat} />
      ))}
      <Box p={[0, 24.05, 3.5]} s={[66, 0.9, 6]} material={concreteMat} />
      <Box p={[0, 25.1, 6.4]} s={[66, 0.25, 0.3]} color={0x777c82} />
      {PIERX.map((px) => (
        <Box key={`m${px}`} p={[px, 28.3, -1.4]} s={[0.7, 7.6, 0.7]} color={0x8a8f95} />
      ))}
      <Box p={[0, 32.3, -1.4]} s={[66, 0.8, 2.6]} color={0x8a8f95} />
      {BAYS.map((bx, i) => (
        <SpillGate key={bx} index={i} x={bx} simRef={simRef} />
      ))}
    </group>
  );
}

function SirenLamp({ simRef }: { simRef: MutableRefObject<Sim> }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xff6a00,
        emissive: 0xff6a00,
        emissiveIntensity: 0.2,
      }),
    []
  );
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const on = simRef.current.siren && Math.sin(clock.elapsedTime * 9) > 0;
    mat.emissiveIntensity = simRef.current.siren ? (on ? 1 : 0.3) : 0.15;
    if (light.current) light.current.intensity = on ? 6 : 0;
  });
  return (
    <group position={[SIREN.x, SIREN.y + 7.6, SIREN.z]}>
      <mesh material={mat}>
        <sphereGeometry args={[0.8, 12, 10]} />
      </mesh>
      <pointLight ref={light} color={0xff6a00} intensity={0} distance={60} />
    </group>
  );
}

function Structures({ simRef }: { simRef: MutableRefObject<Sim> }) {
  return (
    <group>
      {/* intake tower and penstock */}
      <Box p={[45, 10.5, -8]} s={[6, 27, 6]} material={concreteMat} />
      <Box p={[45, 25.6, -8]} s={[5, 3.2, 5]} color={0x7c8088} />
      <Box p={[45, 23.2, -4.3]} s={[2.2, 0.35, 5.5]} material={concreteMat} />
      <Box p={[45, 12, -11.2]} s={[5.6, 16, 0.3]} color={0x3a3f46} />
      <Pipe a={[45, 9, -8]} b={[45, 9, 14]} r={2.2} color={0x5b6e82} />
      <Pipe a={[45, 9, 14]} b={[45, 5, 28]} r={2.2} color={0x5b6e82} />

      {/* power house and switchyard */}
      <Box p={[40, 6, 37]} s={[26, 9, 18]} color={0xcfc8b8} />
      <Box p={[40, 11, 37]} s={[27.4, 1, 19.4]} color={0x6b4f45} />
      <Box p={[40, 7, 27.95]} s={[20, 2, 0.15]} material={windowMat} shadow={false} />
      <Box p={[40, 2, 53]} s={[14, 0.4, 5]} color={0x777c82} shadow={false} />
      {[60, 64, 68].map((x) => (
        <Box key={x} p={[x, 3, 36]} s={[2.6, 3.4, 2.6]} color={0x4f8a6a} />
      ))}
      <Box p={[58, 5, 42]} s={[0.4, 7, 0.4]} color={0x555a60} />
      <Box p={[70, 5, 42]} s={[0.4, 7, 0.4]} color={0x555a60} />
      <Box p={[64, 8.4, 42]} s={[12.4, 0.35, 0.35]} color={0x555a60} />

      {/* canal head regulator and canal walls */}
      <Box p={[-52, 7.5, 27]} s={[7, 3, 5]} color={0xcfc8b8} />
      <Box p={[-53.5, 7, 24.3]} s={[1.6, 2, 0.4]} color={0x20a060} />
      <Box p={[-50.5, 7, 24.3]} s={[1.6, 2, 0.4]} color={0x20a060} />
      <Box p={[-57.3, 6.35, 68]} s={[0.5, 0.7, 70]} material={concreteMat} />
      <Box p={[-52.7, 6.35, 68]} s={[0.5, 0.7, 70]} material={concreteMat} />

      {/* control room, comms mast, solar */}
      <Box p={[CR.x, CR.y + 3.5, CR.z]} s={[16, 7, 10]} color={0xd7d2c4} />
      <Box p={[CR.x, CR.y + 7.4, CR.z]} s={[16.6, 0.8, 10.6]} color={0x5b4a44} />
      <Box p={[CR.x, CR.y + 4, CR.z + 5.05]} s={[12, 2.2, 0.15]} material={windowMat} shadow={false} />
      <mesh position={[CR.x + 11, CR.y + 12, CR.z - 2]} castShadow>
        <cylinderGeometry args={[0.5, 1.1, 24, 8]} />
        <meshStandardMaterial color={0xc9ced4} metalness={0.4} roughness={0.85} />
      </mesh>
      <mesh position={[CR.x + 11, CR.y + 21, CR.z - 2]} rotation={[PI / 2, 0, -0.4]}>
        <sphereGeometry args={[1.8, 16, 8, 0, PI * 2, 0, PI / 2]} />
        <meshStandardMaterial color={0xf0f0f0} side={THREE.DoubleSide} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh
          key={k}
          position={[
            CR.x + 11 + Math.cos(k * 2.09) * 1.2,
            CR.y + 24,
            CR.z - 2 + Math.sin(k * 2.09) * 1.2,
          ]}
        >
          <boxGeometry args={[0.4, 3, 0.25]} />
          <meshStandardMaterial color={0x222222} />
        </mesh>
      ))}
      {[0, 1, 2].map((k) => (
        <Box
          key={k}
          p={[CR.x - 14 + k * 5.6, CR.y + 2.2, CR.z + 12]}
          s={[5, 0.2, 3]}
          color={0x1c2f5a}
          rough={0.3}
          metal={0.5}
          shadow={false}
          rotation={[-0.5, 0, 0]}
        />
      ))}

      {/* weather mast, siren pole, CCTV pole */}
      <Box p={[AWS.x, AWS.y + 2.5, AWS.z]} s={[0.3, 5, 0.3]} color={0xc9ced4} />
      <Box p={[AWS.x + 1.2, AWS.y + 1.2, AWS.z]} s={[1.6, 0.9, 1.6]} color={0xf0f0f0} />
      <Box p={[SIREN.x, SIREN.y + 3.5, SIREN.z]} s={[0.4, 7, 0.4]} color={0x555a60} />
      <SirenLamp simRef={simRef} />
      <Box p={[CAM.x, 25, CAM.z]} s={[0.3, 4, 0.3]} color={0x555a60} />
      <Box p={[CAM.x, 27.2, CAM.z]} s={[0.9, 0.6, 1.2]} color={0x222222} />
    </group>
  );
}

function Gallery({ visible }: { visible: boolean }) {
  return (
    <mesh position={[0, 5, 6]} rotation={[0, 0, PI / 2]} visible={visible}>
      <cylinderGeometry args={[1.2, 1.2, 190, 14]} />
      <meshStandardMaterial color={0x2c2f34} roughness={0.6} />
    </mesh>
  );
}

// ---------------------------------------------------------------------
// Instrument markers, data links, labels
// ---------------------------------------------------------------------

const C_BAD = new THREE.Color("#ff2d2d");

function Marker({
  d,
  tex,
  selected,
  simRef,
  onSelect,
}: {
  d: Instrument;
  tex: THREE.Texture;
  selected: boolean;
  simRef: MutableRefObject<Sim>;
  onSelect: (tag: string) => void;
}) {
  const normal = useMemo(() => new THREE.Color(CAT_COLOR[d.cat]), [d.cat]);
  const sprite = useRef<THREE.Sprite>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const glowMat = useRef<THREE.SpriteMaterial>(null);
  useFrame(({ clock }) => {
    const pulse = 1 + 0.18 * Math.sin(clock.elapsedTime * 3);
    const sc = (selected ? 9 : 6) * pulse;
    sprite.current?.scale.set(sc, sc, 1);
    const c = isBad(d.tag, simRef.current) ? C_BAD : normal;
    coreMat.current?.color.copy(c);
    glowMat.current?.color.copy(c);
  });
  return (
    <group position={d.pos}>
      <mesh renderOrder={10}>
        <sphereGeometry args={[0.85, 14, 10]} />
        <meshBasicMaterial ref={coreMat} color={CAT_COLOR[d.cat]} depthTest={false} />
      </mesh>
      <sprite ref={sprite} renderOrder={9} scale={[6, 6, 1]}>
        <spriteMaterial
          ref={glowMat}
          map={tex}
          color={CAT_COLOR[d.cat]}
          transparent
          depthTest={false}
          opacity={0.9}
        />
      </sprite>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(d.tag);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[2.6, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Markers({
  simRef,
  selected,
  onSelect,
}: {
  simRef: MutableRefObject<Sim>;
  selected: string | null;
  onSelect: (tag: string) => void;
}) {
  const tex = useMemo(() => glowTexture(), []);
  return (
    <group>
      {INSTRUMENTS.map((d) => (
        <Marker
          key={d.tag}
          d={d}
          tex={tex}
          selected={selected === d.tag}
          simRef={simRef}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function DataLinks() {
  const { lines, mats } = useMemo(() => {
    const mats: THREE.LineDashedMaterial[] = [];
    const lines = LINKS.map(([a, b, color]) => {
      const pa = BY_TAG[a].pos;
      const pb = BY_TAG[b].pos;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...pa),
        new THREE.Vector3(...pb),
      ]);
      const m = new THREE.LineDashedMaterial({
        color,
        dashSize: 2.2,
        gapSize: 1.6,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
      });
      const line = new THREE.Line(geo, m);
      line.computeLineDistances();
      line.renderOrder = 8;
      mats.push(m);
      return line;
    });
    return { lines, mats };
  }, []);
  useFrame((_, d) => {
    mats.forEach((m) => {
      const dm = m as THREE.LineDashedMaterial & { dashOffset: number };
      dm.dashOffset -= d * 4;
    });
  });
  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
    </group>
  );
}

function Labels() {
  return (
    <group>
      {LABELS.map((l) => (
        <group key={l.text} position={l.pos}>
          <Html center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded border border-white/70 bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold text-white">
              {l.text}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------
// Camera rig (smooth preset moves) and simulation driver
// ---------------------------------------------------------------------

function CameraRig({
  cmd,
  onUser,
}: {
  cmd: MutableRefObject<CamCmd | null>;
  onUser: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const tw = useRef<{
    t0: number;
    dur: number;
    p0: THREE.Vector3;
    q0: THREE.Vector3;
    p1: THREE.Vector3;
    q1: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    if (!controls) return;
    const h = () => {
      tw.current = null;
      onUser();
    };
    controls.addEventListener("start", h);
    return () => controls.removeEventListener("start", h);
  }, [controls, onUser]);

  useFrame(() => {
    const c = cmd.current;
    if (c && controls) {
      cmd.current = null;
      tw.current = {
        t0: performance.now(),
        dur: c.dur * 1000,
        p0: camera.position.clone(),
        q0: controls.target.clone(),
        p1: new THREE.Vector3(...c.p),
        q1: new THREE.Vector3(...c.t),
      };
    }
    const t = tw.current;
    if (!t || !controls) return;
    const k = clamp((performance.now() - t.t0) / t.dur, 0, 1);
    const e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(t.p0, t.p1, e);
    controls.target.lerpVectors(t.q0, t.q1, e);
    if (k >= 1) tw.current = null;
  });
  return null;
}

function SimDriver({
  simRef,
  histRef,
  pushLog,
  onSnap,
}: {
  simRef: MutableRefObject<Sim>;
  histRef: MutableRefObject<HistPt[]>;
  pushLog: LogFn;
  onSnap: (s: Snap) => void;
}) {
  const snapAcc = useRef(0);
  const histAcc = useRef(0);
  useFrame((_, delta) => {
    const s = simRef.current;
    stepSim(s, Math.min(0.05, delta), pushLog);
    if (!s.paused) histAcc.current += delta;
    if (histAcc.current > 0.5) {
      histAcc.current = 0;
      const h = histRef.current;
      h.push({ t: s.t, L: s.L, Qin: s.Qin, Qout: s.Qout });
      if (h.length > HIST_MAX) h.shift();
    }
    snapAcc.current += delta;
    if (snapAcc.current > 0.2) {
      snapAcc.current = 0;
      onSnap(makeSnap(s, histRef.current));
    }
  });
  return null;
}

function GlGrab({ glRef }: { glRef: MutableRefObject<THREE.WebGLRenderer | null> }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    glRef.current = gl;
  }, [gl, glRef]);
  return null;
}

// ---------------------------------------------------------------------
// The whole 3D world (memoised: it does not re-render on HUD updates)
// ---------------------------------------------------------------------

interface WorldProps {
  simRef: MutableRefObject<Sim>;
  camCmd: MutableRefObject<CamCmd | null>;
  showInst: boolean;
  showLinks: boolean;
  showLabels: boolean;
  xray: boolean;
  night: boolean;
  shadows: boolean;
  autoOrbit: boolean;
  selected: string | null;
  onSelect: (tag: string) => void;
  onUserOrbit: () => void;
}

const World = memo(function World(p: WorldProps) {
  return (
    <>
      <Environment night={p.night} shadows={p.shadows} xray={p.xray} />
      <Terrain />
      <Trees />
      <Waters simRef={p.simRef} />
      <FlowDirectionArrows />
      <DamBody />
      <Spillway simRef={p.simRef} />
      <Structures simRef={p.simRef} />
      <Gallery visible={p.xray} />
      <Rain simRef={p.simRef} />
      <WaterTag simRef={p.simRef} />
      {p.showInst && (
        <Markers simRef={p.simRef} selected={p.selected} onSelect={p.onSelect} />
      )}
      {p.showLinks && <DataLinks />}
      {p.showLabels && <Labels />}
      <CameraRig cmd={p.camCmd} onUser={p.onUserOrbit} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={12}
        maxDistance={560}
        maxPolarAngle={PI / 2 - 0.03}
        autoRotate={p.autoOrbit}
        autoRotateSpeed={0.5}
        target={INIT_TARGET}
      />
    </>
  );
});

// ---------------------------------------------------------------------
// HUD building blocks
// ---------------------------------------------------------------------

function Btn({
  on,
  danger,
  onClick,
  children,
  title,
  className = "",
}: {
  on?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  const style = on
    ? "border-sky-500 bg-sky-600 text-white"
    : danger
      ? "border-red-500/70 bg-slate-800 text-red-300 hover:bg-red-950"
      : "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${style} ${className}`}
    >
      {children}
    </button>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <h4 className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wider text-sky-400 first:mt-0">
      {children}
    </h4>
  );
}

function Reading({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex justify-between border-b border-dashed border-slate-700 py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className="tabular-nums">
        <b>{value}</b>
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

function Trend({
  data,
  series,
  min,
  max,
  refs,
  h = 64,
}: {
  data: HistPt[];
  series: { key: "L" | "Qin" | "Qout"; color: string }[];
  min: number;
  max: number;
  refs?: { v: number; color: string }[];
  h?: number;
}) {
  const w = 240;
  const y = (v: number) => h - clamp((v - min) / (max - min), 0, 1) * h;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full rounded-md bg-slate-900"
      style={{ height: h }}
    >
      {refs?.map((r, i) => (
        <line
          key={i}
          x1={0}
          x2={w}
          y1={y(r.v)}
          y2={y(r.v)}
          stroke={r.color}
          strokeDasharray="3 3"
          strokeWidth={0.8}
          opacity={0.7}
        />
      ))}
      {series.map((s) => (
        <polyline
          key={s.key}
          fill="none"
          stroke={s.color}
          strokeWidth={1.5}
          points={data
            .map(
              (d, i) =>
                `${((i + HIST_MAX - data.length) / (HIST_MAX - 1)) * w},${y(d[s.key])}`
            )
            .join(" ")}
        />
      ))}
    </svg>
  );
}

const GAUGE_TICKS = [
  { v: LV.CREST, l: "Crest 496" },
  { v: LV.DANGER, l: "Danger 493.5" },
  { v: LV.ALERT, l: "Alert 492" },
  { v: LV.FRL, l: "FRL 490" },
  { v: LV.SILL, l: "Gate sill 480" },
  { v: LV.MDDL, l: "MDDL 470" },
];
const GAUGE_MIN = 470;
const GAUGE_MAX = 497;

// ---------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------

function DamScene() {
  const [sim0] = useState(createSim);
  const simRef = useRef<Sim>(sim0);
  const histRef = useRef<HistPt[]>([]);
  const camCmd = useRef<CamCmd | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const idRef = useRef(1);

  const [snap, setSnap] = useState<Snap>(() => makeSnap(sim0, []));
  const [events, setEvents] = useState<EventItem[]>([
    { id: 0, t: clockStr(sim0.clock), text: "System online, AUTO mode", tone: "ok" },
  ]);
  const [acked, setAcked] = useState<AlarmState | null>(null);

  const [leftOpen, setLeftOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 820
  );
  const [rightOpen, setRightOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 820
  );
  const [showInst, setShowInst] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [xray, setXray] = useState(false);
  const [shadows, setShadows] = useState(true);
  const [night, setNight] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string>("All");
  const [touring, setTouring] = useState(false);
  const [tourText, setTourText] = useState("");
  const tourTimers = useRef<number[]>([]);

  const pushLog = useCallback<LogFn>((text, tone) => {
    const item: EventItem = {
      id: idRef.current++,
      t: clockStr(simRef.current.clock),
      text,
      tone,
    };
    setEvents((p) => [item, ...p].slice(0, 60));
  }, []);

  const refresh = useCallback(() => {
    setSnap(makeSnap(simRef.current, histRef.current));
  }, []);

  useEffect(() => {
    if (snap.alarm === "NORMAL") setAcked(null);
  }, [snap.alarm]);

  // ---- camera / tour -------------------------------------------------
  const goCam = useCallback((k: CamKey, dur = 1.2) => {
    const q = PRESETS[k];
    camCmd.current = { p: q.p, t: q.t, dur };
  }, []);

  const stopTour = useCallback(() => {
    tourTimers.current.forEach((id) => window.clearTimeout(id));
    tourTimers.current = [];
    setTouring(false);
  }, []);

  const select = useCallback((tag: string, focus: boolean) => {
    setSelected(tag);
    setRightOpen(true);
    if (focus) {
      const p = BY_TAG[tag].pos;
      camCmd.current = {
        p: [p[0] + 28, p[1] + 16, p[2] + 38],
        t: p,
        dur: 1.2,
      };
    }
  }, []);
  const onSelectMarker = useCallback((tag: string) => select(tag, false), [select]);

  // ---- scenario / mode handlers ---------------------------------------
  const setScenario = useCallback(
    (name: Scenario | "RESET") => {
      if (name === "RESET") {
        setEvents([]);
        histRef.current = [];
        setAcked(null);
      }
      applyScenario(simRef.current, name, pushLog);
      refresh();
    },
    [pushLog, refresh]
  );

  const setMode = (m: Mode) => {
    const s = simRef.current;
    if (m === "MANUAL") s.manual = s.gates.map((g) => g.o);
    s.mode = m;
    pushLog(m === "AUTO" ? "Mode: AUTO" : "Mode: MANUAL, operator control", m === "AUTO" ? "ok" : "warn");
    refresh();
  };

  const startTour = () => {
    stopTour();
    setTouring(true);
    const steps: { cam: CamKey; text: string; act?: () => void }[] = [
      { cam: "overview", text: "Overview: the dam, reservoir, spillway gates, power house, canal and control room. Every coloured marker is an instrument or panel.", act: () => setScenario("NORMAL") },
      { cam: "upstream", text: "Level sensing: radar and pressure sensors measure the reservoir level. A rain gauge on the hill gives early warning of inflow.", act: () => setScenario("FLOOD") },
      { cam: "gates", text: "Automatic gate control: as the level rises, the RTU opens the gates in sequence. Each gate has a position encoder for feedback." },
      { cam: "power", text: "Power house: the penstock flow meter and turbine data are collected by a second RTU panel." },
      { cam: "canal", text: "Irrigation canal: the canal RTU controls the head regulator and measures discharge for water accounting." },
      { cam: "safety", text: "Dam safety: piezometers, tiltmeter, seepage weir and accelerograph watch the structure from inside the gallery.", act: () => setXray(true) },
      { cam: "control", text: "Control room: SCADA receives all data over GSM, radio or fibre, raises alarms and lets operators take manual control.", act: () => setXray(false) },
      { cam: "overview", text: "End of tour. Try the buttons on the left: gate fault, seepage alarm, sensor drift or manual gate control." },
    ];
    steps.forEach((s, i) => {
      tourTimers.current.push(
        window.setTimeout(() => {
          setTourText(`${i + 1} / ${steps.length}   ${s.text}`);
          goCam(s.cam, 1.6);
          s.act?.();
          if (i === steps.length - 1)
            tourTimers.current.push(window.setTimeout(stopTour, 9000));
        }, i * 9500)
      );
    });
  };

  useEffect(() => () => stopTour(), [stopTour]);

  // ---- keyboard shortcuts ---------------------------------------------
  useEffect(() => {
    const keys: CamKey[] = ["overview", "upstream", "gates", "power", "canal", "control", "safety"];
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key >= "1" && e.key <= "7") {
        stopTour();
        goCam(keys[Number(e.key) - 1]);
      } else if (e.key === " ") {
        e.preventDefault();
        simRef.current.paused = !simRef.current.paused;
        refresh();
      } else if (e.key === "n" || e.key === "N") setNight((v) => !v);
      else if (e.key === "t" || e.key === "T") {
        if (tourTimers.current.length) stopTour();
        else startTour();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goCam, refresh, stopTour]);

  // ---- exports ----------------------------------------------------------
  const download = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  };
  const exportLog = () => {
    const rows = [
      "time,severity,event",
      ...events
        .slice()
        .reverse()
        .map((e) => `${e.t},${e.tone},"${e.text.replace(/"/g, '""')}"`),
    ];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    download(url, "dam-event-log.csv");
    URL.revokeObjectURL(url);
  };
  const screenshot = () => {
    const gl = glRef.current;
    if (gl) download(gl.domElement.toDataURL("image/png"), "dam-digital-twin.png");
  };

  // ---- derived -----------------------------------------------------------
  const tone = alarmTone(snap.alarm);
  const unacked = snap.alarm !== "NORMAL" && acked !== snap.alarm;
  const bannerText =
    snap.alarm === "SEEPAGE"
      ? "SEEPAGE HIGH: SW-01 above 12 l/min, inspection requested"
      : snap.alarm === "SENSOR"
        ? "SENSOR DEVIATION: RL-01 and RL-02 disagree, control is using RL-02"
        : snap.alarm === "WARNING"
          ? "WARNING: reservoir above full reservoir level (490 m)"
          : `${snap.alarm}: reservoir level ${fmt(snap.L, 2)} m, flood siren ${snap.siren ? "ON" : "off"}`;
  const levelPct = clamp((snap.L - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN), 0, 1) * 100;
  const fullPct = clamp(((snap.L - LV.MDDL) / (LV.FRL - LV.MDDL)) * 100, 0, 999);
  const sel = selected ? BY_TAG[selected] : null;
  const split = snap.Qout > 1 ? [snap.Qg, snap.Qp, snap.Qc].map((v) => (v / snap.Qout) * 100) : [0, 0, 0];

  const panelBase =
    "absolute top-14 bottom-20 z-10 w-72 max-w-[calc(100%-1rem)] overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-950/90 p-3 text-xs text-slate-200 backdrop-blur-md";

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-slate-200">
      {/* ================= 3D CANVAS ================= */}
      <div className="absolute inset-0">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [170, 95, 230], fov: 45, near: 0.5, far: 2000 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <SimDriver simRef={simRef} histRef={histRef} pushLog={pushLog} onSnap={setSnap} />
          <GlGrab glRef={glRef} />
          <World
            simRef={simRef}
            camCmd={camCmd}
            showInst={showInst}
            showLinks={showLinks}
            showLabels={showLabels}
            xray={xray}
            night={night}
            shadows={shadows}
            autoOrbit={autoOrbit}
            selected={selected}
            onSelect={onSelectMarker}
            onUserOrbit={stopTour}
          />
        </Canvas>
      </div>

      {/* ================= HEADER ================= */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-3 bg-slate-900/95 px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <div className="hidden text-[10px] font-bold tracking-widest text-slate-400 sm:block">
            CHETAS CONTROL SYSTEMS PVT LTD
          </div>
          <div className="truncate text-sm font-bold text-white sm:text-base">
            Dam Automation: interactive 3D digital twin
          </div>
        </div>
        <div className="flex-1" />
        <div className="hidden text-right text-[11px] tabular-nums text-slate-400 md:block">
          <div>{clockStr(snap.clock)} (sim)</div>
          <div>{snap.paused ? "PAUSED" : `${snap.speed.toFixed(1)}x`}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${TONE_BG[tone]}`}>
          {snap.alarm}
        </span>
        <Btn onClick={() => setLeftOpen((v) => !v)}>Controls</Btn>
        <Btn onClick={() => setRightOpen((v) => !v)}>Instruments</Btn>
      </div>

      {/* ================= ALARM BANNER ================= */}
      {snap.alarm !== "NORMAL" && (
        <div
          className={`absolute left-1/2 top-14 z-30 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-1.5 text-sm font-bold text-white shadow-lg ${TONE_BG[tone]} ${unacked ? "animate-pulse" : ""}`}
        >
          <span>{bannerText}</span>
          {unacked ? (
            <button
              type="button"
              className="rounded border border-white/70 px-2 py-0.5 text-xs hover:bg-white/20"
              onClick={() => {
                setAcked(snap.alarm);
                pushLog("Alarm acknowledged by operator", "ok");
              }}
            >
              ACK
            </button>
          ) : (
            <span className="text-xs font-semibold opacity-80">acknowledged</span>
          )}
        </div>
      )}

      {/* ================= LEFT PANEL ================= */}
      {leftOpen && (
        <aside className={`${panelBase} left-2`}>
          <Section>Scenario</Section>
          <div className="flex flex-wrap gap-1.5">
            <Btn on={snap.scenario === "NORMAL"} onClick={() => setScenario("NORMAL")}>Normal</Btn>
            <Btn on={snap.scenario === "FLOOD"} onClick={() => setScenario("FLOOD")}>Monsoon flood</Btn>
            <Btn on={snap.scenario === "FAULT"} onClick={() => setScenario("FAULT")}>Gate 3 fault</Btn>
            <Btn on={snap.scenario === "SEEP"} onClick={() => setScenario("SEEP")}>Seepage alarm</Btn>
            <Btn on={snap.scenario === "DRIFT"} onClick={() => setScenario("DRIFT")}>Sensor drift</Btn>
            <Btn danger onClick={() => setScenario("RESET")}>Reset</Btn>
          </div>

          <Section>Control mode</Section>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn on={snap.mode === "AUTO"} onClick={() => setMode("AUTO")}>AUTO</Btn>
            <Btn on={snap.mode === "MANUAL"} onClick={() => setMode("MANUAL")}>MANUAL</Btn>
          </div>

          <Section>Simulation</Section>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-slate-400">Flood severity</span>
            <b className="tabular-nums text-sky-400">{(snap.floodIntensity * 100).toFixed(0)}%</b>
          </div>
          <input
            type="range" min={0.3} max={1.3} step={0.05}
            value={snap.floodIntensity}
            onChange={(e) => { simRef.current.floodIntensity = Number(e.target.value); refresh(); }}
            className="w-full accent-sky-400"
          />
          <div className="mb-1 mt-2 flex items-center justify-between">
            <span className="text-slate-400">Custom inflow</span>
            <b className="tabular-nums text-sky-400">
              {snap.scenario === "CUSTOM" ? `${snap.customQin.toFixed(0)} m3/s` : "off"}
            </b>
          </div>
          <input
            type="range" min={0} max={5500} step={50}
            value={snap.customQin}
            onChange={(e) => {
              const s = simRef.current;
              s.customQin = Number(e.target.value);
              s.scenario = "CUSTOM";
              refresh();
            }}
            className="w-full accent-sky-400"
          />
          <div className="mb-1 mt-2 flex items-center justify-between">
            <span className="text-slate-400">Speed</span>
            <b className="tabular-nums text-cyan-400">{snap.speed.toFixed(1)}x</b>
          </div>
          <input
            type="range" min={0.5} max={4} step={0.5}
            value={snap.speed}
            onChange={(e) => { simRef.current.speed = Number(e.target.value); refresh(); }}
            className="w-full accent-cyan-400"
          />
          <div className="mt-2">
            <Btn
              on={snap.paused}
              className="w-full"
              onClick={() => { simRef.current.paused = !simRef.current.paused; refresh(); }}
            >
              {snap.paused ? "Resume simulation (Space)" : "Pause simulation (Space)"}
            </Btn>
          </div>

          <Section>Reservoir</Section>
          <div className="flex gap-3">
            <div className="relative h-44 w-6 shrink-0 overflow-hidden rounded border border-slate-600 bg-slate-800">
              <div
                className="absolute bottom-0 left-0 right-0 transition-[height] duration-200"
                style={{ height: `${levelPct}%`, background: TONE_HEX[tone] }}
              />
            </div>
            <div className="relative h-44 flex-1">
              {GAUGE_TICKS.map((t) => (
                <div
                  key={t.l}
                  className="absolute left-0 right-0 flex items-center gap-1 text-[9px] leading-none text-slate-400"
                  style={{ bottom: `${((t.v - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100}%`, transform: "translateY(50%)" }}
                >
                  <span className="h-px w-2 bg-slate-500" />
                  {t.l}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-cyan-400">{fmt(snap.L, 2)} m</div>
          <div className="text-[11px] text-slate-400">
            Live storage above MDDL: <b className="tabular-nums text-slate-200">{fmt(snap.storage, 0)} MCM</b>{" "}
            ({fmt(fullPct, 0)}% of FRL)
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {snap.etaH !== null
              ? `Rising: Alert level in about ${snap.etaH < 1 ? `${fmt(snap.etaH * 60, 0)} min` : `${fmt(snap.etaH, 1)} h`} (sim time)`
              : snap.Qin - snap.Qout < -1
                ? "Level falling"
                : "Level steady"}
          </div>

          <Section>Water flow direction</Section>
          <div className="mb-2 rounded-md border border-slate-700 bg-slate-900/80 p-2 text-[10px] leading-relaxed">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-cyan-300">➜</span>
              <span><b className="text-cyan-200">River / spillway:</b> downstream, away from the dam</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-base font-bold text-amber-300">➜</span>
              <span><b className="text-amber-200">Canal:</b> from head regulator into the canal</span>
            </div>
            <div className="mt-1 text-slate-500">Animated water textures move in the indicated direction.</div>
          </div>

          <Section>Live readings (simulated)</Section>
          <div className="grid grid-cols-2 gap-x-3">
            <Reading label="Inflow" value={fmt(snap.Qin, 0)} unit="m3/s" />
            <Reading label="Outflow" value={fmt(snap.Qout, 0)} unit="m3/s" />
            <Reading label="Penstock" value={fmt(snap.Qp, 0)} unit="m3/s" />
            <Reading label="Canal" value={fmt(snap.Qc, 0)} unit="m3/s" />
            <Reading label="Power" value={fmt(snap.MW, 1)} unit="MW" />
            <Reading label="River" value={fmt(snap.river, 2)} unit="m" />
            <Reading label="Rain" value={fmt(snap.rain, 0)} unit="mm/h" />
            <Reading label="Seepage" value={fmt(snap.seep, 1)} unit="l/min" />
          </div>
          <div className="mt-2 text-[10px] text-slate-400">Discharge split: spillway / penstock / canal</div>
          <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="bg-sky-500" style={{ width: `${split[0]}%` }} />
            <div className="bg-emerald-500" style={{ width: `${split[1]}%` }} />
            <div className="bg-amber-500" style={{ width: `${split[2]}%` }} />
          </div>

          <Section>Spillway gates</Section>
          {snap.gates.map((g, i) => (
            <div key={i} className="my-1 grid grid-cols-[28px_1fr_58px] items-center gap-2">
              <span className="font-semibold">G{i + 1}</span>
              <input
                type="range" min={0} max={100}
                value={Math.round(snap.manual[i] * 100)}
                disabled={snap.mode !== "MANUAL"}
                onChange={(e) => { simRef.current.manual[i] = Number(e.target.value) / 100; refresh(); }}
                className="w-full accent-sky-400 disabled:opacity-40"
              />
              <span className={`text-right tabular-nums ${g.fault ? "font-bold text-red-400" : ""}`}>
                {fmt(g.o * 100, 0)}%{g.fault ? " F" : ""}
              </span>
            </div>
          ))}
          <div className="text-[10px] text-slate-500">Sliders work in MANUAL mode and set the target opening.</div>

          <Section>Trends</Section>
          <div className="mb-1 text-[10px] text-slate-400">Reservoir level (dashed: FRL, Alert, Danger)</div>
          <Trend
            data={snap.hist}
            series={[{ key: "L", color: "#22d3ee" }]}
            min={484} max={497}
            refs={[
              { v: LV.FRL, color: "#34d399" },
              { v: LV.ALERT, color: "#fbbf24" },
              { v: LV.DANGER, color: "#f87171" },
            ]}
          />
          <div className="mb-1 mt-2 text-[10px] text-slate-400">
            Inflow (blue) and outflow (orange), 0 to 6000 m3/s
          </div>
          <Trend
            data={snap.hist}
            series={[{ key: "Qin", color: "#38bdf8" }, { key: "Qout", color: "#fb923c" }]}
            min={0} max={6000}
          />

          <Section>Alarm and event log</Section>
          <div className="space-y-1">
            {events.slice(0, 8).map((e) => (
              <div key={e.id} className={`border-l-4 bg-slate-800/80 px-1.5 py-0.5 text-[11px] ${TONE_BORDER[e.tone]}`}>
                <span className="tabular-nums text-slate-400">{e.t}</span> {e.text}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <Btn onClick={exportLog}>Export CSV</Btn>
            <Btn onClick={() => setEvents([])}>Clear</Btn>
          </div>
          <p className="mt-3 text-[10px] leading-snug text-slate-500">
            Values are simulated for demonstration. Elevations, flows and ratings are illustrative and not from a real dam.
          </p>
        </aside>
      )}

      {/* ================= RIGHT PANEL ================= */}
      {rightOpen && (
        <aside className={`${panelBase} right-2`}>
          {sel && (
            <div className="mb-3 rounded-lg border border-sky-500 bg-slate-800 p-2">
              <div className="text-[11px] text-slate-400">
                <span className="rounded bg-sky-600 px-1.5 py-0.5 font-bold text-white">{sel.tag}</span> {sel.cat}
              </div>
              <h3 className="mb-1 mt-1 text-sm font-bold text-white">{sel.name}</h3>
              <div className="my-1 font-bold text-sky-400">
                Live (simulated): {sel.live(simRef.current)}
              </div>
              {(
                [
                  ["Where", sel.loc],
                  ["Measures", sel.meas],
                  ["Range", sel.range],
                  ["Signal", sel.sig],
                  ["Role in automation", sel.role],
                  ["Limit / action", sel.limit],
                ] as [string, string][]
              ).map(([k, v]) => (
                <p key={k} className="my-0.5 leading-snug">
                  <b>{k}: </b>
                  {v}
                </p>
              ))}
              <div className="mt-2 flex gap-1.5">
                <Btn onClick={() => select(sel.tag, true)}>Fly to</Btn>
                <Btn onClick={() => setSelected(null)}>Close</Btn>
              </div>
            </div>
          )}

          <Section>Instruments and panels</Section>
          <div className="mb-2 flex flex-wrap gap-1">
            {["All", ...Object.keys(CAT_COLOR)].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCatFilter(c)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                  catFilter === c
                    ? "border-sky-500 bg-sky-600 text-white"
                    : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {INSTRUMENTS.filter((d) => catFilter === "All" || d.cat === catFilter).map((d) => (
            <button
              key={d.tag}
              type="button"
              onClick={() => select(d.tag, true)}
              className={`block w-full border-b border-slate-800 px-1 py-1.5 text-left text-xs hover:bg-slate-800 ${
                selected === d.tag ? "bg-slate-800" : ""
              }`}
            >
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{ background: CAT_COLOR[d.cat] }}
              />
              <b>{d.tag}</b> <span className="text-slate-300">{d.name}</span>
            </button>
          ))}
          <p className="mt-3 text-[10px] leading-snug text-slate-500">
            Click a marker in the 3D view, or an item here, for details.
            <br />
            Keys: 1 to 7 cameras, Space pause, N night, T tour.
            <br />
            <br />
            Chetas Control Systems Pvt Ltd
            <br />
            &lsquo;Chetas House&rsquo;, Plot No. 1, Survey No. 8+9, Shree Siddhatek Society, Sutarwadi, Pashan, Pune 411 021
          </p>
        </aside>
      )}

      {/* ================= TOUR CAPTION ================= */}
      {touring && (
        <div className="absolute bottom-20 left-1/2 z-20 w-[min(640px,92vw)] -translate-x-1/2 rounded-xl border border-sky-500 bg-slate-950/95 px-4 py-2.5 text-sm leading-snug text-slate-100 backdrop-blur">
          {tourText || "Starting tour..."}
        </div>
      )}

      {/* ================= BOTTOM BAR ================= */}
      <div className="absolute bottom-2 left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-950/90 p-1.5 backdrop-blur-md">
        {CAM_BUTTONS.map((c) => (
          <Btn key={c.key} onClick={() => { stopTour(); goCam(c.key); }}>
            {c.label}
          </Btn>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-700" />
        <Btn on={showInst} onClick={() => setShowInst((v) => !v)}>Instruments</Btn>
        <Btn on={showLinks} onClick={() => setShowLinks((v) => !v)}>Data links</Btn>
        <Btn on={xray} onClick={() => setXray((v) => !v)}>X-ray</Btn>
        <Btn on={showLabels} onClick={() => setShowLabels((v) => !v)}>Labels</Btn>
        <Btn on={shadows} onClick={() => setShadows((v) => !v)}>Shadows</Btn>
        <Btn on={night} onClick={() => setNight((v) => !v)}>Night</Btn>
        <Btn on={autoOrbit} onClick={() => setAutoOrbit((v) => !v)}>Auto-orbit</Btn>
        <span className="mx-1 h-5 w-px bg-slate-700" />
        <Btn on={touring} onClick={() => (touring ? stopTour() : startTour())}>
          {touring ? "Stop tour" : "Start guided tour"}
        </Btn>
        <Btn onClick={screenshot}>Screenshot</Btn>
      </div>
    </div>
  );
}

export default DamScene;