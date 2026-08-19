"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

export function CopyField({ label, value, mono = true, icon: Icon }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const canMask =
    label.toLowerCase().includes("password") ||
    label.toLowerCase().includes("token") ||
    label.toLowerCase().includes("redis url") ||
    label.toLowerCase().includes("connection") ||
    label.toLowerCase().includes("cli");

  // Redis URL: mask cuma password-nya (redis://user:***@host). Password/Token murni: mask semuanya.
  const isFullUrl = /^rediss?:\/\//.test(value);
  let shown = value;
  if (canMask && !revealed) {
    shown = isFullUrl
      ? value.replace(/(:\/\/[^:]+:)([^@]+)(@)/, (m, a, pass, c) => `${a}${"•".repeat(Math.min(pass.length, 16))}${c}`)
      : "•".repeat(Math.min(value.length, 20));
  }

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </p>
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2.5">
        <code className={`text-xs flex-1 truncate text-zinc-300 ${mono ? "mono" : ""}`}>{shown}</code>
        {canMask && (
          <button onClick={() => setRevealed((r) => !r)} className="text-zinc-500 hover:text-zinc-200 shrink-0">
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        <button onClick={copy} className="text-zinc-500 hover:text-accent shrink-0 relative h-3.5 w-3.5">
          {/* ANIMASI KASYAF: copy button jadi checkmark dengan pop animasi */}
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 flex items-center justify-center text-accent"
              >
                <Check size={14} />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Copy size={14} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
