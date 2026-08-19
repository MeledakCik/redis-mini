"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Info, TableProperties, TerminalSquare, Globe, LineChart as LineChartIcon, Archive,
  RotateCw, Trash2, Eraser, Sparkles, Circle, Loader2,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OverviewCards } from "@/components/overview-cards";
import { StorageUsageCard } from "@/components/storage-usage-card";
import { ConnectionSection } from "@/components/connection-section";
import { MetricsCharts } from "@/components/metrics-chart";
import { DataBrowser } from "@/components/data-browser";
import { RestApiPanel } from "@/components/rest-api-panel";
import { InsightsPanel } from "@/components/insights-panel";
import { BackupsPanel } from "@/components/backups-panel";

const CliTerminal = dynamic(() => import("@/components/cli-terminal").then((m) => m.CliTerminal), {
  ssr: false,
  loading: () => <div className="h-[420px] flex items-center justify-center text-zinc-600 text-sm">Loading terminal...</div>,
});

const TABS = [
  { value: "details", label: "Details", icon: <Info size={14} /> },
  { value: "browser", label: "Data Browser", icon: <TableProperties size={14} /> },
  { value: "cli", label: "CLI", icon: <TerminalSquare size={14} /> },
  { value: "rest", label: "REST API", icon: <Globe size={14} /> },
  { value: "insights", label: "Insights", icon: <LineChartIcon size={14} /> },
  { value: "backups", label: "Backups", icon: <Archive size={14} /> },
];

const MAX_POINTS = 20;

