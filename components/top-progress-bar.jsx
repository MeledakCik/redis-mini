"use client";
// ANIMASI KASYAF: garis progress scroll tipis di paling atas viewport.
import { motion, useScroll, useSpring } from "framer-motion";

export function TopProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] bg-accent origin-left z-[100]"
    />
  );
}
