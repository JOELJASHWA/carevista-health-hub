import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, ZoomIn, ZoomOut, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoNote, Segmented } from "@/components/cv/common";
import { generateEcg } from "@/data/vitals";
import type { Patient } from "@/data/types";

const TRACE_SECONDS = 30;

export function EcgViewer({ patient, hr }: { patient: Patient; hr: number }) {
  const { samples, fs, beats } = useMemo(() => generateEcg(patient, hr, TRACE_SECONDS), [patient, hr]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<"0.5" | "1" | "2">("1");
  const [windowSec, setWindowSec] = useState<"3" | "6" | "10">("6");
  const [gain, setGain] = useState(1);
  const pos = useRef(0); // seconds
  const [, force] = useState(0);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const css = getComputedStyle(document.documentElement);
    const col = (n: string) => css.getPropertyValue(n).trim() || "#0f0";

    const draw = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) pos.current = (pos.current + dt * Number(speed)) % TRACE_SECONDS;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = col("--ecg-bg");
      ctx.fillRect(0, 0, w, h);
      const win = Number(windowSec);
      // grid: 0.2s major, 0.04s minor
      const pxPerSec = w / win;
      ctx.strokeStyle = col("--ecg-grid");
      for (let s = 0; s <= win; s += 0.2) {
        ctx.lineWidth = Math.abs(s - Math.round(s)) < 0.01 ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.moveTo(s * pxPerSec, 0);
        ctx.lineTo(s * pxPerSec, h);
        ctx.stroke();
      }
      ctx.lineWidth = 0.6;
      for (let y = 0; y <= h; y += pxPerSec * 0.2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      // trace
      const start = pos.current;
      const n = Math.floor(win * fs);
      const mid = h * 0.58;
      const amp = h * 0.32 * gain;
      ctx.strokeStyle = col("--ecg-line");
      ctx.lineWidth = 1.8;
      ctx.shadowColor = col("--ecg-line");
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const idx = (Math.floor(start * fs) + i) % samples.length;
        const x = (i / n) * w;
        const y = mid - samples[idx] * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const t = setInterval(() => force((x) => x + 1), 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, [samples, fs, playing, speed, windowSec, gain]);

  // heart rate derived from the simulated beats in the visible window
  const visibleBeats = beats.filter((b) => b >= pos.current && b <= pos.current + Number(windowSec));
  const intervals = visibleBeats.slice(1).map((b, i) => b - visibleBeats[i]);
  const shownHr = intervals.length ? Math.round(60 / (intervals.reduce((a, b) => a + b, 0) / intervals.length)) : hr;

  return (
    <div className="space-y-3">
      <DemoNote>Simulated ECG demonstration – not intended for clinical diagnosis.</DemoNote>
      <div className="panel overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="size-5 animate-pulse text-critical" />
            <span className="num text-2xl font-semibold">{shownHr}</span>
            <span className="text-xs text-muted-foreground">bpm (simulated)</span>
          </div>
          <span className="num text-xs text-muted-foreground">Lead II · 25 mm/s · t = {pos.current.toFixed(1)}s / {TRACE_SECONDS}s</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant={playing ? "secondary" : "default"} onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause ECG" : "Play ECG"}>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />} {playing ? "Pause" : "Play"}
            </Button>
            <Segmented value={speed} onChange={setSpeed} options={[{ value: "0.5", label: "0.5×" }, { value: "1", label: "1×" }, { value: "2", label: "2×" }]} />
            <Segmented value={windowSec} onChange={setWindowSec} options={[{ value: "3", label: "3s" }, { value: "6", label: "6s" }, { value: "10", label: "10s" }]} />
            <Button size="icon" variant="outline" className="size-8" onClick={() => setGain((g) => Math.min(2.5, g + 0.25))} aria-label="Zoom in"><ZoomIn className="size-4" /></Button>
            <Button size="icon" variant="outline" className="size-8" onClick={() => setGain((g) => Math.max(0.5, g - 0.25))} aria-label="Zoom out"><ZoomOut className="size-4" /></Button>
            <Button size="icon" variant="outline" className="size-8" onClick={() => { setGain(1); setSpeed("1"); setWindowSec("6"); pos.current = 0; setPlaying(true); }} aria-label="Reset ECG"><RotateCcw className="size-4" /></Button>
          </div>
        </div>
        <canvas ref={canvasRef} className="block h-72 w-full md:h-80" role="img" aria-label={`Simulated ECG waveform for ${patient.name}`} />
      </div>
    </div>
  );
}
