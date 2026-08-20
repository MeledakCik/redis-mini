"use client";
import { motion, AnimatePresence } from "framer-motion";

// REDESIGN 2030: render inside a `relative overflow-hidden` parent.
export function RippleLayer({ ripples }) {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: r.size,
              height: r.size,
              borderRadius: "9999px",
              background: "currentColor",
            }}
          />
        ))}
      </AnimatePresence>
    </span>
  );
}
