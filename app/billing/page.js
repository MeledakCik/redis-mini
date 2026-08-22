"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Database, Boxes, HardDrive, Crown, Clock, Copy, CheckCircle2, Loader2 } from "lucide-react";
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

function formatIDR(n) {
  return new Intl.NumberFormat("id-ID").format(n);
}

function useCountdown(expiresAt) {
  const [msLeft, setMsLeft] = useState(() => (expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setMsLeft(new Date(expiresAt).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (msLeft <= 0) return "00:00";
  const mm = String(Math.floor(msLeft / 60000)).padStart(2, "0");
  const ss = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Kartu instruksi transfer manual: nominal WAJIB persis (termasuk kode unik 3 digit
// di belakang) karena itu satu-satunya cara webhook Moota mencocokkan mutasi masuk
// ke order ini. Polling /api/billing/status tiap 4 detik nunggu status berubah jadi
// "paid" (otomatis begitu Moota deteksi mutasi & webhook diproses).
function PendingPaymentCard({ order, onPaid, onExpired }) {
  const countdown = useCountdown(order.expiresAt);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/billing/status?orderId=${encodeURIComponent(order.orderId)}`);
        const data = await res.json();
        if (data?.plan?.name === "pro" || data?.order?.status === "paid") {
          onPaid();
        } else if (data?.order?.status === "expired" || !data?.order) {
          onExpired();
        }
      } catch {
        // network hiccup, coba lagi di tick berikutnya
      }
    }, 4000);
    return () => clearInterval(id);
  }, [order.orderId, onPaid, onExpired]);

  function copyAmount() {
    navigator.clipboard.writeText(String(order.grossAmount)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const bank = order.destination?.bank;

  return (
    <Card className="max-w-lg mx-auto mb-8 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Loader2 size={16} className="text-accent animate-spin" />
        <h3 className="text-sm font-semibold text-zinc-100">Menunggu pembayaran</h3>
        <span className="ml-auto flex items-center gap-1 text-xs text-zinc-500 mono">
          <Clock size={12} /> {countdown}
        </span>
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        Transfer <span className="text-zinc-300 font-medium">persis sesuai nominal</span> di bawah (termasuk 3 digit terakhir).
        Status Pro aktif otomatis begitu mutasi terdeteksi — tidak perlu konfirmasi manual.
      </p>

      <div className="bg-card2 border border-border rounded-xl p-4 mb-4">
        <p className="text-[11px] text-zinc-500 mb-1">Jumlah transfer</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-accent mono">Rp{formatIDR(order.grossAmount)}</p>
          <button
            onClick={copyAmount}
            className="ml-auto flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 border border-border rounded-lg px-2 py-1"
          >
            {copied ? <CheckCircle2 size={12} className="text-accent" /> : <Copy size={12} />}
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-1">
          Rp{formatIDR(order.grossAmount - order.uniqueCode)} + kode unik {order.uniqueCode}
        </p>
      </div>

      {bank?.accountNumber && (
        <div className="flex items-center justify-between text-sm mb-3 px-1">
          <span className="text-zinc-500">Transfer bank</span>
          <span className="text-zinc-200 mono">
            {bank.bankName} {bank.accountNumber} a.n {bank.accountName}
          </span>
        </div>
      )}

      {order.destination?.qrisImageUrl && (
        <div className="flex flex-col items-center gap-2 mt-2">
          <p className="text-[11px] text-zinc-500">atau scan QRIS</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={order.destination.qrisImageUrl} alt="QRIS" className="w-40 h-40 object-contain rounded-lg border border-border bg-white p-2" />
        </div>
      )}
    </Card>
  );
}

export default function BillingPage() {
  const [quota, setQuota] = useState(null);
  const [order, setOrder] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [error, setError] = useState("");
  const bootstrapped = useRef(false);

  const refreshQuota = useCallback(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  // Kalau user reload halaman sementara masih ada order pending, tampilkan lagi
  // kartu instruksi transfernya (jangan hilang cuma karena refresh).
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((data) => {
        if (data?.order && data.order.status === "pending") setOrder(data.order);
      })
      .catch(() => {});
  }, []);

  async function handleUpgrade() {
    setError("");
    setCheckingOut(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai checkout");
      setOrder({
        orderId: data.orderId,
        grossAmount: data.grossAmount,
        uniqueCode: data.uniqueCode,
        expiresAt: data.expiresAt,
        destination: data.destination,
        status: "pending",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  }

  const handlePaid = useCallback(() => {
    setOrder(null);
    setJustPaid(true);
    refreshQuota();
  }, [refreshQuota]);

  const handleExpired = useCallback(() => {
    setOrder(null);
    setError("Waktu pembayaran habis. Silakan checkout ulang.");
  }, []);

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

          {justPaid && (
            <div className="max-w-lg mx-auto mb-6 flex items-start gap-2.5 text-sm text-zinc-300 bg-card2 border border-border rounded-xl p-3.5">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-accent" />
              <p>Pembayaran terdeteksi otomatis. Pro plan sudah aktif.</p>
            </div>
          )}

          {order && <PendingPaymentCard order={order} onPaid={handlePaid} onExpired={handleExpired} />}

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
                <Button className="w-full mt-6" onClick={handleUpgrade} disabled={checkingOut || isPro || !!order}>
                  <Sparkles size={14} />
                  {isPro ? "Sudah Pro" : checkingOut ? "Menyiapkan pembayaran..." : order ? "Menunggu pembayaran" : "Upgrade to Pro"}
                </Button>
                {error && <p className="text-[11px] text-red-400 mt-2 text-center">{error}</p>}
                {!isPro && !order && (
                  <p className="text-[11px] text-zinc-500 mt-2 text-center">
                    Transfer bank atau QRIS langsung, terdeteksi & aktif otomatis — tanpa redirect ke pihak ketiga.
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
