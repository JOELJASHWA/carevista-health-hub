import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, RotateCcw, ScanLine, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoNote, EmptyState } from "@/components/cv/common";
import type { XrayImage } from "@/data/types";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function XrayViewer({ images }: { images: XrayImage[] }) {
  const [idx, setIdx] = useState(0);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  if (!images.length)
    return (
      <div className="panel">
        <EmptyState icon={ScanLine} title="No imaging on file" description="No X-ray studies are recorded for this patient's demo condition." />
      </div>
    );

  const img = images[Math.min(idx, images.length - 1)];
  const reset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };
  const go = (d: number) => {
    setIdx((i) => (i + d + images.length) % images.length);
    reset();
  };

  return (
    <div className="space-y-3">
      <DemoNote>Demonstration radiographs (generated imagery). Not this patient's real imaging and not for diagnosis.</DemoNote>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="panel overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
            <Button size="icon" variant="outline" className="size-8" onClick={() => go(-1)} aria-label="Previous image" disabled={images.length < 2}><ChevronLeft className="size-4" /></Button>
            <span className="num text-xs text-muted-foreground">{idx + 1} / {images.length}</span>
            <Button size="icon" variant="outline" className="size-8" onClick={() => go(1)} aria-label="Next image" disabled={images.length < 2}><ChevronRight className="size-4" /></Button>
            <div className="ml-auto flex items-center gap-2">
              <span className="num w-12 text-right text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
              <Button size="icon" variant="outline" className="size-8" onClick={() => setScale((s) => Math.min(5, s * 1.25))} aria-label="Zoom in"><ZoomIn className="size-4" /></Button>
              <Button size="icon" variant="outline" className="size-8" onClick={() => setScale((s) => Math.max(0.5, s / 1.25))} aria-label="Zoom out"><ZoomOut className="size-4" /></Button>
              <Button size="sm" variant="outline" className="h-8" onClick={reset}><Maximize className="size-4" />Fit</Button>
              <Button size="icon" variant="outline" className="size-8" onClick={reset} aria-label="Reset zoom"><RotateCcw className="size-4" /></Button>
            </div>
          </div>
          <div
            className={cn("relative h-[420px] touch-none overflow-hidden bg-black select-none md:h-[520px]", scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
            onWheel={(e) => setScale((s) => Math.min(5, Math.max(0.5, s * (e.deltaY < 0 ? 1.1 : 0.9))))}
            onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2))}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              setPan({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y });
            }}
            onPointerUp={() => (drag.current = null)}
          >
            <img
              src={img.src}
              alt={`${img.region} ${img.view} demonstration radiograph`}
              draggable={false}
              className="absolute inset-0 m-auto h-full w-full object-contain transition-transform duration-75"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
            />
          </div>
        </div>
        <div className="space-y-3">
          <div className="panel space-y-2 p-4 text-sm">
            <p className="eyebrow">Image information</p>
            <Info k="Study" v={`${img.region} – ${img.view}`} />
            <Info k="Study ID" v={img.id} mono />
            <Info k="Acquired" v={fmtDateTime(img.date)} />
            <Info k="Technician" v={img.technician} />
            <Info k="Notes" v={img.findings} />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
            {images.map((im, i) => (
              <button key={im.id} onClick={() => { setIdx(i); reset(); }} className={cn("overflow-hidden rounded-lg border-2 bg-black", i === idx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")} aria-label={`Show ${im.region} image`}>
                <img src={im.src} alt="" className="aspect-square w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("text-right", mono && "num")}>{v}</span>
    </div>
  );
}
