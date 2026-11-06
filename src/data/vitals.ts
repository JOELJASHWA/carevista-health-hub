import { CONDITIONS } from "./conditions";
import { DAY, HOUR, gauss, mulberry32 } from "./rng";
import type { Patient, Reading, Risk, Thresholds, VitalKey } from "./types";

export const VITALS: Record<
  VitalKey,
  { label: string; short: string; unit: string; decimals: number; color: string }
> = {
  hr: { label: "Heart Rate", short: "HR", unit: "bpm", decimals: 0, color: "var(--chart-4)" },
  sys: { label: "Systolic BP", short: "SYS", unit: "mmHg", decimals: 0, color: "var(--chart-2)" },
  dia: { label: "Diastolic BP", short: "DIA", unit: "mmHg", decimals: 0, color: "var(--chart-6)" },
  spo2: { label: "Oxygen Saturation", short: "SpO₂", unit: "%", decimals: 1, color: "var(--chart-1)" },
  temp: { label: "Body Temperature", short: "TEMP", unit: "°C", decimals: 1, color: "var(--chart-3)" },
  rr: { label: "Respiratory Rate", short: "RR", unit: "br/min", decimals: 0, color: "var(--chart-5)" },
};

export const VITAL_KEYS: VitalKey[] = ["hr", "sys", "dia", "spo2", "temp", "rr"];

export const DEFAULT_THRESHOLDS: Thresholds = {
  hr: [50, 110],
  sys: [90, 150],
  dia: [55, 95],
  spo2: [92, 100],
  temp: [35.5, 38.0],
  rr: [10, 24],
};

const HISTORY_DAYS = 90;
const cache = new Map<string, Reading[]>();

const riskScale: Record<Risk, number> = { Critical: 1, Warning: 0.6, Stable: 0.25 };
const spikeRate: Record<Risk, number> = { Critical: 0.014, Warning: 0.007, Stable: 0.0025 };

