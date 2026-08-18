import { cn } from "@/lib/utils";

export function Progress({ value = 0, className, barClassName }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct > 85 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-accent";
  return (
    <div className={cn("w-full h-1.5 bg-white/5 rounded-full overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", color, barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}
