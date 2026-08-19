"use client";
import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";

const STATS = [
  { label: "Sub-ms latency", value: 1, suffix: "ms" },
  { label: "Databases provisioned", value: 12000, suffix: "+" },
  { label: "Uptime", value: 99.9, suffix: "%" },
  { label: "Regions", value: 3, suffix: "" },
];

function Counter({ value, suffix }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 90, damping: 20 });
  const rounded = useTransform(spring, (v) =>
    Number.isInteger(value) ? Math.round(v).toLocaleString("id-ID") : v.toFixed(1)
  );

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  return (
    <span ref={ref} className="font-display font-bold text-3xl md:text-5xl text-white">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

export function StatsCounter() {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-20">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 text-center">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-8 px-4">
            <Counter value={s.value} suffix={s.suffix} />
            <p className="mt-2 text-xs md:text-sm text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