/** Hourly synthetic vitals for one patient over the last 90 days, unique per patient seed. */
export function getVitals(p: Patient, anchor: number): Reading[] {
  const key = `${p.id}:${p.seed}:${p.condition}:${p.risk}:${anchor}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const r = mulberry32(p.seed);
  const cond = CONDITIONS[p.condition];
  const child = p.age < 13;
  const base = {
    hr: (child ? 104 : 74) + gauss(r) * 4,
    sys: (child ? 98 : 118 + Math.min(20, Math.max(0, p.age - 40) * 0.4)) + gauss(r) * 4,
    dia: (child ? 62 : 77) + gauss(r) * 3,
    spo2: 97.6 + gauss(r) * 0.4,
    temp: 36.75 + gauss(r) * 0.12,
    rr: (child ? 23 : 15) + gauss(r) * 1,
  };
  const scale = riskScale[p.risk];
  const off = cond?.offset ?? {};
  const vol = cond?.volatility ?? 1;
  // Trend: improving (-) or worsening (+) towards present
  const trendDir = r() < (p.risk === "Critical" ? 0.6 : 0.3) ? 1 : -1;
  const noise = { hr: 3, sys: 4, dia: 3, spo2: 0.5, temp: 0.12, rr: 1 };
  const state = { hr: 0, sys: 0, dia: 0, spo2: 0, temp: 0, rr: 0 };
  const phase = r() * Math.PI * 2;
  const total = HISTORY_DAYS * 24;
  const start = anchor - (total - 1) * HOUR;
  const out: Reading[] = [];
  let spike: { left: number; keys: VitalKey[]; mag: number } | null = null;

  for (let i = 0; i < total; i++) {
    const t = start + i * HOUR;
    const progress = i / total; // 0..1 oldest→newest
    const trend = trendDir > 0 ? 0.55 + progress * 0.7 : 1.25 - progress * 0.75;
    const diurnal = Math.sin(((t / HOUR) % 24) / 24 * Math.PI * 2 + phase);

    if (!spike && r() < spikeRate[p.risk]) {
      const opts: VitalKey[][] = [["hr"], ["sys", "dia"], ["spo2"], ["temp"], ["rr", "hr"], ["spo2", "rr"]];
      spike = { left: 1 + Math.floor(r() * 3), keys: opts[Math.floor(r() * opts.length)], mag: 0.8 + r() * 0.8 };
    }

    for (const k of VITAL_KEYS) {
      state[k] = state[k] * 0.85 + gauss(r) * noise[k] * vol * 0.6;
    }
    const s = spike;
    const sp = (k: VitalKey, amount: number) => (s && s.keys.includes(k) ? amount * s.mag : 0);

    const hr = base.hr + (off.hr ?? 0) * scale * trend + diurnal * 4 + state.hr + sp("hr", 38);
    const sys = base.sys + (off.sys ?? 0) * scale * trend + diurnal * 5 + state.sys + sp("sys", 42);
    const dia = base.dia + (off.dia ?? 0) * scale * trend + diurnal * 3 + state.dia + sp("dia", 24);
    const spo2 = base.spo2 + (off.spo2 ?? 0) * scale * trend + state.spo2 * 0.6 - sp("spo2", 7);
    const temp = base.temp + (off.temp ?? 0) * scale * trend + diurnal * 0.18 + state.temp + sp("temp", 1.6);
    const rr = base.rr + (off.rr ?? 0) * scale * trend + state.rr + sp("rr", 9);

    out.push({
      t,
      hr: Math.round(clamp(hr, 35, 190)),
      sys: Math.round(clamp(sys, 70, 220)),
      dia: Math.round(clamp(Math.min(dia, sys - 20), 40, 130)),
      spo2: round1(clamp(spo2, 78, 100)),
      temp: round1(clamp(temp, 34.8, 41)),
      rr: Math.round(clamp(rr, 8, 48)),
    });
    if (spike) {
      spike.left -= 1;
      if (spike.left <= 0) spike = null;
    }
  }
  cache.set(key, out);
  return out;
}

export function latestReading(p: Patient, anchor: number): Reading {
  const v = getVitals(p, anchor);
  return v[v.length - 1];
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function filterRange(readings: Reading[], from: number, to: number) {
  return readings.filter((r) => r.t >= from && r.t <= to);
}

export interface VitalStats {
  avg: number;
  min: number;
  max: number;
  latest: number;
  trend: "up" | "down" | "flat";
  change: number;
  abnormal: number;
  count: number;
}

export function stats(readings: Reading[], key: VitalKey, th?: Thresholds): VitalStats | null {
  if (!readings.length) return null;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let abnormal = 0;
  for (const r of readings) {
    const v = r[key];
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
    if (th && isAbnormal(key, v, th)) abnormal++;
  }
  const n = readings.length;
  const third = Math.max(1, Math.floor(n / 3));
  const first = readings.slice(0, third).reduce((a, r) => a + r[key], 0) / third;
  const last = readings.slice(-third).reduce((a, r) => a + r[key], 0) / third;
  const change = first === 0 ? 0 : ((last - first) / first) * 100;
  const trend = Math.abs(change) < 1.5 ? "flat" : change > 0 ? "up" : "down";
  return { avg: sum / n, min, max, latest: readings[n - 1][key], trend, change, abnormal, count: n };
}

export function isAbnormal(key: VitalKey, v: number, th: Thresholds) {
  const [lo, hi] = th[key];
  return v < lo || v > hi;
}

export function abnormalReason(key: VitalKey, v: number, th: Thresholds) {
  const [lo, hi] = th[key];
  const meta = VITALS[key];
  if (v < lo) return `${meta.label} below configured minimum of ${lo} ${meta.unit}`;
  if (v > hi) return `${meta.label} above configured maximum of ${hi} ${meta.unit}`;
  return "Within configured range";
}

/** Demonstration-only risk classification from a single set of values. */
export function classify(values: Omit<Reading, "t">, th: Thresholds): { risk: Risk; score: number; flags: VitalKey[] } {
  let score = 0;
  const flags: VitalKey[] = [];
  for (const k of VITAL_KEYS) {
    const v = values[k];
    const [lo, hi] = th[k];
    const span = hi - lo;
    if (v < lo || v > hi) {
      flags.push(k);
      const dist = v < lo ? (lo - v) / span : (v - hi) / span;
      score += dist > 0.15 ? 3 : 2;
    } else {
      const edge = Math.min(v - lo, hi - v) / span;
      if (edge < 0.08) score += 1;
    }
  }
  const risk: Risk = score >= 5 ? "Critical" : score >= 2 ? "Warning" : "Stable";
  return { risk, score, flags };
}

/** Reduce a series to at most `max` points using bucket averages (keeps extremes visible via min/max fields). */
export function downsample(readings: Reading[], max = 180): Reading[] {
  if (readings.length <= max) return readings;
  const size = Math.ceil(readings.length / max);
  const out: Reading[] = [];
  for (let i = 0; i < readings.length; i += size) {
    const chunk = readings.slice(i, i + size);
    const avg = (k: VitalKey) => chunk.reduce((a, r) => a + r[k], 0) / chunk.length;
    out.push({
      t: chunk[Math.floor(chunk.length / 2)].t,
      hr: Math.round(avg("hr")),
      sys: Math.round(avg("sys")),
      dia: Math.round(avg("dia")),
      spo2: round1(avg("spo2")),
      temp: round1(avg("temp")),
      rr: Math.round(avg("rr")),
    });
  }
  return out;
}

export const RANGE_PRESETS = [
  { id: "24h", label: "24 Hours", ms: DAY },
  { id: "7d", label: "7 Days", ms: 7 * DAY },
  { id: "30d", label: "30 Days", ms: 30 * DAY },
  { id: "90d", label: "90 Days", ms: 90 * DAY },
] as const;

/** Synthetic ECG demo trace: per-patient morphology, sampled at `fs` Hz. */
export function generateEcg(p: Patient, hr: number, seconds: number, fs = 250) {
  const r = mulberry32(p.seed ^ 0x9e3779b9);
  const cond = CONDITIONS[p.condition];
  const morph = {
    p: 0.12 + r() * 0.08,
    q: -0.08 - r() * 0.08,
    r: 0.9 + r() * 0.5,
    s: -0.18 - r() * 0.2,
    t: 0.22 + r() * 0.14,
    st: cond?.stElevation ?? 0,
    noise: 0.012 + r() * 0.02,
  };
  const irregular = !!cond?.irregular;
  const samples: number[] = [];
  const beats: number[] = [];
  let tBeat = 0;
  let rr = 60 / hr;
  const n = Math.floor(seconds * fs);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    if (t >= tBeat + rr) {
      tBeat += rr;
      rr = (60 / hr) * (irregular ? 0.7 + r() * 0.6 : 0.97 + r() * 0.06);
      beats.push(tBeat);
    }
    const x = (t - tBeat) / rr; // 0..1 phase in beat
    const g = (mu: number, sd: number, a: number) => a * Math.exp(-((x - mu) ** 2) / (2 * sd * sd));
    let v =
      (irregular ? Math.sin(t * 38) * 0.03 : g(0.16, 0.025, morph.p)) +
      g(0.27, 0.008, morph.q) +
      g(0.3, 0.011, morph.r) +
      g(0.33, 0.01, morph.s) +
      g(0.55, 0.05, morph.t) +
      (x > 0.35 && x < 0.48 ? morph.st : 0);
    v += gauss(r) * morph.noise + Math.sin(t * 0.6) * 0.03;
    samples.push(v);
  }
  return { samples, fs, beats };
}
