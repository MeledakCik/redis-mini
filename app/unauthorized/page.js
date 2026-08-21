import Link from "next/link";
import Image from "next/image";
import { ShieldOff } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Image src="/logo.png" alt="Kasyaf Redis Cloud" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="font-semibold text-zinc-100">Kasyaf Redis Cloud</span>
        </div>
        <div className="bg-card2/70 border border-border rounded-xl px-6 py-8">
          <ShieldOff size={28} className="text-red-400 mx-auto mb-3" />
          <h1 className="text-sm font-semibold text-zinc-100 mb-1.5">Akses ditolak</h1>
          <p className="text-xs text-zinc-500 mb-6">
            Email akun ini belum di-whitelist untuk masuk ke console. Hubungi admin buat ditambahin
            ke <code className="text-zinc-400">ALLOWED_EMAILS</code> atau <code className="text-zinc-400">ALLOWED_DOMAINS</code>.
          </p>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-accent text-black text-sm font-semibold px-4 hover:bg-accent-dark transition-colors"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}
