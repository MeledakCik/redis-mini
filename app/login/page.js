"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Database, Loader2, ChevronDown, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.65z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.1C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.31 14.31A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.4-2.31v-3.1H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.41l4.01-3.1z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.59l4.01 3.1C6.25 6.85 8.89 4.75 12 4.75z" />
    </svg>
  );
}

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.43-2.7 5.41-5.27 5.69.42.36.78 1.08.78 2.18 0 1.57-.02 2.84-.02 3.23 0 .31.21.67.8.56A10.51 10.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/databases";
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // "google" | "github" | null
  const [error, setError] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);

  async function handleOAuth(provider) {
    setOauthLoading(provider);
    try {
      await signIn(provider, { callbackUrl });
    } finally {
      // signIn(provider) biasanya redirect penuh; finally ini cuma jaga-jaga kalau gagal cepat
      setOauthLoading(null);
    }
  }

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

          {oauthError && (
            <p className="text-red-400 text-xs bg-red-950/50 border border-red-900 rounded-lg px-3 py-2 mb-4">
              {oauthError === "AccessDenied"
                ? "Email kamu belum di-whitelist buat akses console ini."
                : "Login gagal, coba lagi."}
            </p>
          )}

          <div className="space-y-2.5">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2"
              disabled={oauthLoading !== null}
              onClick={() => handleOAuth("google")}
            >
              {oauthLoading === "google" ? <Loader2 size={14} className="animate-spin" /> : <GoogleIcon />}
              {oauthLoading === "google" ? "Redirecting..." : "Continue with Google"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2"
              disabled={oauthLoading !== null}
              onClick={() => handleOAuth("github")}
            >
              {oauthLoading === "github" ? <Loader2 size={14} className="animate-spin" /> : <GithubIcon />}
              {oauthLoading === "github" ? "Redirecting..." : "Continue with GitHub"}
            </Button>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => setShowCredentials((v) => !v)}
            className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-1 py-1.5"
          >
            <span className="flex items-center gap-1.5">
              <KeyRound size={13} />
              Sign in with Email
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${showCredentials ? "rotate-180" : ""}`}
            />
          </button>

          {showCredentials && (
            <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
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
          )}
        </div>

        <p className="text-center text-xs text-zinc-500 mt-5">
          Belum punya akses?{" "}
          <span className="text-zinc-400">Hubungi admin buat ditambahin ke whitelist.</span>
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
