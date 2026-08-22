"use client";
import { motion } from "framer-motion";
import { History, Circle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { floatLoop } from "@/lib/motion";

// REVAMP: Recent Activity panel di Overview. Kalau ada instance, tampilkan sebagai
// event "provisioned" — kalau kosong, empty state yang hangat, bukan blank.
export function RecentActivity({ instances = [], loading }) {
  const events = instances
    .slice(0, 5)
    .map((inst) => ({
      id: inst.id,
      label: `Database ${inst.id} provisioned`,
      time: inst.createdAt,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History size={13} className="text-accent" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 rounded bg-white/5 animate-pulse" style={{ width: `${70 - i * 12}%` }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center">
            <motion.div {...floatLoop}>
              <Circle className="mx-auto text-zinc-700 mb-2" size={22} />
            </motion.div>
            <p className="text-sm text-zinc-400 font-medium">No activity yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Aktivitas seperti create database, restart, dan flush akan muncul di sini.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-zinc-300 mono truncate flex-1">{e.label}</span>
                <span className="text-xs text-zinc-600 shrink-0">{new Date(e.time).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
