"use client";
import { Terminal, Link2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CopyField } from "@/components/copy-field";

export function ConnectionSection({ instance }) {
  if (!instance) return null;

  const host = instance.host || "127.0.0.1";
  const connectionString = `redis://default:${instance.password}@${host}:${instance.port}`;
  const cliCommand = `redis-cli -h ${host} -p ${instance.port} -a ${instance.password}`;
  const restUrl = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/redis/${instance.id}`;
  const restToken = instance.password;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 size={14} className="text-accent" /> Connect to your database
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CopyField label="Connection String" value={connectionString} />
        <CopyField label="Redis CLI Command" value={cliCommand} icon={Terminal} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CopyField label="REST URL" value={restUrl} mono />
          <CopyField label="REST Token" value={restToken} mono />
        </div>
      </CardContent>
    </Card>
  );
}
