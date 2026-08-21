"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cardReveal } from "@/lib/motion";
import { MagneticCta } from "@/components/marketing/magnetic-cta";

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
    <section id="pricing" className="max-w-6xl mx-auto px-5 md:px-8 lg:px-12 py-20 md:py-28">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        variants={cardReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="relative overflow-hidden rounded-3xl border border-accent/30 bg-black/60 px-6 py-16 md:py-24 text-center bg-grid-dots"
      >
        {/* REDESIGN 2030: huge low-opacity "KASYAF" wordmark drifting slower than scroll */}
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.04 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          aria-hidden
          className="pointer-events-none select-none absolute inset-0 flex items-center justify-center font-display font-bold text-[22vw] leading-none text-white whitespace-nowrap"
        >
          KASYAF
        </motion.span>

        {/* spotlight ngikutin cursor */}
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
            <MagneticCta href={isLoggedIn ? "/databases" : "/register"} variant="solid">
              {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
            </MagneticCta>
            {!isLoggedIn && (
              <MagneticCta href="/login" variant="outline" showArrow={false}>
                Login
              </MagneticCta>
            )}
          </div>
          <Link href="/pricing" className="inline-block mt-5 text-xs text-zinc-500 hover:text-accent transition-colors underline underline-offset-4">
            Lihat detail pricing & FAQ &rarr;
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
