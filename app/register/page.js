"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal registrasi");

      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        router.push("/login");
        return;
      }
      router.push("/databases");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-emerald-600 flex items-center justify-center font-bold text-black text-base">
            R
          </div>
          <span className="font-semibold text-base tracking-tight text-zinc-100">Redis UTS</span>
        </div>

        <div className="bg-card2 border border-border rounded-xl shadow-2xl px-6 py-7">
          <div className="flex items-center gap-2 mb-1.5">
            <Database size={16} className="text-accent" />
            <h1 className="text-sm font-semibold text-zinc-100">Buat akun baru</h1>
          </div>
          <p className="text-xs text-zinc-500 mb-6">Setiap akun mendapat database Redis yang terisolasi sendiri.</p>

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
                placeholder="Minimal 8 karakter"
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full justify-center mt-1" disabled={loading}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-5">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
