"use client";
import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";

// Task 3: "Storage Used: X MB / 500MB" di tab Details tiap database. Kuotanya per AKUN
// (gabungan semua Redis + Vector milik user), jadi angkanya sama di semua instance.
export function StorageUsageCard() {
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/quota");
        if (res.ok && alive) setQuota(await res.json());
      } catch {}
    }
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!quota) return null;
  const { storage } = quota;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
        <HardDrive size={13} /> Storage Used (account)
      </div>
      <p className="text-lg font-semibold mono text-zinc-100">
        {formatBytes(storage.usageBytes)}{" "}
        <span className="text-zinc-600 text-sm font-normal">/ {formatBytes(storage.limitBytes)}</span>
      </p>
      <Progress value={storage.pct} className="mt-3" />
    </Card>
  );
}
