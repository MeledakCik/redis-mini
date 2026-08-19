"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Boxes, Circle } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { RedisConsole } from "@/components/redis-console";
import { VectorConsole } from "@/components/vector-console";
import { cn } from "@/lib/utils";

const OUTER_TABS = [
  { value: "redis", label: "Redis", icon: Database, badge: "Cluster Online", badgeColor: "text-accent bg-accent/10 border-accent/20" },
  { value: "vector", label: "Vector", icon: Boxes, badge: "Vector Online", badgeColor: "text-violet-400 bg-violet-500/15 border-violet-500/20" },
];

export function UnifiedConsole({ id, initialTab = "redis" }) {
  const [activeOuter, setActiveOuter] = useState(
    OUTER_TABS.some((t) => t.value === initialTab) ? initialTab : "redis"
  );

  const activeMeta = OUTER_TABS.find((t) => t.value === activeOuter);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Databases", id, activeMeta.label]} />

        <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-28 lg:pb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-lg font-bold mono text-zinc-100 truncate">{id}</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0",
                  activeMeta.badgeColor
                )}
              >
                <Circle size={6} className="fill-current" />
                {activeMeta.badge}
              </span>
            </div>
          </div>

          {/* Outer tabs: Redis / Vector - the unified project view */}
          <div className="mb-6 flex items-center gap-2 p-1 rounded-xl border border-zinc-800 bg-[#0e0e0e] w-fit max-w-full overflow-x-auto no-scrollbar">
            {OUTER_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeOuter === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setActiveOuter(t.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <motion.div
            key={activeOuter}
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeOuter === "redis" && <RedisConsole id={id} embedded />}
            {activeOuter === "vector" && <VectorConsole id={id} embedded />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
