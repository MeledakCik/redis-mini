import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Card } from "@/components/ui/card";

const FREE_FEATURES = [
  "1 Redis database",
  "1 Vector database (Qdrant)",
  "500MB total storage / akun",
  "REST API + CLI browser",
  "Community support",
];
const PRO_FEATURES = [
  "20 Redis databases",
  "20 Vector databases (Qdrant)",
  "10GB total storage / akun",
  "REST API + CLI browser",
  "Priority support",
];

const FAQ = [
  {
    q: "Metode pembayaran apa saja yang didukung?",
    a: "Pembayaran diproses lewat Midtrans — QRIS, transfer Virtual Account (BCA/BNI/BRI/Mandiri/Permata), kartu kredit/debit, dan e-wallet (GoPay, ShopeePay, dll).",
  },
  {
    q: "Apa yang terjadi kalau storage/database limit Free tercapai?",
    a: "Data yang sudah ada tetap aman dan bisa dibaca/dihapus, tapi kamu gak bisa nulis data baru atau bikin database baru sampai upgrade ke Pro atau bersihin data lama.",
  },
  {
    q: "Bisa downgrade kapan aja?",
    a: "Pro plan aktif per 30 hari sejak pembayaran berhasil. Kalau gak diperpanjang, akun otomatis balik ke Free plan setelah masa aktif habis — database yang melebihi limit Free tetap tersimpan, cuma gak bisa nambah data/database baru sampai di bawah limit lagi.",
  },
  {
    q: "Apakah ada trial Pro?",
    a: "Belum ada trial otomatis saat ini. Free plan dirancang cukup buat development & evaluasi sebelum upgrade.",
  },
];

export default async function PricingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="relative min-h-screen bg-bg overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 bg-mesh-landing" />
      <div className="bg-noise" />
      <div className="relative">
        <Navbar isLoggedIn={isLoggedIn} />

        <main className="max-w-5xl mx-auto px-5 md:px-8 pt-32 md:pt-40 pb-24">
          <div className="text-center mb-14">
            <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white">Pricing yang simpel</h1>
            <p className="mt-4 text-sm md:text-base text-zinc-400 max-w-lg mx-auto">
              Mulai gratis, upgrade begitu butuh lebih banyak database atau storage. Tanpa kontrak, batalkan kapan aja.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            <Card className="p-7">
              <h2 className="text-base font-semibold text-zinc-100">Free</h2>
              <p className="text-3xl font-bold text-zinc-100 mt-3">
                $0<span className="text-sm font-normal text-zinc-500">/mo</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-zinc-400">
                    <Check size={14} className="text-zinc-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={isLoggedIn ? "/databases" : "/register"}
                className="mt-7 block text-center h-10 leading-10 rounded-lg border border-border text-sm text-zinc-200 hover:bg-white/5 transition-colors"
              >
                {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
              </Link>
            </Card>

            <Card className="p-7 border-accent/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent text-black text-[10px] font-bold px-2.5 py-1 rounded-bl-lg">
                RECOMMENDED
              </div>
              <h2 className="text-base font-semibold text-zinc-100">Pro</h2>
              <p className="text-3xl font-bold text-zinc-100 mt-3">
                Rp149rb<span className="text-sm font-normal text-zinc-500">/bulan</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-zinc-300">
                    <Check size={14} className="text-accent shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={isLoggedIn ? "/billing" : "/register"}
                className="mt-7 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-accent text-black text-sm font-semibold hover:bg-accent-dark transition-colors"
              >
                <Sparkles size={14} />
                {isLoggedIn ? "Upgrade to Pro" : "Daftar dulu untuk Upgrade"}
              </Link>
            </Card>
          </div>

          <div className="max-w-2xl mx-auto mt-24">
            <h2 className="text-xl font-semibold text-zinc-100 text-center mb-8">Pertanyaan umum</h2>
            <div className="space-y-3">
              {FAQ.map((item) => (
                <Card key={item.q} className="p-5">
                  <p className="text-sm font-medium text-zinc-100">{item.q}</p>
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{item.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
