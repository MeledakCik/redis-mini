"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Boxes, MoreVertical, Circle, Lock } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateVectorDatabaseDialog } from "@/components/create-vector-database-dialog";
import { timeAgo } from "@/lib/utils";
import { cardReveal, staggerContainer } from "@/lib/motion";

// FREE MODE: satu-satunya plan yang ada, 1 Vector database per akun (lihat lib/quota.js).
const FREE_TIER_LIMIT = 1;

export default function VectorPage() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/vector");
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

  const vectorLimitReached = instances.length >= FREE_TIER_LIMIT;
  const hasLegacyOverflow = instances.length > FREE_TIER_LIMIT;

  function handleCreateClick() {
    if (vectorLimitReached) return;
    setDialogOpen(true);
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Vector"]} />

        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-28 lg:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Vector Databases</h1>
              <p className="text-sm text-zinc-500 mt-1">Vector DB (Qdrant) kamu.</p>
            </div>
            <Button
              onClick={handleCreateClick}
              variant={vectorLimitReached ? "subtle" : "default"}
              className="w-full sm:w-auto"
            >
              {vectorLimitReached ? <Lock size={15} /> : <Plus size={15} />}
              {vectorLimitReached ? `Limit Reached (${instances.length}/${FREE_TIER_LIMIT})` : "Create Vector Database"}
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

          {!loading && instances.length === 0 && !error && (
            <Card className="py-20 text-center border-dashed">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <Boxes className="mx-auto text-zinc-700 mb-3" size={32} />
              </motion.div>
              <p className="text-zinc-400 font-medium text-sm">Belum ada vector database</p>
              <p className="text-zinc-600 text-xs mt-1">Klik "Create Vector Database" untuk mulai.</p>
            </Card>
          )}

          {/* ANIMASI KASYAF: card reveal + stagger */}
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3"
          >
            {instances.map((inst) => (
              <motion.div key={inst.id} variants={cardReveal}>
                <Link href={`/databases/${inst.id}?type=vector`}>
                  <Card className="p-4 flex items-center justify-between gap-3 hover:border-zinc-700 hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Boxes size={16} className="text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-zinc-100 mono truncate">{inst.id}</p>
                          <Badge variant={inst.status === "running" ? "green" : "red"}>
                            <Circle size={6} className="fill-current" />
                            {inst.status === "running" ? "Active" : inst.status === "exited" ? "Stopped" : "Unknown"}
                          </Badge>
                          {inst.provider === "external" && <Badge variant="yellow">External</Badge>}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                          {inst.region || "ID-JKT-1"} · {inst.dimension}d · {inst.metric} · Created {timeAgo(inst.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-zinc-500 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-zinc-600">Vectors</p>
                        <p className="text-zinc-300 mono">{inst.pointsCount ?? 0}</p>
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

      <CreateVectorDatabaseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={load} />
    </div>
  );
}
