import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// REVAMP: Overview stat card — value + sub-label + icon chip, dipakai di grid 4-kolom.
export function StatCard({ icon: Icon, label, value, sub, accent = true, loading }) {
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">{label}</p>
          {loading ? (
            <div className="h-7 w-20 mt-2 rounded bg-white/5 animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-zinc-100 mt-1 mono truncate">{value}</p>
          )}
          {sub && !loading && <p className="text-[11px] text-zinc-600 mt-1 truncate">{sub}</p>}
        </div>
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            accent ? "bg-accent/10 text-accent" : "bg-white/5 text-zinc-400"
          )}
        >
          <Icon size={16} />
        </div>
      </div>
    </Card>
  );
}
