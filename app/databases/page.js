"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Database, MoreVertical, Circle, Lock } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateDatabaseDialog } from "@/components/create-database-dialog";
import { QuotaBanner } from "@/components/quota-banner";
import { formatBytes, timeAgo } from "@/lib/utils";

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

        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Databases</h1>
              <p className="text-sm text-zinc-500 mt-1">Redis instances kamu.</p>
            </div>
            <Button onClick={handleCreateClick} variant={redisLimitReached ? "subtle" : "default"}>
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
              <Database className="mx-auto text-zinc-700 mb-3" size={32} />
              <p className="text-zinc-400 font-medium text-sm">Belum ada database</p>
              <p className="text-zinc-600 text-xs mt-1">Klik "Create Database" untuk mulai instance Redis pertama kamu.</p>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-3">
            {instances.map((inst) => (
              <Link key={inst.id} href={`/redis/${inst.id}`}>
                <Card className="p-4 flex items-center justify-between hover:border-zinc-700 transition-colors fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Database size={16} className="text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-zinc-100 mono">{inst.id}</p>
                        <Badge variant={inst.status === "running" ? "green" : "red"}>
                          <Circle size={6} className="fill-current" />
                          {inst.status === "running" ? "Active" : inst.status === "exited" ? "Stopped" : "Unknown"}
                        </Badge>
                        {inst.provider === "external" && <Badge variant="yellow">External</Badge>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {inst.region || "Local Docker"} · {inst.provider === "external" ? inst.host : `Port ${inst.port}`} · Created{" "}
                        {timeAgo(inst.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-zinc-500">
                    <div className="text-right hidden sm:block">
                      <p className="text-zinc-600">Memory</p>
                      <p className="text-zinc-300 mono">{formatBytes(inst.memoryUsageBytes)} / 100 MB</p>
                    </div>
                    <MoreVertical size={16} className="text-zinc-600" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
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
