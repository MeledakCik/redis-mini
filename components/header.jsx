"use client";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

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
    <header className="h-14 border-b border-border flex items-center justify-between px-6 sticky top-0 bg-bg/90 backdrop-blur z-10">
      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} className="text-zinc-700" />}
            <span className={i === breadcrumbs.length - 1 ? "text-zinc-200 font-medium" : ""}>{b}</span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span
          className={`w-2 h-2 rounded-full ${
            clusterOk === null ? "bg-zinc-600" : clusterOk ? "bg-accent animate-pulseGlow" : "bg-red-500"
          }`}
        />
        <span className="text-zinc-400">
          {clusterOk === null ? "Checking cluster..." : clusterOk ? "Cluster Online" : "Cluster unreachable"}
        </span>
      </div>
    </header>
  );
}
