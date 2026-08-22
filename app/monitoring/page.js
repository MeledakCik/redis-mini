"use client";
import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Activity, MemoryStick, Timer, Users } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// REVAMP: /monitoring — 4 chart realtime-style (mock data, siap disambungkan ke
// /api/instances/[id]/stats begitu backend metrics streaming-nya ada).
function seed() {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => ({
    t: new Date(now - (19 - i) * 3000).toLocaleTimeString("id-ID", { minute: "2-digit", second: "2-digit" }),
    ops: 0,
    memoryMb: 0,
    latencyMs: 0,
    clients: 0,
  }));
}

function Chart({ title, icon: Icon, data, dataKey, color, unit = "" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon size={13} className="text-accent" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-52 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#525252" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#525252" }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#8a8a8a" }}
              formatter={(v) => [`${v}${unit}`, title]}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function MonitoringPage() {
  const [data, setData] = useState(seed);

  useEffect(() => {
    const t = setInterval(() => {
      setData((prev) => {
        const next = [...prev.slice(1)];
        next.push({
          t: new Date().toLocaleTimeString("id-ID", { minute: "2-digit", second: "2-digit" }),
          ops: 0,
          memoryMb: 0,
          latencyMs: 0,
          clients: 0,
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Monitoring"]} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-28 lg:pb-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Monitoring</h1>
            <p className="text-sm text-zinc-500 mt-1">Metrik realtime cluster kamu, di-refresh tiap 3 detik.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Chart title="Ops / sec" icon={Activity} data={data} dataKey="ops" color="#00e095" unit=" ops" />
            <Chart title="Memory Usage" icon={MemoryStick} data={data} dataKey="memoryMb" color="#38bdf8" unit=" MB" />
            <Chart title="Latency (p99)" icon={Timer} data={data} dataKey="latencyMs" color="#f59e0b" unit=" ms" />
            <Chart title="Connected Clients" icon={Users} data={data} dataKey="clients" color="#8b5cf6" unit="" />
          </div>
        </main>
      </div>
    </div>
  );
}
