"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MemoryStick, Gauge, Users, Database as DatabaseIcon } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { StatCard } from "@/components/stat-card";
import { RecentActivity } from "@/components/recent-activity";
import { QuickActions } from "@/components/quick-actions";
import { CreateDatabaseDialog } from "@/components/create-database-dialog";
import { formatBytes } from "@/lib/utils";
import { cardReveal, staggerContainer } from "@/lib/motion";

// REVAMP: "/" tetap landing page publik (marketing) — dashboard ringkasan akun
// sekarang tinggal di /overview, dibuka begitu user login lewat sidebar "Overview".
const PLAN_MEMORY_MB = 256;

export default function OverviewPage() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/instances");
      const data = await res.json();
      if (res.ok) setInstances(data.instances || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const memoryUsedBytes = instances.reduce((sum, i) => sum + (i.memoryUsageBytes || 0), 0);
  const activeCount = instances.filter((i) => i.status === "running").length;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Overview"]} />

        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-28 lg:pb-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Overview</h1>
            <p className="text-sm text-zinc-500 mt-1">Ringkasan akun & cluster kamu di Kasyaf Redis Cloud.</p>
          </div>

          <motion.div
            variants={staggerContainer(0.06)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <motion.div variants={cardReveal}>
              <StatCard
                icon={MemoryStick}
                label="Total Memory Used"
                value={loading ? "" : formatBytes(memoryUsedBytes)}
                sub={`of ${PLAN_MEMORY_MB} MB plan`}
                loading={loading}
              />
            </motion.div>
            <motion.div variants={cardReveal}>
              <StatCard
                icon={Gauge}
                label="Total Commands"
                value={loading ? "" : "0 ops/sec"}
                sub="Live throughput"
                loading={loading}
              />
            </motion.div>
            <motion.div variants={cardReveal}>
              <StatCard
                icon={Users}
                label="Connected Clients"
                value={loading ? "" : String(activeCount)}
                sub="Across all databases"
                loading={loading}
              />
            </motion.div>
            <motion.div variants={cardReveal}>
              <StatCard
                icon={DatabaseIcon}
                label="Total Databases"
                value={loading ? "" : String(instances.length)}
                sub="Redis instances"
                loading={loading}
              />
            </motion.div>
          </motion.div>

          <RecentActivity instances={instances} loading={loading} />

          <QuickActions onCreateDatabase={() => setDialogOpen(true)} />
        </main>
      </div>

      <CreateDatabaseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={load} />
    </div>
  );
}
