"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Sparkles, Database, Boxes, HardDrive, Crown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";
import { cardReveal, staggerContainer } from "@/lib/motion";

const FREE_FEATURES = ["1 Redis database", "1 Vector database", "500MB total storage", "Community support"];
const PRO_FEATURES = ["20 Redis databases", "20 Vector databases", "10GB total storage", "Priority support"];

function UsageRing({ label, icon: Icon, count, limit, colorClass = "#00e095" }) {
  const pct = limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0;
  const data = [{ name: label, value: pct, fill: colorClass }];
  return (
    <Card className="p-4 flex flex-col items-center text-center">
      <div className="w-full h-28 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" barSize={8} data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#1f1f1f" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon size={14} className="text-accent mb-1" />
          <p className="text-sm font-semibold mono text-zinc-100">
            {count}/{limit}
          </p>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </Card>
  );
}

function CheckoutNotice() {
  const params = useSearchParams();
  const status = params.get("checkout");
  if (!status) return null;

  const map = {
    finish: { icon: CheckCircle2, text: "Pembayaran diterima Midtrans. Status Pro akan aktif begitu webhook diproses (biasanya instan).", variant: "green" },
    pending: { icon: AlertTriangle, text: "Pembayaran masih pending. Selesaikan dulu di metode pembayaran yang kamu pilih.", variant: "yellow" },
    error: { icon: AlertTriangle, text: "Pembayaran gagal atau dibatalkan. Coba lagi kapan saja.", variant: "red" },
  };
  const item = map[status];
  if (!item) return null;
  const Icon = item.icon;

  return (
    <div className="max-w-lg mx-auto mb-6 flex items-start gap-2.5 text-sm text-zinc-300 bg-card2 border border-border rounded-xl p-3.5">
      <Icon size={16} className="shrink-0 mt-0.5 text-accent" />
      <p>{item.text}</p>
    </div>
  );
}

export default function BillingPage() {
  const [quota, setQuota] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => {});
  }, []);

  // Redirect flow: server bikin transaksi Midtrans, kita cuma pindah ke redirect_url
  // yang Midtrans kasih balik — status final tetap dikonfirmasi lewat webhook server-to-server.
  async function handleUpgrade() {
    setError("");
    setCheckingOut(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai checkout");
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err.message);
      setCheckingOut(false);
    }
  }

  const isPro = quota?.plan?.name === "pro";

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

          <Suspense fallback={null}>
            <CheckoutNotice />
          </Suspense>

          {isPro && quota?.plan?.expiresAt && (
            <div className="max-w-lg mx-auto mb-6 flex items-center gap-2.5 text-sm bg-accent/10 border border-accent/30 rounded-xl p-3.5">
              <Crown size={16} className="text-accent shrink-0" />
              <p className="text-zinc-200">
                Kamu di <span className="font-semibold text-accent">Pro plan</span>, aktif sampai{" "}
                {new Date(quota.plan.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.
              </p>
            </div>
          )}

          {quota && (
            <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg mx-auto">
              <UsageRing label="Redis" icon={Database} count={quota.redis.count} limit={quota.redis.limit} />
              <UsageRing label="Vector" icon={Boxes} count={quota.vector.count} limit={quota.vector.limit} colorClass="#38bdf8" />
              <UsageRing label="Storage %" icon={HardDrive} count={Math.round(quota.storage.pct)} limit={100} colorClass="#f59e0b" />
            </div>
          )}
          {quota && (
            <p className="text-center text-xs text-zinc-600 mono mb-8 -mt-4">
              {formatBytes(quota.storage.usageBytes)} / {formatBytes(quota.storage.limitBytes)} storage terpakai
            </p>
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
                  {!isPro && <Badge variant="zinc">Current plan</Badge>}
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
                  {isPro ? "Downgrade otomatis saat Pro habis" : "Current plan"}
                </Button>
              </Card>
            </motion.div>

            <motion.div variants={cardReveal}>
              <Card className="p-6 border-accent/40 relative overflow-hidden">
                {!isPro && (
                  <div className="absolute top-0 right-0 bg-accent text-black text-[10px] font-bold px-2.5 py-1 rounded-bl-lg">
                    RECOMMENDED
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-semibold text-zinc-100">Pro</h2>
                  {isPro && <Badge variant="green">Current plan</Badge>}
                </div>
                <p className="text-2xl font-bold text-zinc-100 mt-2">
                  Rp149rb<span className="text-sm font-normal text-zinc-500">/bulan</span>
                </p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-zinc-300">
                      <Check size={14} className="text-accent shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" onClick={handleUpgrade} disabled={checkingOut || isPro}>
                  <Sparkles size={14} />
                  {isPro ? "Sudah Pro" : checkingOut ? "Membuka pembayaran..." : "Upgrade to Pro"}
                </Button>
                {error && <p className="text-[11px] text-red-400 mt-2 text-center">{error}</p>}
                {!isPro && (
                  <p className="text-[11px] text-zinc-500 mt-2 text-center">
                    Dibayar via Midtrans (QRIS, VA, kartu, e-wallet). Kamu akan diarahkan ke halaman pembayaran Midtrans.
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
