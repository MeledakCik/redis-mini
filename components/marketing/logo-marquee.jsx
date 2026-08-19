"use client";
import { motion } from "framer-motion";

const LOGOS = ["Vercel", "Docker", "Railway", "Next.js", "Qdrant"];
const ROW = [...LOGOS, ...LOGOS];

export function LogoMarquee() {
  return (
    <section className="py-10 border-y border-white/5 overflow-hidden">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="flex items-center gap-12 md:gap-20 whitespace-nowrap px-4"
      >
        {ROW.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="font-display font-semibold text-lg md:text-2xl text-zinc-500 opacity-60 shrink-0"
          >
            {name}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