export function RedisConsole({ id, embedded = false }) {
  const router = useRouter();
  const [tab, setTab] = useState("details");
  const [instance, setInstance] = useState(null);
  const [stats, setStats] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState("");
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const prevBytesRef = useRef(null);

  useEffect(() => {
    if (!rateLimitedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [rateLimitedUntil]);

  const isRateLimited = rateLimitedUntil > now;

  async function withRateLimitHandling(fn) {
    const res = await fn();
    if (res && res.status === 429) {
      const data = await res.json().catch(() => ({}));
      setRateLimitMsg(data.error || "Rate limit tercapai, coba lagi nanti.");
      setRateLimitedUntil(Date.now() + 60 * 1000); // disable tombol minimal 60 detik sampai user retry manual
      return false;
    }
    setRateLimitMsg("");
    return true;
  }

  const loadInstance = useCallback(async () => {
    try {
      const res = await fetch(`/api/instances/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setInstance(data.instance);
    } catch {}
  }, [id]);

  const loadStats = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await fetch(`/api/redis/${id}/stats`);
      const data = await res.json();
      const latencyMs = Math.round(performance.now() - start);

      if (data.connected) {
        setStats(data);
        const netOut = data.stats.netOutputBytes;
        let bandwidthKb = 0;
        if (prevBytesRef.current !== null) {
          bandwidthKb = Math.max(0, (netOut - prevBytesRef.current) / 1024 / 3); // per 3s interval
        }
        prevBytesRef.current = netOut;

        const point = {
          t: new Date().toLocaleTimeString("id-ID", { minute: "2-digit", second: "2-digit" }),
          ops: data.stats.opsPerSec,
          memoryMb: +(data.memory.usedBytes / 1024 / 1024).toFixed(2),
          bandwidthKb: +bandwidthKb.toFixed(1),
          latencyMs,
        };
        setHistory((h) => [...h, point].slice(-MAX_POINTS));
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    loadInstance();
    loadStats();
    const t1 = setInterval(loadInstance, 4000);
    const t2 = setInterval(loadStats, 3000); // auto refresh tiap 3 detik ala Upstash
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [loadInstance, loadStats]);

  async function handleRestart() {
    setBusy(true);
    try {
      const ok = await withRateLimitHandling(() => fetch(`/api/instances/${id}/restart`, { method: "POST" }));
      if (ok) await loadInstance();
    } finally {
      setBusy(false);
    }
  }

  async function handleFlush() {
    if (!confirm("FLUSHDB semua data di instance ini?")) return;
    setBusy(true);
    try {
      await withRateLimitHandling(() => fetch(`/api/instances/${id}/flush`, { method: "POST" }));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Hapus permanen database "${id}"? Akun ACL dan semua key akan ikut dihapus.`)) return;
    setBusy(true);
    try {
      const ok = await withRateLimitHandling(() => fetch(`/api/instances/${id}`, { method: "DELETE" }));
      if (ok) router.push("/databases");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    const emptyState = (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-zinc-400">Instance "{id}" tidak ditemukan.</p>
        {!embedded && (
          <Button className="mt-4" variant="outline" onClick={() => router.push("/databases")}>
            Kembali ke Databases
          </Button>
        )}
      </div>
    );
    if (embedded) return emptyState;
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header breadcrumbs={["Databases", id]} />
          {emptyState}
        </div>
      </div>
    );
  }

  const activeTabLabel = TABS.find((t) => t.value === tab)?.label || "Details";

  const body = (
    <>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold mono text-zinc-100">{id}</h1>
              <Badge variant={instance?.status === "running" ? "green" : "red"}>
                <Circle size={6} className="fill-current" />
                {instance?.status === "running" ? "Active" : "Unreachable"}
              </Badge>
              {!stats?.connected && instance && (
                <Badge variant="yellow">Redis unreachable</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="subtle" onClick={handleRestart} disabled={busy || isRateLimited}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />} Restart
              </Button>
              <Button size="sm" variant="subtle" onClick={handleFlush} disabled={busy || isRateLimited}>
                <Eraser size={13} /> Flush
              </Button>
              <Button size="sm" variant="subtle" disabled title="Fitur upgrade — lihat halaman Billing">
                <Sparkles size={13} /> Upgrade
              </Button>
              <Button size="sm" variant="danger" onClick={handleDelete} disabled={busy || isRateLimited}>
                <Trash2 size={13} /> Delete
              </Button>
            </div>
          </div>

          {rateLimitMsg && (
            <div className="mb-5 -mt-2 flex items-center gap-2 text-xs text-red-300 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2 fade-in">
              <Badge variant="red">429</Badge>
              {rateLimitMsg}
            </div>
          )}

          <div className="mb-6">
            <Tabs tabs={TABS} active={tab} onChange={setTab} />
          </div>

          {tab === "details" && (
            <div className="space-y-5 fade-in">
              <OverviewCards instance={instance} stats={stats} />
              <StorageUsageCard />
              <ConnectionSection instance={instance} />
              <MetricsCharts history={history} />
            </div>
          )}

          {tab === "browser" && (
            <div className="fade-in">
              <DataBrowser id={id} token={instance?.password} />
            </div>
          )}

          {tab === "cli" && (
            <div className="fade-in">
              <CliTerminal
                id={instance?.id || id}
                port={instance?.port || "----"}
                token={instance?.password || instance?.token}
                apiPath={`/api/redis/${id}/exec`}
                scheme="redis"
                title="Redis CLI"
                hint="PING, SET foo bar, GET foo, KEYS *, FLUSHALL — Ctrl+L clear, ↑↓ history"
                connectionString={instance?.connectionString}
              />
            </div>
          )}

          {tab === "rest" && (
            <div className="fade-in">
              <RestApiPanel instance={instance} />
            </div>
          )}

          {tab === "insights" && (
            <div className="fade-in">
              <InsightsPanel id={id} latencyHistory={history} />
            </div>
          )}

          {tab === "backups" && (
            <div className="fade-in">
              <BackupsPanel />
            </div>
          )}
    </>
  );

  if (embedded) return body;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Databases", id, activeTabLabel]} />
        <main className="max-w-6xl mx-auto px-6 py-6">{body}</main>
      </div>
    </div>
  );
}
