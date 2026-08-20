"use client";
// REDESIGN 2030: replaced vanity numbers with realistic DX tags. The latency tag still
// gets a spring count-up (50ms -> <1ms) since it's the one genuinely numeric claim.
import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Zap, Layers, Plug, ShieldCheck } from "lucide-react";

function LatencyCounter() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const mv = useMotionValue(50);
  const spring = useSpring(mv, { stiffness: 80, damping: 20 });
  const rounded = useTransform(spring, (v) => (v <= 1 ? "<1" : Math.round(v)));

  useEffect(() => {
    if (inView) mv.set(1);
  }, [inView, mv]);

  return (
    <span ref={ref} className="font-display font-bold text-2xl md:text-3xl text-white">
      <motion.span>{rounded}</motion.span>ms
    </span>
  );
}

const STATS = [
  { icon: Zap, label: "Sub-ms Latency", node: <LatencyCounter /> },
  { icon: Layers, label: "Multi-Tenant Architecture", node: null },
  { icon: Plug, label: "Upstash SDK Compatible", node: null },
  { icon: ShieldCheck, label: "100% REST API Ready", node: null },
];

export function StatsCounter() {
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-20">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 text-center">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] py-8 px-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
            >
              <div className="absolute inset-0 bg-grid-dots opacity-[0.15] pointer-events-none" />
              <div className="relative">
                <div className="mx-auto mb-3 h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Icon size={16} className="text-accent" />
                </div>
                {s.node ?? (
                  <span className="font-display font-bold text-sm md:text-base text-white leading-tight block">
                    {s.label}
                  </span>
                )}
                {s.node && <p className="mt-2 text-xs md:text-sm text-zinc-500">{s.label}</p>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
