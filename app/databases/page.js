"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Database, MoreVertical, Circle, Lock } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateDatabaseDialog } from "@/components/create-database-dialog";
import { QuotaBanner } from "@/components/quota-banner";
import { formatBytes, timeAgo } from "@/lib/utils";
import { cardReveal, staggerContainer } from "@/lib/motion";

export default function DatabasesPage() {
  const router = useRouter();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [quota, setQuota] = useState(null);

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

  async function loadQuota() {
    try {
      const res = await fetch("/api/quota");
      if (res.ok) setQuota(await res.json());
    } catch {}
  }

  useEffect(() => {
    load();
    loadQuota();
    const t1 = setInterval(load, 4000);
    const t2 = setInterval(loadQuota, 8000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  // Task 3: user lama yang udah punya >1 database sebelum limit diterapkan gak dihapus,
  // tapi gak boleh bikin baru lagi sampai delete/upgrade.
  const redisLimitReached = quota ? quota.redis.count >= quota.redis.limit : false;
  const hasLegacyOverflow = quota && quota.redis.count > quota.redis.limit;

  function handleCreateClick() {
    if (redisLimitReached) {
      router.push("/billing");
      return;
    }
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
              {redisLimitReached ? `Limit Reached (${quota.redis.count}/${quota.redis.limit})` : "Create Database"}
            </Button>
          </div>

          <QuotaBanner quota={quota} />

          {hasLegacyOverflow && (
            <div className="mb-5 bg-blue-950/30 border border-blue-900/50 text-blue-200 text-xs rounded-lg px-4 py-3">
              You have {quota.redis.count} databases from before limit, you can keep them but can't create new one
              until you delete or upgrade.
            </div>
          )}

          {error && (
            <div className="mb-5 bg-red-950/50 border border-red-900 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {!loading && instances.length === 0 && !error && (
            <Card className="py-20 text-center border-dashed">
              {/* ANIMASI KASYAF: empty state floating loop */}
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <Database className="mx-auto text-zinc-700 mb-3" size={32} />
              </motion.div>
              <p className="text-zinc-400 font-medium text-sm">Belum ada database</p>
              <p className="text-zinc-600 text-xs mt-1">Klik "Create Database" untuk provisioning Redis database pertama kamu.</p>
            </Card>
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
        onCreated={() => {
          load();
          loadQuota();
        }}
      />
    </div>
  );
}
