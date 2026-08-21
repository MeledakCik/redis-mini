import Link from "next/link";
import Image from "next/image";
import { Database, ShieldCheck } from "lucide-react";

// Self-serve registration (email+password) sudah ditutup buat cegah bot spam akun.
// Halaman ini sekarang cuma ngarahin ke Google/GitHub OAuth di /login.
export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="w-full max-w-sm fade-in text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Kasyaf Redis Cloud" width={36} height={36} className="h-9 w-9 object-contain" />
          <div className="flex flex-col leading-tight text-left">
            <span className="font-semibold text-base tracking-tight text-zinc-100">Kasyaf Redis Cloud</span>
            <span className="text-[10px] text-zinc-500 opacity-70">by Cikawan</span>
          </div>
        </div>

        <div className="bg-card2/70 backdrop-blur-xl border border-border rounded-xl shadow-2xl px-6 py-8 ring-1 ring-white/[0.03]">
          <ShieldCheck size={26} className="text-accent mx-auto mb-3" />
          <h1 className="text-sm font-semibold text-zinc-100 mb-1.5">Pendaftaran manual sudah ditutup</h1>
          <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
            Buat cegah akun spam, sign up sekarang lewat Google atau GitHub. Akses
            diberikan otomatis kalau email kamu sudah di-whitelist admin.
          </p>

          <Link
            href="/login"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent text-black text-sm font-semibold hover:bg-accent-dark transition-colors"
          >
            <Database size={14} />
            Lanjut ke halaman Login
          </Link>
        </div>

        <p className="text-center text-[11px] text-zinc-700 mt-5">
          Belum di-whitelist? Hubungi admin buat ditambahin ke ALLOWED_EMAILS / ALLOWED_DOMAINS.
        </p>
      </div>
    </div>
  );
}
