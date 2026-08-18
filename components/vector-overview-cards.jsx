"use client";
import { HardDrive, MapPin, ShieldCheck, ShieldOff, Layers, Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";

const QUOTA_BYTES = 100 * 1024 * 1024; // kuota dummy 100MB, sama kayak Redis, buat parity UI

export function VectorOverviewCards({ instance, stats }) {
  const usedBytes = stats?.memory?.usedBytes ?? 0;
  const pct = QUOTA_BYTES ? (usedBytes / QUOTA_BYTES) * 100 : 0;

  const items = [
    { icon: Network, label: "Port", value: instance?.port ?? "-", mono: true },
    { icon: MapPin, label: "Region", value: instance?.region || "Local Docker" },
    { icon: instance?.tls ? ShieldCheck : ShieldOff, label: "TLS", value: instance?.tls ? "Enabled" : "Disabled" },
    { icon: Layers, label: "Metric", value: instance?.metric || "cosine", mono: true },
    { icon: Layers, label: "Dimension", value: instance?.dimension ?? "-", mono: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
      <Card className="lg:col-span-2 p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <HardDrive size={13} /> Memory Usage
        </div>
        <p className="text-lg font-semibold mono text-zinc-100">
          {formatBytes(usedBytes)} <span className="text-zinc-600 text-sm font-normal">/ 100 MB</span>
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
