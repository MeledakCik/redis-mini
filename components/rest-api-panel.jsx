"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

export function RestApiPanel({ instance }) {
  if (!instance) return null;
  const restUrl = `http://127.0.0.1:3000/api/redis/${instance.id}/exec`;
  const token = instance.password;

  const curlExample = `curl -X POST ${restUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{"raw": "SET foo bar"}'`;

  const jsExample = `const res = await fetch("${restUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${token}",
  },
  body: JSON.stringify({ raw: "GET foo" }),
});
const data = await res.json();
console.log(data.result);`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={14} className="text-accent" /> REST API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-500 mb-2 leading-relaxed">
            Endpoint lokal ini menerima command Redis dalam format string mentah, mirip REST API Upstash asli.
            Cocok buat dipanggil dari edge function / serverless yang gak support koneksi TCP langsung ke Redis.
          </p>
          <p className="text-[11px] text-yellow-500/80 mb-4 bg-yellow-950/30 border border-yellow-900/40 rounded-lg px-3 py-2">
            Catatan: di versi lokal ini header Authorization masih dummy (belum divalidasi backend). Endpoint hanya bisa diakses dari localhost kamu sendiri.
          </p>

          <div className="mb-4">
            <p className="text-xs text-zinc-500 mb-1.5">cURL</p>
            <pre className="mono text-xs bg-card border border-border rounded-lg p-3 overflow-x-auto text-zinc-300">{curlExample}</pre>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-1.5">JavaScript (fetch)</p>
            <pre className="mono text-xs bg-card border border-border rounded-lg p-3 overflow-x-auto text-zinc-300">{jsExample}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
