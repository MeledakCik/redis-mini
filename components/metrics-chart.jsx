"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

function MiniChart({ title, data, dataKey, color, unit = "" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity size={13} className="text-accent" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-48 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#525252" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#525252" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#8a8a8a" }}
              formatter={(v) => [`${v}${unit}`, title]}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function MetricsCharts({ history }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <MiniChart title="Commands / sec" data={history} dataKey="ops" color="#00e095" />
      <MiniChart title="Memory Usage" data={history} dataKey="memoryMb" color="#38bdf8" unit=" MB" />
      <MiniChart title="Bandwidth (out)" data={history} dataKey="bandwidthKb" color="#f59e0b" unit=" KB/s" />
    </div>
  );
}
