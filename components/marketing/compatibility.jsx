"use client";
import { motion } from "framer-motion";
import { cardReveal, staggerContainer } from "@/lib/motion";

const CODE = `import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

await redis.set("foo", "bar");
const value = await redis.get("foo");`;

export function Compatibility() {
  return (
    <section id="compatibility" className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
      <motion.div
        variants={cardReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="text-center mb-12"
      >
        <span className="font-mono text-xs text-accent">COMPATIBILITY</span>
        <h2 className="mt-3 text-3xl md:text-5xl font-display font-bold tracking-tight text-white text-balance">
          Kode sama persis, cuma URL yang beda.
        </h2>
        <span className="inline-block mt-4 font-mono text-[11px] bg-accent/10 text-accent border border-accent/30 rounded-full px-3 py-1">
          Just change URL
        </span>
      </motion.div>

      <motion.div
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {[
          { label: "Upstash", url: "UPSTASH_REDIS_REST_URL", dim: true },
          { label: "Kasyaf", url: "REDIS_URL", dim: false },
        ].map((col) => (
          <motion.div
            key={col.label}
            variants={cardReveal}
            className={`rounded-2xl border overflow-hidden ${
              col.dim ? "border-white/10 bg-white/[0.02]" : "border-accent/30 bg-accent/[0.04]"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className={`font-mono text-xs ${col.dim ? "text-zinc-500" : "text-accent"}`}>{col.label}</span>
              <span className="font-mono text-[10px] text-zinc-600">{col.url}</span>
            </div>
            <pre className="p-4 md:p-5 font-mono text-[11px] sm:text-xs text-zinc-300 overflow-x-auto no-scrollbar leading-relaxed">
{CODE}
            </pre>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
