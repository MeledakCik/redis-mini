"use client";
import { Zap, Brain, ListOrdered } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cardReveal, staggerContainer } from "@/lib/motion";

const templates = [
  {
    icon: Zap,
    title: "Cache",
    desc: "Untuk session, rate-limit, caching API.",
    color: "text-accent bg-accent/10",
  },
  {
    icon: Brain,
    title: "Vector Search",
    desc: "Untuk AI RAG, semantic search.",
    color: "text-violet-400 bg-violet-500/10",
    href: "/vector",
  },
  {
    icon: ListOrdered,
    title: "Queue",
    desc: "Untuk BullMQ, background jobs.",
    color: "text-sky-400 bg-sky-500/10",
  },
];

// REVAMP: 3 kartu template di bawah CTA utama halaman Databases — biar empty state
// terasa "siap pakai", bukan cuma satu tombol kosong di tengah layar.
export function DatabaseTemplates({ onUseTemplate }) {
  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto"
    >
      {templates.map((t) => {
        const Icon = t.icon;
        return (
          <motion.div key={t.title} variants={cardReveal}>
            <Card className="p-4 text-left h-full flex flex-col">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${t.color}`}>
                <Icon size={16} />
              </div>
              <p className="text-sm font-semibold text-zinc-100">{t.title}</p>
              <p className="text-xs text-zinc-500 mt-1 flex-1">{t.desc}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => (t.href ? (window.location.href = t.href) : onUseTemplate?.(t.title))}
              >
                Use Template
              </Button>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
