"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

export function VectorRestApiPanel({ instance }) {
  if (!instance) return null;
  const restUrl = `http://127.0.0.1:3000/api/vector/${instance.id}/exec`;
  const token = instance.token;

  const curlExample = `curl -X POST ${restUrl} \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"raw": "FETCH \\"61173de0-5a24-4e96-82b3-d61f0f2709ef\\""}'`;

  const jsExample = `const res = await fetch("${restUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${token}",
  },
  body: JSON.stringify({ raw: "QUERY [0.1, 0.2, 0.3] TOPK 5" }),
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
            Endpoint lokal <code className="text-zinc-300">{restUrl}</code> menerima command UPSERT, QUERY, DELETE, FETCH, RANGE.
            Sekarang sudah support Postman tanpa login, cukup pakai Bearer token.
          </p>
          <div className="mb-4">
            <p className="text-xs text-zinc-500 mb-1.5">cURL - test FETCH Budi</p>
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