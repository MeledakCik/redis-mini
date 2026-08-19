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
import { motion, AnimatePresence } from "framer-motion";
import { VectorOverviewCards } from "@/components/vector-overview-cards";
import { StorageUsageCard } from "@/components/storage-usage-card";
import { VectorConnectionSection } from "@/components/vector-connection-section";
import { MetricsCharts } from "@/components/metrics-chart";
import { VectorDataBrowser } from "@/components/vector-data-browser";
import { VectorRestApiPanel } from "@/components/vector-rest-api-panel";
import { VectorInsightsPanel } from "@/components/vector-insights-panel";
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

export function VectorConsole({ id, embedded = false }) {
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
  const prevOpsRef = useRef(null);

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
      setRateLimitedUntil(Date.now() + 60 * 1000);
      return false;
    }
    setRateLimitMsg("");
    return true;
  }

  const loadInstance = useCallback(async () => {
    try {
      const res = await fetch(`/api/vector/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setInstance(data.instance);
    } catch { }
  }, [id]);

  const loadStats = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await fetch(`/api/vector/${id}/stats`);
      const data = await res.json();
      const latencyMs = Math.round(performance.now() - start);

      if (data.connected) {
        setStats(data);

        let opsPerSec = 0;
        if (prevOpsRef.current !== null) {
          opsPerSec = Math.max(0, (data.ops.totalOps - prevOpsRef.current) / 3);
        }
        prevOpsRef.current = data.ops.totalOps;

        let bandwidthKb = 0;
        if (prevBytesRef.current !== null) {
          bandwidthKb = Math.max(0, (data.ops.totalBytesOut - prevBytesRef.current) / 1024 / 3);
        }
        prevBytesRef.current = data.ops.totalBytesOut;

        const point = {
          t: new Date().toLocaleTimeString("id-ID", { minute: "2-digit", second: "2-digit" }),
          ops: +opsPerSec.toFixed(2),
          memoryMb: +(data.memory.usedBytes / 1024 / 1024).toFixed(2),
          bandwidthKb: +bandwidthKb.toFixed(1),
          latencyMs,
        };
        setHistory((h) => [...h, point].slice(-MAX_POINTS));
      }
    } catch { }
  }, [id]);

  useEffect(() => {
    loadInstance();
    loadStats();
    const t1 = setInterval(loadInstance, 4000);
    const t2 = setInterval(loadStats, 3000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [loadInstance, loadStats]);

  async function handleRestart() {
    setBusy(true);
    try {
      const ok = await withRateLimitHandling(() => fetch(`/api/vector/${id}/restart`, { method: "POST" }));
      if (ok) await loadInstance();
    } finally {
      setBusy(false);
    }
  }

  async function handleFlush() {
    if (!confirm("Hapus semua vector di database ini (drop & recreate collection)?")) return;
    setBusy(true);
    try {
      await withRateLimitHandling(() => fetch(`/api/vector/${id}/flush`, { method: "POST" }));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Hapus permanen vector database "${id}"? Collection di Qdrant akan ikut dihapus.`)) return;
    setBusy(true);
    try {
      const ok = await withRateLimitHandling(() => fetch(`/api/vector/${id}`, { method: "DELETE" }));
      if (ok) router.push("/vector");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    const emptyState = (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-20 text-center">
        <p className="text-zinc-400">Vector database "{id}" tidak ditemukan.</p>
        {!embedded && (
          <Button className="mt-4" variant="outline" onClick={() => router.push("/vector")}>
            Kembali ke Vector
          </Button>
        )}
      </div>
    );
    if (embedded) return emptyState;
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header breadcrumbs={["Vector", id]} />
          {emptyState}
        </div>
      </div>
    );
  }

  const activeTabLabel = TABS.find((t) => t.value === tab)?.label || "Details";

  const body = (
    <>
          {/* RESPONSIVE FIX: action buttons wrap + scroll horizontally instead of blowing out on 375px */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <h1 className="text-lg font-bold mono text-zinc-100 truncate">{id}</h1>
              <Badge variant={instance?.status === "running" ? "green" : "red"}>
                <Circle size={6} className="fill-current" />
                {instance?.status === "running" ? "Active" : instance?.status === "exited" ? "Stopped" : "Unknown"}
              </Badge>
              {!stats?.connected && instance && <Badge variant="yellow">Qdrant unreachable</Badge>}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <Button size="sm" variant="subtle" onClick={handleRestart} disabled={busy || isRateLimited} className="shrink-0">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />} Restart
              </Button>
              <Button size="sm" variant="subtle" onClick={handleFlush} disabled={busy || isRateLimited} className="shrink-0">
                <Eraser size={13} /> Flush
              </Button>
              <Button size="sm" variant="subtle" disabled title="Fitur upgrade cuma dummy di edisi lokal" className="shrink-0">
                <Sparkles size={13} /> Upgrade
              </Button>
              <Button size="sm" variant="danger" onClick={handleDelete} disabled={busy || isRateLimited} className="shrink-0">
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

          {/* ANIMASI KASYAF: tab switch pakai blur+rise, ganti fade-in CSS lama */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === "details" && (
                <div className="space-y-5">
                  <VectorOverviewCards instance={instance} stats={stats} />
                  <StorageUsageCard />
                  <VectorConnectionSection instance={instance} />
                  <MetricsCharts history={history} />
                </div>
              )}

              {tab === "browser" && (
                <VectorDataBrowser id={id} dimension={instance?.dimension} token={instance?.token} />
              )}

              {tab === "cli" && (
                <CliTerminal
                  id={id}
                  port={instance?.port || "----"}
                  apiPath={`/api/vector/${id}/exec`}
                  scheme="qdrant"
                  title="Vector CLI"
                  hint="Ketik command Vector (UPSERT, QUERY, DELETE, FETCH, RANGE), Ctrl+L untuk clear."
                  token={instance?.token}
                  connectionString={instance?.connectionString}
                />
              )}

              {tab === "rest" && <VectorRestApiPanel instance={instance} />}

              {tab === "insights" && <VectorInsightsPanel id={id} latencyHistory={history} />}

              {tab === "backups" && (
                <BackupsPanel
                  subtext={
                    <>
                      Di versi VPS/production nanti, fitur ini bisa jalanin{" "}
                      <code className="mono">qdrant snapshot</code> terjadwal dan simpan snapshot ke storage
                      eksternal (S3, dsb).
                    </>
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
    </>
  );

  if (embedded) return body;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Vector", id, activeTabLabel]} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-28 lg:pb-8">{body}</main>
      </div>
    </div>
  );
}
