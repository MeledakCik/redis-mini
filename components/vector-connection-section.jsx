"use client";
import { useState } from "react";
import { Eye, EyeOff, Copy, Check, Terminal, Link2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function CopyField({ label, value, mono = true, icon: Icon, maskable = false }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const display = maskable && !revealed ? "•".repeat(Math.min(value.length, 24)) : value;

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </p>
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2.5">
        <code className={`text-xs flex-1 truncate text-zinc-300 ${mono ? "mono" : ""}`}>{display}</code>
        {maskable && (
          <button onClick={() => setRevealed((r) => !r)} className="text-zinc-500 hover:text-zinc-200 shrink-0">
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        <button onClick={copy} className="text-zinc-500 hover:text-accent shrink-0">
          {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

export function VectorConnectionSection({ instance }) {
  if (!instance) return null;

  const host = instance.host || "127.0.0.1";
  const connectionString = `qdrant://default:${instance.token}@${host}:${instance.port}/${instance.name}`;
  const cliCommand = `curl -X GET http://${host}:${instance.port}/collections/${instance.name} -H "api-key: ${instance.token}"`;
  const restUrl = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/vector/${instance.id}`;
  const restToken = instance.token;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 size={14} className="text-accent" /> Connect to your database
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CopyField label="Connection String" value={connectionString} maskable />
        <CopyField label="Qdrant CLI Command" value={cliCommand} icon={Terminal} maskable />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CopyField label="REST URL" value={restUrl} mono />
          <CopyField label="REST Token" value={restToken} mono maskable />
        </div>
      </CardContent>
    </Card>
  );
}
