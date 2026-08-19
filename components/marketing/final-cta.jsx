"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cardReveal } from "@/lib/motion";

export function FinalCta({ isLoggedIn }) {
  const ref = useRef(null);
  // ANIMASI KASYAF: spotlight cursor — posisi % disimpan di state, dipakai sebagai CSS var
  const [spot, setSpot] = useState({ x: 50, y: 50 });

  function handleMouseMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <section id="pricing" className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        variants={cardReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="relative overflow-hidden rounded-3xl border border-accent/30 bg-black/60 px-6 py-16 md:py-24 text-center bg-grid-dots"
      >
        {/* ANIMASI KASYAF: spotlight ngikutin cursor */}
        <div
          className="pointer-events-none absolute inset-0 opacity-80 transition-[background] duration-150 hidden md:block"
          style={{
            background: `radial-gradient(500px circle at ${spot.x}% ${spot.y}%, rgba(0,224,149,0.18), transparent 65%)`,
          }}
        />

        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white text-balance">
            Mulai gratis, scale kapan aja.
          </h2>
          <p className="mt-4 text-sm md:text-base text-zinc-400 max-w-lg mx-auto">
            Provisioning Redis & Vector DB dalam hitungan detik. Gak perlu kartu kredit buat mulai.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={isLoggedIn ? "/databases" : "/register"}
              className="w-full sm:w-auto h-11 px-7 rounded-full bg-accent text-black text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,224,149,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
              <ArrowRight size={15} />
            </Link>
            {!isLoggedIn && (
              <Link
                href="/login"
                className="w-full sm:w-auto h-11 px-7 rounded-full border border-white/15 text-sm text-zinc-200 flex items-center justify-center hover:bg-white/5 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
