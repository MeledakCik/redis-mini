"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Database, Boxes, HardDrive } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";
import { cardReveal, staggerContainer } from "@/lib/motion";

const FREE_FEATURES = ["1 Redis database", "1 Vector database", "500MB total storage", "Community support"];
const PRO_FEATURES = ["Unlimited Redis databases", "Unlimited Vector databases", "10GB total storage", "Priority support"];

export default function BillingPage() {
  const [quota, setQuota] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => {});
  }, []);

  // Simulasi checkout — payment provider integration menyusul.
  function handleUpgrade() {
    setUpgrading(true);
    setTimeout(() => {
      setUpgrading(false);
      setUpgraded(true);
    }, 900);
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Billing"]} />

        <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-28 lg:pb-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-zinc-100">Plans & Billing</h1>
            <p className="text-sm text-zinc-500 mt-2">Free plan cocok untuk development & evaluasi sebelum scale up ke production.</p>
          </div>

          {quota && (
            <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg mx-auto">
              <Card className="p-3 text-center">
                <Database size={14} className="mx-auto text-accent mb-1.5" />
                <p className="text-xs text-zinc-500">Redis</p>
                <p className="text-sm font-semibold mono text-zinc-100">
                  {quota.redis.count}/{quota.redis.limit}
                </p>
              </Card>
              <Card className="p-3 text-center">
                <Boxes size={14} className="mx-auto text-accent mb-1.5" />
                <p className="text-xs text-zinc-500">Vector</p>
                <p className="text-sm font-semibold mono text-zinc-100">
                  {quota.vector.count}/{quota.vector.limit}
                </p>
              </Card>
              <Card className="p-3 text-center">
                <HardDrive size={14} className="mx-auto text-accent mb-1.5" />
                <p className="text-xs text-zinc-500">Storage</p>
                <p className="text-sm font-semibold mono text-zinc-100">{Math.round(quota.storage.pct)}%</p>
              </Card>
            </div>
          )}

          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <motion.div variants={cardReveal}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-zinc-100">Free</h2>
                <Badge variant="zinc">Current plan</Badge>
              </div>
              <p className="text-2xl font-bold text-zinc-100 mt-2">
                $0<span className="text-sm font-normal text-zinc-500">/mo</span>
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-zinc-400">
                    <Check size={14} className="text-zinc-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="subtle" className="w-full mt-6" disabled>
                Current plan
              </Button>
            </Card>
            </motion.div>

            <motion.div variants={cardReveal}>
            <Card className="p-6 border-accent/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent text-black text-[10px] font-bold px-2.5 py-1 rounded-bl-lg">
                RECOMMENDED
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-zinc-100">Pro</h2>
              </div>
              <p className="text-2xl font-bold text-zinc-100 mt-2">
                $9<span className="text-sm font-normal text-zinc-500">/mo</span>
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-zinc-300">
                    <Check size={14} className="text-accent shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-6" onClick={handleUpgrade} disabled={upgrading || upgraded}>
                <Sparkles size={14} />
                {upgraded ? "Upgraded (dummy)" : upgrading ? "Processing..." : "Upgrade to Pro"}
              </Button>
              {upgraded && (
                <p className="text-[11px] text-zinc-500 mt-2 text-center">
                  Ini simulasi checkout — integrasi payment gateway akan segera hadir.
                </p>
              )}
            </Card>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
