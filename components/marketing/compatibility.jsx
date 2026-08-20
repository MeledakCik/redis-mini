"use client";
// REDESIGN 2030: side-by-side tabbed code showcase — Upstash SDK vs Kasyaf endpoint,
// hand-tokenized syntax highlight (no external highlighter, keeps bundle light),
// REDIS_URL line highlighted, copy button per block.
import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { SectionTitle } from "@/components/marketing/section-title";

const KW = "text-glow-cyan";
const STR = "text-accent";
const PLAIN = "text-zinc-300";
const COMMENT = "text-zinc-600";

function buildLines(envVar) {
  return [
    [
      { t: "import", c: KW },
      { t: " { Redis } ", c: PLAIN },
      { t: "from", c: KW },
      { t: ` "@upstash/redis";`, c: STR },
    ],
    [{ t: "", c: PLAIN }],
    [
      { t: "const", c: KW },
      { t: " redis = ", c: PLAIN },
      { t: "new", c: KW },
      { t: " Redis({", c: PLAIN },
    ],
    { highlight: true, tokens: [{ t: `  url: process.env.${envVar},`, c: PLAIN }] },
    [{ t: "  token: process.env.KASYAF_TOKEN,", c: PLAIN }],
    [{ t: "});", c: PLAIN }],
    [{ t: "", c: PLAIN }],
    [
      { t: "await", c: KW },
      { t: ' redis.set("foo", "bar");', c: PLAIN },
    ],
    [
      { t: "const", c: KW },
      { t: " value = ", c: PLAIN },
      { t: "await", c: KW },
      { t: ' redis.get("foo");', c: PLAIN },
    ],
  ];
}

const PLAIN_TEXT = (envVar) => `import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.${envVar},
  token: process.env.KASYAF_TOKEN,
});

await redis.set("foo", "bar");
const value = await redis.get("foo");`;

const TABS = [
  { id: "upstash", label: "Upstash Code", envVar: "UPSTASH_REDIS_REST_URL", dim: true },
  { id: "kasyaf", label: "Kasyaf Endpoint", envVar: "REDIS_URL", dim: false },
];

function CodeBlock({ tab }) {
  const [copied, setCopied] = useState(false);
  const lines = buildLines(tab.envVar);

  function handleCopy() {
    navigator.clipboard?.writeText(PLAIN_TEXT(tab.envVar)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border overflow-hidden ${
        tab.dim ? "border-white/10 bg-white/[0.02]" : "border-accent/30 bg-accent/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className={`font-mono text-xs ${tab.dim ? "text-zinc-500" : "text-accent"}`}>{tab.label}</span>
        <button
          onClick={handleCopy}
          className="text-zinc-500 hover:text-accent transition-colors relative h-3.5 w-3.5"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-4 md:p-5 font-mono text-[11px] sm:text-xs leading-relaxed overflow-x-auto no-scrollbar">
        {lines.map((line, i) => {
          const isHighlight = !Array.isArray(line);
          const tokens = isHighlight ? line.tokens : line;
          return (
            <div
              key={i}
              className={isHighlight ? "bg-accent/10 border-l-2 border-accent -mx-4 md:-mx-5 px-4 md:px-5" : ""}
            >
              {tokens.map((tok, j) => (
                <span key={j} className={tok.c}>
                  {tok.t}
                </span>
              ))}
              {tokens.length === 1 && tokens[0].t === "" ? "\u00A0" : null}
            </div>
          );
        })}
      </pre>
    </motion.div>
  );
}

export function Compatibility() {
  return (
    <section id="compatibility" className="max-w-6xl mx-auto px-5 md:px-8 lg:px-12 py-20 md:py-28">
      <div className="mb-12">
        <SectionTitle eyebrow="COMPATIBILITY" title="Kode sama persis, cuma URL yang beda." />
        <span className="mt-4 mx-auto font-mono text-[11px] bg-accent/10 text-accent border border-accent/30 rounded-full px-3 py-1 text-center block w-fit">
          Just change URL
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TABS.map((tab) => (
          <CodeBlock key={tab.id} tab={tab} />
        ))}
      </div>
    </section>
  );
}
