import { cn } from "@/lib/utils";

const variants = {
  green: "bg-accent/10 text-accent border border-accent/30",
  red: "bg-red-950 text-red-400 border border-red-900",
  zinc: "bg-white/5 text-zinc-400 border border-border",
  yellow: "bg-yellow-950 text-yellow-400 border border-yellow-900/60",
};

export function Badge({ className, variant = "zinc", children }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", variants[variant], className)}>
      {children}
    </span>
  );
}
