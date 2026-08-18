"use client";
import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gauge, ListTree, PieChart, RefreshCw } from "lucide-react";

const TYPE_COLORS = {
  string: "#00e095",
  hash: "#38bdf8",
  list: "#f59e0b",
  set: "#a78bfa",
  zset: "#f472b6",
  other: "#525252",
};

export function InsightsPanel({ id, latencyHistory }) {
  const [slowlog, setSlowlog] = useState([]);
  const [keyspace, setKeyspace] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [slRes, ksRes] = await Promise.all([
        fetch(`/api/redis/${id}/slowlog`).then((r) => r.json()),
        fetch(`/api/redis/${id}/keyspace`).then((r) => r.json()),
      ]);
      setSlowlog(slRes.entries || []);
      setKeyspace(ksRes.counts || null);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const totalKeys = keyspace ? Object.values(keyspace).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge size={14} className="text-accent" /> Command Latency
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={latencyHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e095" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00e095" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#525252" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#525252" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v} ms`, "Latency"]}
              />
              <Area type="monotone" dataKey="latencyMs" stroke="#00e095" fill="url(#latencyGradient)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart size={14} className="text-accent" /> Keyspace Analysis
            </CardTitle>
            <Button size="icon" variant="ghost" onClick={load}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </Button>
          </CardHeader>
          <CardContent>
            {!keyspace ? (
              <p className="text-xs text-zinc-600">Loading...</p>
            ) : totalKeys === 0 ? (
              <p className="text-xs text-zinc-600">Belum ada key di database ini.</p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(keyspace).map(([type, count]) => {
                  const pct = totalKeys ? (count / totalKeys) * 100 : 0;
                  if (count === 0) return null;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400 capitalize">{type}</span>
                        <span className="text-zinc-500 mono">{count} keys</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[type] || "#525252" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTree size={14} className="text-accent" /> Slowlog
            </CardTitle>
            <Badge variant="zinc">{slowlog.length} entries</Badge>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto space-y-2">
            {slowlog.length === 0 && <p className="text-xs text-zinc-600">Belum ada command lambat tercatat. Bagus!</p>}
            {slowlog.map((entry) => (
              <div key={entry.id} className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="mono text-zinc-300 truncate">{(entry.args || []).join(" ")}</span>
                  <Badge variant="yellow">{(entry.durationMicros / 1000).toFixed(2)} ms</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
