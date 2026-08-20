"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Terminal, Copy, Check } from "lucide-react";
import { MagneticCta } from "@/components/marketing/magnetic-cta";

const HEADLINE = [
  { text: "Serverless", gradient: false },
  { text: "Data", gradient: true },
  { text: "Platform", gradient: true },
  { text: "for", gradient: false },
  { text: "Developers.", gradient: false },
];

const CMD_LINES = [
  { text: "$ curl -X POST https://console.kasyaf.id/api/redis/exec \\", cls: "text-zinc-500" },
  { text: '-H "Authorization: Bearer KASYAF_KEY" \\', cls: "text-zinc-400 pl-3" },
  { text: '-d \'{"raw":"PING"}\'', cls: "text-zinc-400 pl-3" },
];
const FULL_TEXT = CMD_LINES.map((l) => l.text).join("\n");

export function Hero({ isLoggedIn }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const orbX = useSpring(mx, { stiffness: 60, damping: 20 });
  const orbY = useSpring(my, { stiffness: 60, damping: 20 });
  const orbTranslateX = useTransform(orbX, (v) => v * 40);
  const orbTranslateY = useTransform(orbY, (v) => v * 40);
  const orbTranslateXInvA = useTransform(orbTranslateX, (v) => -v * 0.6);
  const orbTranslateYInvA = useTransform(orbTranslateY, (v) => -v * 0.4);
  const orbTranslateXSmall = useTransform(orbTranslateX, (v) => v * 0.3);

  // REDESIGN 2030: char-by-char typing animation for the exec.sh snippet
  const [typed, setTyped] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (typed >= FULL_TEXT.length) return;
    const t = setTimeout(() => setTyped((n) => n + 1), 14);
    return () => clearTimeout(t);
  }, [typed]);
  const typedText = FULL_TEXT.slice(0, typed);
  const doneTyping = typed >= FULL_TEXT.length;

  function handleMouseMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(px);
    my.set(py);
  }

  function handleCopy() {
    navigator.clipboard?.writeText(FULL_TEXT).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section
      ref={ref}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden pt-36 pb-20 md:pt-48 md:pb-28 px-5 md:px-8 lg:px-12"
    >
      {/* REDESIGN 2030: 3 parallax orbs — emerald, violet, cyan */}
      <motion.div
        style={{ x: orbTranslateX, y: orbTranslateY }}
        className="pointer-events-none absolute -top-24 right-[-10%] h-[280px] w-[280px] md:h-[420px] md:w-[420px] rounded-full bg-accent/25 blur-[100px]"
      />
      <motion.div
        style={{ x: orbTranslateXInvA, y: orbTranslateYInvA }}
        className="pointer-events-none absolute top-1/3 left-[-12%] h-[240px] w-[240px] md:h-[360px] md:w-[360px] rounded-full bg-glow-violet/20 blur-[100px]"
      />
      <motion.div
        style={{ x: orbTranslateXSmall }}
        className="pointer-events-none absolute bottom-0 right-1/4 h-[200px] w-[200px] md:h-[300px] md:w-[300px] rounded-full bg-glow-cyan/15 blur-[100px] hidden md:block"
      />

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="text-center lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 font-mono text-[11px] md:text-xs text-accent tracking-wider mb-5 border border-accent/25 bg-accent/5 rounded-full px-3 py-1"
          >
            [KASYAF_CLOUD_v1.0]
            <span className="flex items-center gap-1 text-zinc-400">
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="h-1.5 w-1.5 rounded-full bg-accent"
              />
              LIVE
            </span>
          </motion.span>

          {/* REDESIGN 2030: kinetic headline — y + rotateX + blur per word */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] font-display font-bold tracking-tighter text-balance text-white [perspective:800px]">
            {HEADLINE.map((word, i) => (
              <span key={i} className="inline-block overflow-hidden align-top mr-3 md:mr-4 [transform-style:preserve-3d]">
                <motion.span
                  initial={{ y: "100%", rotateX: 90, filter: "blur(10px)" }}
                  animate={{ y: "0%", rotateX: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className={`inline-block ${
                    word.gradient
                      ? "bg-gradient-to-r from-accent to-glow-cyan bg-clip-text text-transparent"
                      : ""
                  }`}
                >
                  {word.text}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mt-6 text-sm md:text-base text-zinc-400 max-w-md mx-auto lg:mx-0 text-balance"
          >
            Redis & Vector DB tanpa ribet setup. REST API 100% kompatibel dengan Upstash SDK —
            provisioning dalam hitungan detik, jalan di Docker lokal maupun production.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
          >
            <MagneticCta href={isLoggedIn ? "/databases" : "/register"} variant="solid">
              {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
            </MagneticCta>
            <MagneticCta href="#how-it-works" variant="outline" showArrow={false}>
              <Terminal size={14} />
              Deploy via Docker
            </MagneticCta>
          </motion.div>
        </div>

        {/* Right column: terminal visual */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative rounded-2xl">
            {/* REDESIGN 2030: animated conic border glow */}
            <div className="conic-glow" />
            <div className="relative rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-[0_0_40px_rgba(0,224,149,0.10)] overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
                <span className="ml-2 font-mono text-[11px] text-zinc-500">exec.sh</span>

                {/* REDESIGN 2030: floating copy button, morphs to checkmark */}
                <button
                  onClick={handleCopy}
                  className="ml-auto text-zinc-500 hover:text-accent transition-colors relative h-4 w-4"
                  aria-label="Copy command"
                >
                  {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="p-4 md:p-6 font-mono text-[11px] sm:text-xs md:text-sm leading-relaxed overflow-x-auto no-scrollbar min-h-[128px]">
                <pre className="whitespace-pre-wrap">
                  {CMD_LINES.reduce((acc, line, idx) => {
                    const before = CMD_LINES.slice(0, idx)
                      .map((l) => l.text)
                      .join("\n");
                    const startAt = before.length + (idx > 0 ? 1 : 0);
                    const visible = typedText.slice(startAt, startAt + line.text.length);
                    if (!visible) return acc;
                    acc.push(
                      <span key={idx} className={line.cls}>
                        {idx > 0 ? "\n" : ""}
                        {visible}
                      </span>
                    );
                    return acc;
                  }, [])}
                  {!doneTyping && (
                    <span className="inline-block w-[6px] h-[1em] align-middle bg-accent ml-0.5 animate-blinkCursor" />
                  )}
                </pre>
                {doneTyping && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 text-accent"
                  >
                    → &quot;PONG&quot;
                  </motion.p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
