"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Boxes, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DIMENSIONS = [384, 768, 1536];
const METRICS = [
  { value: "cosine", label: "Cosine" },
  { value: "dot", label: "Dot Product" },
  { value: "euclidean", label: "Euclidean" },
];

export function CreateVectorDatabaseDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [dimension, setDimension] = useState(1536);
  const [metric, setMetric] = useState("cosine");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/vector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, dimension, metric }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Billing dicabut total (FREE mode) — dulu redirect ke /billing, sekarang cukup
        // tampilin pesan limit-nya inline. TODO: re-add custom QRIS gateway later.
        throw new Error(data.error === "LIMIT_REACHED" ? data.message : data.error || "Gagal membuat vector database");
      }
      onCreated(data.instance);
      onClose();
      setName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card2 border border-border rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Boxes size={16} className="text-accent" />
                Create Vector Database
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4 text-sm">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="n37ia3nx (kosongkan untuk auto-generate)"
                  className="mono text-xs w-full"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Dimension</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIMENSIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDimension(d)}
                      className={`h-9 rounded-lg text-xs font-medium mono border transition-colors ${
                        dimension === d
                          ? "bg-accent/10 border-accent/40 text-accent"
                          : "bg-card border-border text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Metric</label>
                <div className="grid grid-cols-3 gap-2">
                  {METRICS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMetric(m.value)}
                      className={`h-9 rounded-lg text-xs font-medium border transition-colors ${
                        metric === m.value
                          ? "bg-accent/10 border-accent/40 text-accent"
                          : "bg-card border-border text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg px-3 py-2.5 text-xs">
                <p className="text-zinc-600">Region</p>
                <p className="text-zinc-300 mt-0.5">ID-JKT-1</p>
              </div>

              {error && <p className="text-red-400 text-xs bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</p>}
            </div>

            {/* RESPONSIVE FIX: button full-width & stacked di mobile */}
            <div className="px-5 py-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
