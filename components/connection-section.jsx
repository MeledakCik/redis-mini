"use client";
import { useState } from "react";
import { Terminal, Link2, Info, Code2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CopyField } from "@/components/copy-field";

const LANGS = ["Node.js", "Go", "Python"];

function snippetFor(lang, { connectionString, prefix }) {
  if (lang === "Node.js") {
    return `import Redis from "ioredis";

const redis = new Redis("${connectionString}");

await redis.set("${prefix}hello", "world");
console.log(await redis.get("${prefix}hello"));`;
  }
  if (lang === "Go") {
    return `import "github.com/redis/go-redis/v9"

opt, _ := redis.ParseURL("${connectionString}")
rdb := redis.NewClient(opt)

rdb.Set(ctx, "${prefix}hello", "world", 0)
val, _ := rdb.Get(ctx, "${prefix}hello").Result()`;
  }
  return `import redis

r = redis.from_url("${connectionString}")

r.set("${prefix}hello", "world")
print(r.get("${prefix}hello"))`;
}

export function ConnectionSection({ instance }) {
  const [lang, setLang] = useState("Node.js");

  if (!instance) return null;

  // provider "acl" (Redis-as-a-Service) sudah punya connection string publik siap pakai.
  // Instance lama (provider "docker"/"external") fallback ke bentuk lama.
  const connectionString =
    instance.externalUrl ||
    `redis://default:${instance.password}@${instance.host || "127.0.0.1"}:${instance.port}`;
  const cliCommand = instance.username
    ? `redis-cli -u ${connectionString}`
    : `redis-cli -h ${instance.host} -p ${instance.port} -a ${instance.password}`;
  const prefix = instance.prefix || "";
  const restUrl = `${typeof window !== "undefined" ? window.location.origin : "https://your-app.example.com"}/api/redis/${instance.id}`;
  const restToken = instance.password;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 size={14} className="text-accent" /> Connect to your database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="Connection String" value={connectionString} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {instance.username && <CopyField label="Username" value={instance.username} />}
            <CopyField label="Password" value={instance.password} />
          </div>
          {prefix && <CopyField label="Key Prefix" value={prefix} />}
          <CopyField label="Redis CLI Command" value={cliCommand} icon={Terminal} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CopyField label="REST URL" value={restUrl} mono />
            <CopyField label="REST Token" value={restToken} mono />
          </div>
        </CardContent>
      </Card>

      <Card className="p-4 bg-blue-950/20 border-blue-900/50">
        <p className="text-xs text-blue-200/80 flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0" />
          Use this URL in your application (ioredis, redis-cli, etc). All keys must be prefixed
          with your username prefix for isolation
          {prefix && (
            <>
              , e.g. <code className="mono bg-white/5 px-1 py-0.5 rounded">SET {prefix}foo bar</code>.
            </>
          )}
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 size={14} className="text-accent" /> Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 mb-3">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  lang === l ? "bg-accent/10 text-accent font-medium" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <pre className="mono text-xs bg-card border border-border rounded-lg p-3 overflow-x-auto text-zinc-300 whitespace-pre-wrap">
            {snippetFor(lang, { connectionString, prefix })}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
