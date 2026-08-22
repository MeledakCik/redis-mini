"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Database, MoreVertical, Circle, Lock } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateDatabaseDialog } from "@/components/create-database-dialog";
import { DatabaseTemplates } from "@/components/database-templates";
import { formatBytes, timeAgo } from "@/lib/utils";
import { cardReveal, staggerContainer } from "@/lib/motion";

// FREE MODE: satu-satunya plan yang ada, 1 Redis database per akun (lihat lib/quota.js).
const FREE_TIER_LIMIT = 1;

export default function DatabasesPage() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/instances");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInstances(data.instances || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t1 = setInterval(load, 4000);
    return () => clearInterval(t1);
  }, []);

  // Akun lama yang udah punya >1 database sebelum limit diterapkan gak dihapus,
  // tapi gak boleh bikin baru lagi sampai delete.
  const redisLimitReached = instances.length >= FREE_TIER_LIMIT;
  const hasLegacyOverflow = instances.length > FREE_TIER_LIMIT;

  function handleCreateClick() {
    if (redisLimitReached) return;
    setDialogOpen(true);
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Databases"]} />

        {/* RESPONSIVE FIX: px-4 di mobile, gap bawah ekstra biar gak ketutup FAB */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-28 lg:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Databases</h1>
              <p className="text-sm text-zinc-500 mt-1">Redis database milik akun kamu.</p>
            </div>
            <Button
              onClick={handleCreateClick}
              variant={redisLimitReached ? "subtle" : "default"}
              className="w-full sm:w-auto"
            >
              {redisLimitReached ? <Lock size={15} /> : <Plus size={15} />}
              {redisLimitReached ? `Limit Reached (${instances.length}/${FREE_TIER_LIMIT})` : "Create Database"}
            </Button>
          </div>

          {hasLegacyOverflow && (
            <div className="mb-5 bg-blue-950/30 border border-blue-900/50 text-blue-200 text-xs rounded-lg px-4 py-3">
              You have {instances.length} databases from before the free tier limit — you can keep them, but can't
              create a new one until you delete one.
            </div>
          )}

          {error && (
            <div className="mb-5 bg-red-950/50 border border-red-900 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* REVAMP: empty state sekarang "welcoming", bukan cuma ikon + 1 baris teks. */}
          {!loading && instances.length === 0 && !error && (
            <div className="space-y-8 mb-8">
              <Card className="py-14 px-4 text-center border-dashed">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center"
                >
                  <Database className="text-accent" size={26} />
                </motion.div>
                <p className="text-zinc-100 font-semibold text-lg">Welcome to Kasyaf Redis Cloud! 👋</p>
                <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">
                  Cluster kamu Online di SIN. Provisioning database pertama kamu gratis 100MB, siap dalam 2 detik.
                </p>
                <Button onClick={handleCreateClick} className="mt-6" size="lg">
                  <Plus size={16} /> Create Database
                </Button>
              </Card>

              <div>
                <p className="text-center text-xs font-medium text-zinc-600 uppercase tracking-wider mb-4">
                  Atau mulai dari template
                </p>
                <DatabaseTemplates onUseTemplate={handleCreateClick} />
              </div>
            </div>
          )}

          {/* ANIMASI KASYAF: card reveal + stagger tiap list item muncul */}
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3"
          >
            {instances.map((inst) => (
              <motion.div key={inst.id} variants={cardReveal}>
                <Link href={`/databases/${inst.id}?type=redis`}>
                  <Card className="p-4 flex items-center justify-between gap-3 hover:border-zinc-700 hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Database size={16} className="text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-zinc-100 mono truncate">{inst.id}</p>
                          <Badge variant={inst.status === "running" ? "green" : "red"}>
                            <Circle size={6} className="fill-current" />
                            {inst.status === "running" ? "Active" : "Unreachable"}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                          {inst.region || "ID-JKT-1"} · {inst.host || "—"} · Created{" "}
                          {timeAgo(inst.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-zinc-500 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-zinc-600">Memory</p>
                        <p className="text-zinc-300 mono">{formatBytes(inst.memoryUsageBytes)} / 100 MB</p>
                      </div>
                      <MoreVertical size={16} className="text-zinc-600" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </main>
      </div>

      <CreateDatabaseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />
    </div>
  );
}
