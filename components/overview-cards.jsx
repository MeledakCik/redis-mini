"use client";
import { HardDrive, MapPin, ShieldCheck, ShieldOff, Gauge, Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";

export function OverviewCards({ instance, stats }) {
  const usedBytes = stats?.memory?.usedBytes ?? instance?.memoryUsageBytes ?? 0;
  const maxBytes = (instance?.maxMemoryMb || 100) * 1024 * 1024;
  const pct = maxBytes ? (usedBytes / maxBytes) * 100 : 0;

  const items = [
    {
      icon: Network,
      label: "Port",
      value: instance?.port ?? "-",
      mono: true,
    },
    {
      icon: MapPin,
      label: "Region",
      value: instance?.region || "Local Docker",
    },
    {
      icon: instance?.tls ? ShieldCheck : ShieldOff,
      label: "TLS",
      value: instance?.tls ? "Enabled" : "Disabled",
    },
    {
      icon: Gauge,
      label: "Eviction",
      value: instance?.eviction || "allkeys-lru",
      mono: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Card className="lg:col-span-2 p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <HardDrive size={13} /> Memory Usage
        </div>
        <p className="text-lg font-semibold mono text-zinc-100">
          {formatBytes(usedBytes)} <span className="text-zinc-600 text-sm font-normal">/ {instance?.maxMemoryMb || 100} MB</span>
        </p>
        <Progress value={pct} className="mt-3" />
      </Card>

      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
              <Icon size={13} /> {item.label}
            </div>
            <p className={`text-sm font-semibold text-zinc-100 ${item.mono ? "mono" : ""}`}>{item.value}</p>
          </Card>
        );
      })}
    </div>
  );
}
