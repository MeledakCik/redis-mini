"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Database, Loader2, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Validasi kasar redis://... atau rediss://... di frontend sebelum kirim ke server
// (server tetap validasi ulang dengan PING beneran lewat ioredis).
function isValidRedisUrl(url) {
  return /^rediss?:\/\/.+/.test(url.trim());
}

export function CreateDatabaseDialog({ open, onClose, onCreated }) {
  const router = useRouter();
  const [deploymentMode, setDeploymentMode] = useState("docker");
  const [name, setName] = useState("");
  const [redisUrl, setRedisUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [tls, setTls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setDeploymentMode(d.deploymentMode || "docker"))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const isExternal = deploymentMode === "external";

  async function handleCreate() {
    setError("");

    if (isExternal) {
      const url = redisUrl.trim();
      if (!url) return setError("Redis URL wajib diisi.");
      if (!isValidRedisUrl(url)) return setError("Redis URL harus diawali redis:// atau rediss://");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isExternal
            ? { name: name.trim() || undefined, redisUrl: (tls ? redisUrl.replace(/^redis:\/\//, "rediss://") : redisUrl).trim() }
            : { name: name.trim() || undefined }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        // Task 3: 403 LIMIT_REACHED -> arahkan ke /billing alih-alih cuma nampilin error text
        if (res.status === 403 && data.error === "LIMIT_REACHED") {
          onClose();
          router.push(data.upgradeUrl || "/billing");
          return;
        }
        throw new Error(data.error || "Gagal membuat database");
      }
      onCreated(data.instance);
      onClose();
      setName("");
      setRedisUrl("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card2 border border-border rounded-xl w-full max-w-md shadow-2xl fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Database size={16} className="text-accent" />
            {isExternal ? "Connect External Redis" : "Create Database"}
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 text-sm">
          {isExternal ? (
            <>
              <p className="text-zinc-400 leading-relaxed">
                Deployment ini jalan tanpa Docker daemon (mis. Railway), jadi database kamu
                connect ke Redis eksternal — Railway Redis plugin, Upstash, atau Redis manapun
                yang bisa diakses dari sini.
              </p>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-external-redis (kosongkan untuk auto-generate)"
                  className="mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Redis URL</label>
                <div className="relative">
                  <Input
                    type={showUrl ? "text" : "password"}
                    value={redisUrl}
                    onChange={(e) => setRedisUrl(e.target.value)}
                    placeholder="redis://default:password@host:6379"
                    className="mono text-xs pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUrl((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                    tabIndex={-1}
                  >
                    {showUrl ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {redisUrl && !isValidRedisUrl(redisUrl) && (
                  <p className="text-amber-400 text-[11px] mt-1">Harus diawali redis:// atau rediss://</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                <input type="checkbox" checked={tls} onChange={(e) => setTls(e.target.checked)} className="accent-accent" />
                Gunakan TLS (rediss://)
              </label>
            </>
          ) : (
            <>
              <p className="text-zinc-400 leading-relaxed">
                Instance Redis baru akan dijalankan sebagai container Docker lokal di laptop kamu —
                image <code className="mono text-zinc-300 bg-white/5 px-1 py-0.5 rounded">redis:7-alpine</code>,
                max memory <span className="text-zinc-300">100MB</span>, eviction policy{" "}
                <span className="text-zinc-300">allkeys-lru</span>.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-card border border-border rounded-lg px-3 py-2.5">
                  <p className="text-zinc-600">Region</p>
                  <p className="text-zinc-300 mt-0.5">Local Docker</p>
                </div>
                <div className="bg-card border border-border rounded-lg px-3 py-2.5">
                  <p className="text-zinc-600">Port Range</p>
                  <p className="text-zinc-300 mt-0.5 mono">11000–12000</p>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-red-400 text-xs bg-red-950/50 border border-red-900 rounded-lg px-3 py-2 flex items-start gap-1.5">
              <Lock size={12} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Creating..." : isExternal ? "Connect" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
