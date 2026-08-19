"use client";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Header({ breadcrumbs = [] }) {
  const [clusterOk, setClusterOk] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch("/api/instances");
        if (mounted) setClusterOk(res.status !== 503);
      } catch {
        if (mounted) setClusterOk(false);
      }
    }
    check();
    const t = setInterval(check, 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    // RESPONSIVE FIX: padding scale + leave room on the left for the mobile FAB, and
    // shrink the breadcrumb/status text so it never wraps or pushes off-screen on 375px.
    <header className="h-14 border-b border-border flex items-center justify-between gap-3 px-4 md:px-6 sticky top-0 bg-bg/90 backdrop-blur z-10">
      <div className="flex items-center gap-1.5 text-xs md:text-sm text-zinc-500 min-w-0 overflow-hidden">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1.5 shrink-0">
            {i > 0 && <ChevronRight size={13} className="text-zinc-700" />}
            <span className={cn("truncate", i === breadcrumbs.length - 1 ? "text-zinc-200 font-medium" : "")}>
              {b}
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] md:text-xs shrink-0">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            clusterOk === null ? "bg-zinc-600" : clusterOk ? "bg-accent animate-pulseGlow" : "bg-red-500"
          }`}
        />
        <span className="text-zinc-400 hidden sm:inline">
          {clusterOk === null ? "Checking cluster..." : clusterOk ? "Cluster Online" : "Cluster unreachable"}
        </span>
      </div>
    </header>
  );
}
