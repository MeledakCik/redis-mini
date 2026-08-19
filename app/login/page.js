"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/databases";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email atau password salah");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* ambient glow bg - premium dark aesthetic, no logic changes */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[24rem] h-[24rem] rounded-full bg-violet-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="w-full max-w-sm fade-in">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Kasyaf Redis Cloud" width={36} height={36} className="h-9 w-9 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-base tracking-tight text-zinc-100">Kasyaf Redis Cloud</span>
            <span className="text-[10px] text-zinc-500 opacity-70">by Cikawan</span>
          </div>
        </div>

        <div className="bg-card2/70 backdrop-blur-xl border border-border rounded-xl shadow-2xl px-6 py-7 ring-1 ring-white/[0.03]">
          <div className="flex items-center gap-2 mb-1.5">
            <Database size={16} className="text-accent" />
            <h1 className="text-sm font-semibold text-zinc-100">Login ke akun kamu</h1>
          </div>
          <p className="text-xs text-zinc-500 mb-6">Kelola Redis database kamu di managed cluster kami.</p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full justify-center mt-1" disabled={loading}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-5">
          Belum punya akun?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Daftar
          </Link>
        </p>
        <p className="text-center text-[11px] text-zinc-700 mt-3">
          Data akun & database kamu tersimpan permanen selama container tidak dihapus manual.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
