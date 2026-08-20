"use client";
// REDESIGN 2030: Ecosystem & Roadmap — 4 products, LIVE / COMING SOON / ROADMAP badges,
// 3D tilt on hover with a glare that follows the cursor.
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Database, Boxes, Send, Package } from "lucide-react";
import { SectionTitle } from "@/components/marketing/section-title";

const PRODUCTS = [
  {
    title: "Kasyaf Redis",
    desc: "Serverless Redis 7, provisioning instan, REST API kompatibel Upstash SDK.",
    icon: Database,
    status: "live",
    span: "md:col-span-8",
  },
  {
    title: "Kasyaf Vector",
    desc: "Vector database berbasis Qdrant — siap pakai untuk semantic search & RAG.",
    icon: Boxes,
    status: "live",
    span: "md:col-span-4",
  },
  {
    title: "Kasyaf QStash",
    desc: "Message queue & scheduler serverless, HTTP-based delivery dengan retry otomatis.",
    icon: Send,
    status: "soon",
    span: "md:col-span-4",
  },
  {
    title: "Kasyaf Box",
    desc: "Object storage S3-compatible untuk file & asset — di roadmap kuartal berikutnya.",
    icon: Package,
    status: "roadmap",
    span: "md:col-span-8",
  },
];

const STATUS_META = {
  live: { label: "LIVE", dot: "●", cls: "bg-accent/10 text-accent border-accent/30" },
  soon: { label: "COMING SOON", dot: "◐", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  roadmap: { label: "ROADMAP", dot: "◌", cls: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
};

function ProductCard({ product }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, glareX: 50, glareY: 50, active: false });
  const Icon = product.icon;
  const status = STATUS_META[product.status];
  const isLive = product.status === "live";

  function handleMouseMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 10,
      ry: (px - 0.5) * 10,
      glareX: px * 100,
      glareY: py * 100,
      active: true,
    });
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0, glareX: 50, glareY: 50, active: false });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.9, rotateX: 15, filter: "blur(12px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`col-span-1 ${product.span} [perspective:1000px]`}
    >
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
        className={`relative overflow-hidden rounded-2xl md:rounded-3xl bg-white/[0.03] backdrop-blur-xl border p-6 md:p-8 transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 ${
          isLive ? "border-white/[0.08] hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5" : "border-white/[0.08] hover:border-white/20"
        }`}
      >
        {tilt.active && (
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background: `radial-gradient(300px circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.08), transparent 70%)`,
            }}
          />
        )}
        <div className="relative flex items-center justify-between mb-4">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Icon size={18} className="text-accent" />
          </div>
          <span
            className={`font-mono text-[10px] tracking-wide border rounded-full px-2.5 py-1 flex items-center gap-1 ${status.cls}`}
          >
            {status.dot} {status.label}
          </span>
        </div>
        <h3 className="relative font-display font-semibold text-base md:text-lg text-white">{product.title}</h3>
        <p className="relative mt-2 text-sm text-zinc-400">{product.desc}</p>
      </div>
    </motion.div>
  );
}

export function BentoFeatures() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-5 md:px-8 lg:px-12 py-20 md:py-28">
      <div className="mb-12 md:mb-16">
        <SectionTitle eyebrow="ECOSYSTEM & ROADMAP" title="Satu platform, semua data primitives." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6">
        {PRODUCTS.map((p) => (
          <ProductCard key={p.title} product={p} />
        ))}
      </div>
    </section>
  );
}
