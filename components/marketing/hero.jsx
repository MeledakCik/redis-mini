"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";
import { wordReveal, wordStagger } from "@/lib/motion";

const HEADLINE = "Redis & Vector DB Tanpa Ribet.";

export function Hero({ isLoggedIn }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  // ANIMASI KASYAF: glowing orb ngikutin mouse (parallax halus lewat spring)
  const orbX = useSpring(mx, { stiffness: 60, damping: 20 });
  const orbY = useSpring(my, { stiffness: 60, damping: 20 });
  const orbTranslateX = useTransform(orbX, (v) => v * 40);
  const orbTranslateY = useTransform(orbY, (v) => v * 40);

  function handleMouseMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(px);
    my.set(py);
  }

  const words = HEADLINE.split(" ");

  return (
    <section
      ref={ref}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden pt-36 pb-20 md:pt-48 md:pb-28 px-4 md:px-6"
    >
      {/* parallax glow orb — RESPONSIVE FIX: dikecilin & di-clip biar gak overflow di HP */}
      <motion.div
        style={{ x: orbTranslateX, y: orbTranslateY }}
        className="pointer-events-none absolute -top-24 right-[-10%] h-[280px] w-[280px] md:h-[420px] md:w-[420px] rounded-full bg-accent/25 blur-[100px]"
      />

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Left column */}
        <div className="text-center lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block font-mono text-[11px] md:text-xs text-accent tracking-wider mb-5 border border-accent/25 bg-accent/5 rounded-full px-3 py-1"
          >
            [KASYAF_CLOUD_v1]
          </motion.span>

          <motion.h1
            variants={wordStagger()}
            initial="hidden"
            animate="show"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] font-display font-bold tracking-tighter text-balance text-white"
          >
            {words.map((word, i) => (
              <span key={i} className="inline-block overflow-hidden align-top mr-3 md:mr-4">
                <motion.span variants={wordReveal} className="inline-block">
                  {word === "Ribet." ? <span className="text-accent">{word}</span> : word}
                </motion.span>
              </span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-6 text-sm md:text-base text-zinc-400 max-w-md mx-auto lg:mx-0"
          >
            Lightweight console untuk Redis &amp; Qdrant, clone ala console.upstash.com.
            1 codebase jalan di Local (Docker) dan VPS. Data persistent pakai external volume.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
          >
            <Link
              href={isLoggedIn ? "/databases" : "/register"}
              className="w-full sm:w-auto h-11 px-6 rounded-full bg-accent text-black text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,224,149,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
              <ArrowRight size={15} />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto h-11 px-6 rounded-full border border-white/15 text-sm text-zinc-200 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
            >
              <Terminal size={14} />
              See how it works
            </a>
          </motion.div>
        </div>

        {/* Right column: terminal visual */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="rounded-2xl border border-accent/30 bg-black/70 backdrop-blur-xl shadow-[0_0_40px_rgba(0,224,149,0.15)] overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="ml-2 font-mono text-[11px] text-zinc-500">exec.sh</span>
            </div>
            <div className="p-4 md:p-6 font-mono text-[11px] sm:text-xs md:text-sm leading-relaxed overflow-x-auto no-scrollbar">
              <p className="text-zinc-500">
                <span className="text-accent">$</span> curl -X POST https://console.kasyaf.id/api/redis/exec \
              </p>
              <p className="text-zinc-400 pl-3">-H &quot;Authorization: Bearer KASYAF_KEY&quot; \</p>
              <p className="text-zinc-400 pl-3">-d &apos;{"{"}&quot;raw&quot;:&quot;PING&quot;{"}"}&apos;</p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="mt-3 text-accent"
              >
                → &quot;PONG&quot;
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
