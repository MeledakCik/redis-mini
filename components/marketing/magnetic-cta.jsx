"use client";
// REDESIGN 2030: magnetic hover CTA — nudges toward the cursor within its own bounds,
// arrow slides on hover, ripples on click. Wraps next/link so routing (href) never changes.
import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRipple } from "@/lib/use-ripple";
import { RippleLayer } from "@/components/ripple-layer";

export function MagneticCta({ href, children, variant = "solid", className, showArrow = true, onClick }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const { ripples, addRipple } = useRipple();

  function handleMouseMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.35;
    setPos({ x, y });
  }

  function handleMouseLeave() {
    setPos({ x: 0, y: 0 });
  }

  const base =
    variant === "solid"
      ? "bg-accent text-black shadow-[0_0_25px_-5px_rgba(0,224,149,0.5)] hover:shadow-[0_0_32px_-4px_rgba(0,224,149,0.6)]"
      : "border border-white/15 bg-white/[0.02] backdrop-blur-xl text-zinc-200 hover:border-accent/40";

  return (
    <motion.span
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 200, damping: 16, mass: 0.4 }}
      className="inline-block w-full sm:w-auto"
    >
      <Link
        href={href}
        onMouseDown={addRipple}
        onClick={onClick}
        className={cn(
          "relative overflow-hidden group w-full sm:w-auto h-11 px-6 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]",
          base,
          className
        )}
      >
        <RippleLayer ripples={ripples} />
        <span className="relative">{children}</span>
        {showArrow && (
          <ArrowRight
            size={15}
            className="relative transition-transform duration-300 group-hover:translate-x-1"
          />
        )}
      </Link>
    </motion.span>
  );
}
