"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Globe, Database, ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/components/copy-field";
import { cardReveal, staggerContainer } from "@/lib/motion";

// API Keys: aktivasi & tampilkan token REST API untuk database milik akun ini sendiri.
// Provisioning akun Redis ACL sendiri sekarang dilakukan lewat tombol "Create Database"
// di halaman Databases — halaman ini murni untuk mengelola akses REST/CLI token per database.
export default function ConnectPage() {
  const [instances, setInstances] = useState(undefined); // undefined = loading
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/instances")
      .then((r) => r.json())
      .then((d) => setInstances(d.instances || []))
      .catch(() => setError("Gagal memuat database."));
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["API Keys"]} />

        <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-28 lg:pb-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <KeyRound size={18} className="text-accent" /> API Keys
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Token REST API untuk mengakses database Redis kamu lewat HTTPS — cocok untuk edge
              function / serverless yang tidak mendukung koneksi TCP langsung. Setiap database
              punya token sendiri, dibatasi ke key milik database tersebut saja.
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-red-950/50 border border-red-900 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {instances === undefined && (
            <Card className="py-16 text-center">
              <Loader2 className="mx-auto animate-spin text-zinc-600" size={24} />
            </Card>
          )}

          {instances && instances.length === 0 && (
            <Card className="py-14 text-center border-dashed">
              <Database className="mx-auto text-zinc-700 mb-3" size={28} />
              <p className="text-zinc-300 font-medium text-sm mb-1">Belum ada database</p>
              <p className="text-zinc-600 text-xs mb-5 max-w-sm mx-auto">
                Buat database di halaman Databases dulu untuk mendapatkan token REST API.
              </p>
              <Link href="/databases" className="text-accent text-xs hover:underline">
                Ke halaman Databases →
              </Link>
            </Card>
          )}

          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {instances?.map((inst) => (
              <motion.div key={inst.id} variants={cardReveal}>
                <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between w-full flex-wrap gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <Database size={14} className="text-accent shrink-0" />
                      <span className="mono truncate">{inst.name || inst.id}</span>
                    </span>
                    <Link
                      href={`/redis/${inst.id}`}
                      className="text-xs text-zinc-500 hover:text-accent flex items-center gap-0.5 font-normal shrink-0"
                    >
                      Details <ChevronRight size={12} />
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="green">Active</Badge>
                    <span className="text-xs text-zinc-600 flex items-center gap-1">
                      <Globe size={11} /> REST enabled
                    </span>
                  </div>
                  <CopyField
                    label="REST URL"
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/redis/${inst.id}`}
                  />
                  <CopyField label="REST Token" value={inst.password} />
                </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
