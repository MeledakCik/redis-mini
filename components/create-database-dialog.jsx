"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Database, Loader2, Lock, ShieldCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Redis-as-a-Service: satu klik langsung provisioning akun Redis ACL (username, password,
// key prefix) di cluster utama kami. Tidak ada input Redis URL manual — konsisten dengan
// halaman Databases yang cuma pernah menampilkan database milik akun sendiri.
export function CreateDatabaseDialog({ open, onClose, onCreated }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleCreate() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
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
      // Task: setelah create, langsung ke halaman Details database ini.
      router.push(`/redis/${data.instance.id}`);
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
            Create Database
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 text-sm">
          <p className="text-zinc-400 leading-relaxed">
            Database Redis baru akan diprovisioning otomatis di cluster kami. Kamu akan mendapat
            username, password, dan connection string sendiri — siap dipakai dari aplikasi
            manapun, tanpa setup tambahan.
          </p>

          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Name (optional)</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-database (kosongkan untuk auto-generate)"
              className="mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-card border border-border rounded-lg px-3 py-2.5">
              <p className="text-zinc-600 flex items-center gap-1"><MapPin size={11} /> Region</p>
              <p className="text-zinc-300 mt-0.5">ID-JKT-1</p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2.5">
              <p className="text-zinc-600 flex items-center gap-1"><ShieldCheck size={11} /> Isolation</p>
              <p className="text-zinc-300 mt-0.5">Redis ACL</p>
            </div>
          </div>

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
            {loading ? "Provisioning..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
