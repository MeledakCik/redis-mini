"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [name, setName] = useState("");
  const [dimension, setDimension] = useState(1536);
  const [metric, setMetric] = useState("cosine");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

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
        // Task 3: 403 LIMIT_REACHED -> arahkan ke /billing alih-alih cuma nampilin error text
        if (res.status === 403 && data.error === "LIMIT_REACHED") {
          onClose();
          router.push(data.upgradeUrl || "/billing");
          return;
        }
        throw new Error(data.error || "Gagal membuat vector database");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card2 border border-border rounded-xl w-full max-w-md shadow-2xl fade-in">
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
              className="mono text-xs"
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
            <p className="text-zinc-300 mt-0.5">Local Docker</p>
          </div>

          {error && <p className="text-red-400 text-xs bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
