"use client";
import { useEffect, useState } from "react";
import { KeyRound, Loader2, Sparkles, Trash2, ShieldAlert, Info } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/components/copy-field";

export default function ConnectPage() {
  const [tenant, setTenant] = useState(undefined); // undefined = loading, null = belum ada
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      const res = await fetch("/api/redis/status");
      const data = await res.json();
      setTenant(data.tenant);
    } catch {
      setTenant(null);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/redis/create", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat akun Redis");
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/redis/delete", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus akun Redis");
      setTenant(null);
      setConfirmOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Connect"]} />

        <main className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <KeyRound size={18} className="text-accent" /> Redis Account
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Satu akun Redis per user — semua customer share 1 server Redis yang sama, tapi data
              kamu terisolasi lewat Redis ACL (dan gak bisa diakses user lain).
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-red-950/50 border border-red-900 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {tenant === undefined && (
            <Card className="py-16 text-center">
              <Loader2 className="mx-auto animate-spin text-zinc-600" size={24} />
            </Card>
          )}

          {tenant === null && (
            <Card className="py-14 text-center border-dashed">
              <KeyRound className="mx-auto text-zinc-700 mb-3" size={28} />
              <p className="text-zinc-300 font-medium text-sm mb-1">Belum ada akun Redis</p>
              <p className="text-zinc-600 text-xs mb-5 max-w-sm mx-auto">
                Klik tombol di bawah buat generate username, password, dan connection string
                Redis kamu sendiri — siap pakai di aplikasi manapun.
              </p>
              <Button onClick={handleCreate} disabled={creating} className="mx-auto">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {creating ? "Creating..." : "Create Redis Account"}
              </Button>
            </Card>
          )}

          {tenant && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Connection Details
                    <Badge variant={tenant.directAccessSupported ? "green" : "yellow"}>
                      {tenant.directAccessSupported ? "ACL active" : "Prefix-only mode"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CopyField label="Redis URL" value={tenant.redisUrl} />
                  <div className="grid grid-cols-2 gap-4">
                    <CopyField label="Username" value={tenant.username} />
                    <CopyField label="Password" value={tenant.password} />
                  </div>
                  <CopyField label="Key Prefix" value={tenant.prefix} />
                </CardContent>
              </Card>

              {!tenant.directAccessSupported && (
                <Card className="p-4 bg-amber-950/20 border-amber-900/50">
                  <p className="text-xs text-amber-200/90 flex items-start gap-2">
                    <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                    Redis server ini gak mendukung ACL (atau permission admin-nya kurang), jadi
                    Redis URL di atas <span className="font-medium">TIDAK bisa dipakai connect langsung</span>.
                    Data kamu tetap aman & terisolasi lewat Data Browser/REST API bawaan
                    aplikasi ini — cuma gak bisa dari redis-cli/client Redis eksternal.
                  </p>
                </Card>
              )}

              <Card className="p-4 bg-blue-950/20 border-blue-900/50">
                <p className="text-xs text-blue-200/80 flex items-start gap-2">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  Kalau connect LANGSUNG pakai Redis URL di atas (redis-cli, ioredis, dll — bukan
                  lewat dashboard ini), semua key kamu harus diawali{" "}
                  <code className="mono bg-white/5 px-1 py-0.5 rounded">{tenant.prefix}</code>{" "}
                  — misalnya <code className="mono bg-white/5 px-1 py-0.5 rounded">SET {tenant.prefix}foo bar</code>.
                  Redis ACL cuma ngizinin key yang match pattern itu.
                </p>
              </Card>

              <Card className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-300 font-medium">Delete Redis Account</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Hapus ACL user & semua key kamu di Redis. Gak bisa dibatalkan.
                  </p>
                </div>
                <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </Card>
            </div>
          )}
        </main>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-red-400">Delete Redis Account?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-400">
                Ini akan menghapus ACL user dan <span className="text-zinc-200">semua key</span> yang
                tersimpan dengan prefix <code className="mono bg-white/5 px-1 py-0.5 rounded">{tenant?.prefix}</code>.
                Aksi ini permanen.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  {deleting ? "Deleting..." : "Yes, delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
