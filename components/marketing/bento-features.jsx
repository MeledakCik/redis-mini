"use client";
import { motion } from "framer-motion";
import { Zap, Boxes, Plug, Container, HardDrive, Moon } from "lucide-react";
import { cardReveal, staggerContainer } from "@/lib/motion";

const FEATURES = [
  {
    title: "Serverless Redis 7 Alpine",
    desc: "Provisioning instan, image ringan, tanpa maintenance server sendiri.",
    icon: Zap,
    span: "md:col-span-8",
  },
  {
    title: "Qdrant Vector Search",
    desc: "Vector database siap pakai buat embedding & semantic search.",
    icon: Boxes,
    span: "md:col-span-4",
  },
  {
    title: "REST API Compatible",
    desc: "100% kompatibel sama Upstash SDK — tinggal ganti URL.",
    icon: Plug,
    span: "md:col-span-4",
  },
  {
    title: "Docker Compose 1 Click",
    desc: "Jalanin seluruh stack lokal cukup satu perintah `docker compose up`.",
    icon: Container,
    span: "md:col-span-8",
  },
  {
    title: "Persistent Volume External",
    desc: "Data aman nempel di external volume, survive restart & redeploy.",
    icon: HardDrive,
    span: "md:col-span-6",
  },
  {
    title: "Dark Console Premium",
    desc: "UI gelap, cepat, dan enak dipakai tiap hari buat debugging data.",
    icon: Moon,
    span: "md:col-span-6",
  },
];

export function BentoFeatures() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
      <motion.div
        variants={cardReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="text-center mb-12 md:mb-16"
      >
        <span className="font-mono text-xs text-accent">FEATURES</span>
        <h2 className="mt-3 text-3xl md:text-5xl font-display font-bold tracking-tight text-white text-balance">
          Semua yang kamu butuh, satu console.
        </h2>
      </motion.div>

      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="grid grid-cols-1 md:grid-cols-12 gap-4"
      >
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              variants={cardReveal}
              whileHover={{ y: -4 }}
              className={`col-span-1 ${f.span} rounded-2xl md:rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 md:p-8 transition-colors hover:border-accent/30`}
            >
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Icon size={18} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-base md:text-lg text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{f.desc}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
