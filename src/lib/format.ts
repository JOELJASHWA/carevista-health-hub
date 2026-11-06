const IN = "en-IN";

export const fmtDate = (t: number) => new Date(t).toLocaleDateString(IN, { day: "2-digit", month: "short", year: "numeric" });
export const fmtShortDate = (t: number) => new Date(t).toLocaleDateString(IN, { day: "2-digit", month: "short" });
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString(IN, { hour: "2-digit", minute: "2-digit" });
export const fmtDateTime = (t: number) => `${fmtDate(t)}, ${fmtTime(t)}`;
export const fmtAxis = (t: number, spanMs: number) =>
  spanMs <= 36 * 3600_000 ? fmtTime(t) : new Date(t).toLocaleDateString(IN, { day: "2-digit", month: "short" });

export function fmtRelative(t: number, now = Date.now()) {
  const diff = now - t;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const suffix = diff >= 0 ? "ago" : "from now";
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ${suffix}`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ${suffix}`;
  const d = Math.round(h / 24);
  return `${d} d ${suffix}`;
}

export const fmtNum = (n: number, decimals = 0) =>
  n.toLocaleString(IN, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

export const toInputDate = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const toInputTime = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const fromInputs = (date: string, time = "00:00") => new Date(`${date}T${time}`).getTime();

export const initials = (name: string) =>
  name
    .replace("Dr. ", "")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
