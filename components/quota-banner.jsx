"use client";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";

export function QuotaBanner({ quota }) {
  if (!quota) return null;
  const { redis, vector, storage } = quota;
  const storagePct = Math.round(storage.pct);

  return (
    <div className="mb-5 bg-amber-950/30 border border-amber-900/50 rounded-lg px-4 py-3 flex items-start gap-3 fade-in">
      <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-amber-200/90">
          Free plan: {redis.count}/{redis.limit} Redis used, {vector.count}/{vector.limit} Vector used. Storage{" "}
          {formatBytes(storage.usageBytes)}/{formatBytes(storage.limitBytes)} ({storagePct}%).{" "}
          <Link href="/billing" className="underline hover:text-amber-100 font-medium">
            Upgrade for more.
          </Link>
        </p>
        <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-black/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${Math.min(100, storagePct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
