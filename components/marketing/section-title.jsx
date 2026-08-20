"use client";
// REDESIGN 2030: shared section heading — eyebrow + title + underline that grows 0->100% on inView.
import { motion } from "framer-motion";

export function SectionTitle({ eyebrow, title, align = "center", className = "" }) {
  return (
    <div className={`${align === "center" ? "text-center mx-auto" : ""} ${className}`}>
      {eyebrow && (
        <span className="inline-block font-mono text-xs text-accent tracking-wider mb-3">{eyebrow}</span>
      )}
      <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white text-balance">
        {title}
      </h2>
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: align === "center" ? "center" : "left" }}
        className={`mt-4 h-[2px] w-16 bg-gradient-to-r from-accent to-glow-cyan rounded-full ${
          align === "center" ? "mx-auto" : ""
        }`}
      />
    </div>
  );
}
