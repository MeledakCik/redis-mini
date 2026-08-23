import Link from "next/link";
import { Check } from "lucide-react";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Card } from "@/components/ui/card";

// Billing dicabut total — app ini sekarang FREE mode selamanya, satu tier doang.
// TODO: re-add custom QRIS gateway later kalau mau jual Pro plan lagi (dulu ada FREE_FEATURES
// + PRO_FEATURES 2 kartu berdampingan, lihat git history sebelum komit ini kalau perlu referensi).
const FREE_FEATURES = [
  "1 Redis database",
  "1 Vector database (Qdrant)",
  "500MB total storage / akun",
  "REST API + CLI browser",
  "Community support",
];

const FAQ = [
  {
    q: "Apa yang terjadi kalau storage/database limit tercapai?",
    a: "Data yang sudah ada tetap aman dan bisa dibaca/dihapus, tapi kamu gak bisa nulis data baru atau bikin database baru sampai bersihin data lama.",
  },
  {
    q: "Ada rencana paid plan?",
    a: "Belum tersedia saat ini. Semua akun jalan di free tier yang sama.",
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
              Gratis sepenuhnya. Cukup buat development, evaluasi, sampai proyek kecil.
            </p>
          </div>

          <div className="max-w-sm mx-auto">
            <Card className="p-7">
              <h2 className="text-base font-semibold text-zinc-100">Free</h2>
              <p className="text-3xl font-bold text-zinc-100 mt-3">
                $0<span className="text-sm font-normal text-zinc-500">/mo</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-zinc-400">
                    <Check size={14} className="text-accent shrink-0" /> {f}
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
