"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { cardReveal } from "@/lib/motion";

const STEPS = [
  {
    n: "01",
    title: "Create DB di /connect",
    desc: "Klik Create Database, pilih region, kelar dalam hitungan detik.",
  },
  {
    n: "02",
    title: "Get REDIS_URL",
    desc: "Copy connection string & token langsung dari halaman detail database.",
  },
  {
    n: "03",
    title: "Connect dari app mu",
    desc: "Ganti URL doang di kode existing kamu — sisanya sama persis.",
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Left: sticky on desktop, plain stack on mobile — RESPONSIVE FIX */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <span className="font-mono text-xs text-accent">HOW IT WORKS</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-display font-bold tracking-tight text-white text-balance">
            Tiga langkah, connect.
          </h2>

          <div className="mt-10 space-y-3">
            {STEPS.map((step, i) => (
              <motion.button
                key={step.n}
                variants={cardReveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-10%" }}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left rounded-2xl border p-5 transition-colors ${
                  active === i
                    ? "bg-accent/10 border-accent/40"
                    : "bg-white/[0.02] border-white/[0.08] hover:border-white/20"
                }`}
              >
                <span className={`font-mono text-xs ${active === i ? "text-accent" : "text-zinc-600"}`}>
                  Step {step.n}
                </span>
                <p className="mt-1 font-display font-semibold text-white">{step.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{step.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right: preview panel that swaps with active step */}
        <motion.div
          variants={cardReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden h-[320px] md:h-[420px] flex items-center justify-center"
        >
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center"
          >
            <span className="h-14 w-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center font-display font-bold text-accent text-lg">
              {STEPS[active].n}
            </span>
            <p className="font-display font-semibold text-white text-lg">{STEPS[active].title}</p>
            <p className="text-sm text-zinc-500 max-w-xs">{STEPS[active].desc}</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
