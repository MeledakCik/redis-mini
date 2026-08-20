"use client";
// REDESIGN 2030: left column sticky on desktop with a vertical progress line that fills
// as the section scrolls (useScroll targeting the section), active step glows.
import { useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { SectionTitle } from "@/components/marketing/section-title";

const STEPS = [
  { n: "01", title: "Create DB di /connect", desc: "Klik Create Database, pilih region, kelar dalam hitungan detik." },
  { n: "02", title: "Get REDIS_URL", desc: "Copy connection string & token langsung dari halaman detail database." },
  { n: "03", title: "Connect dari app mu", desc: "Ganti URL doang di kode existing kamu — sisanya sama persis." },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 70%", "end 40%"] });
  const lineHeight = useSpring(scrollYProgress, { stiffness: 120, damping: 26, restDelta: 0.001 });

  return (
    <section id="how-it-works" ref={sectionRef} className="max-w-6xl mx-auto px-5 md:px-8 lg:px-12 py-20 md:py-28">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Left: sticky on desktop, plain stack on mobile */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionTitle eyebrow="HOW IT WORKS" title="Tiga langkah, connect." align="left" />

          <div className="relative mt-10 pl-6">
            {/* track + animated progress line */}
            <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-white/[0.08] rounded-full" />
            <motion.span
              style={{ scaleY: lineHeight }}
              className="absolute left-0 top-1 bottom-1 w-[2px] bg-gradient-to-b from-accent to-glow-cyan rounded-full origin-top"
            />

            <div className="space-y-3">
              {STEPS.map((step, i) => (
                <motion.button
                  key={step.n}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-10%" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  animate={active === i ? { scale: 1.02 } : { scale: 1 }}
                  className={`w-full text-left rounded-2xl border p-5 transition-all duration-300 ${
                    active === i
                      ? "bg-accent/10 border-accent/40 shadow-[0_0_20px_-6px_rgba(0,224,149,0.4)]"
                      : "bg-white/[0.02] border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <span className={`font-mono text-xs ${active === i ? "text-accent" : "text-zinc-600"}`}>
                    Step {step.n}
                  </span>
                  <p className="mt-1 font-display font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-sm text-zinc-400">{step.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: preview panel that swaps with active step */}
        <motion.div
          initial={{ opacity: 0, y: 60, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden h-[320px] md:h-[420px] flex items-center justify-center"
        >
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center"
          >
            <motion.span
              animate={{ boxShadow: "0 0 30px -6px rgba(0,224,149,0.5)" }}
              className="h-14 w-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center font-display font-bold text-accent text-lg"
            >
              {STEPS[active].n}
            </motion.span>
            <p className="font-display font-semibold text-white text-lg">{STEPS[active].title}</p>
            <p className="text-sm text-zinc-500 max-w-xs">{STEPS[active].desc}</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
