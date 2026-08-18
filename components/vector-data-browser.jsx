"use client";
import { useEffect, useState, useMemo } from "react";
import { Search, Trash2, RefreshCw, Plus, Eraser, Boxes, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// --- HELPER TOKEN ---
function getStoredToken(id) {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(`vector_token_${id}`) ||
    localStorage.getItem(`token_${id}`) ||
    localStorage.getItem("vector_token") ||
    null
  );
}

function saveToken(id, token) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`vector_token_${id}`, token);
}

async function execCmd(id, raw) {
  const token = getStoredToken(id);
  const res = await fetch(`/api/vector/${id}/exec`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
     ...(token? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ raw }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Command gagal");
  return data.result;
}

// --- PATCH ANTI LAG ---
function formatVectorPreview(arr, limit = 10) {
  if (!Array.isArray(arr)) return String(arr);
  if (arr.length <= limit) return `[${arr.join(", ")}]`;
  return `[${arr.slice(0, limit).join(", ")},... +${arr.length - limit} dims]`;
}
function formatVectorFull(arr) {
  return `[${arr.join(",")}]`;
}

export function VectorDataBrowser({ id, dimension = 1536, token: propToken }) {
  const [pattern, setPattern] = useState("*");
  const [vectors, setVectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [showFull, setShowFull] = useState(false);
  const [tokenReady, setTokenReady] = useState(!!(propToken || getStoredToken(id)));

  const [newId, setNewId] = useState("");
  const [newVector, setNewVector] = useState("");
  const [newMetadata, setNewMetadata] = useState("{}");

  // Auto-load token: prioritas prop (dikirim dari VectorConsole yang udah punya `instance`),
  // fallback ke localStorage, fallback terakhir fetch /api/vector/[id] (butuh session login).
  useEffect(() => {
    async function ensureToken() {
      if (propToken) {
        saveToken(id, propToken);
        setTokenReady(true);
        return;
      }
      let token = getStoredToken(id);
      if (token) {
        setTokenReady(true);
        return;
      }
      try {
        const res = await fetch(`/api/vector/${id}`);
        const data = await res.json();
        const t = data.token || data.restToken || data.instance?.token;
        if (t) {
          saveToken(id, t);
          setTokenReady(true);
        }
      } catch {}
    }
    ensureToken();
  }, [id, propToken]);

  async function loadVectors() {
    if (!tokenReady) {
      setError("Token belum ready. Buka tab Details dulu atau paste token manual.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // pakai RANGE biar sesuai sama backend lu
      const result = await execCmd(id, `RANGE ${pattern} 200`);
      const list = result.vectors || result || [];
      setVectors(list.map((p) => ({
        id: p.id,
        dimension: p.vector?.length || dimension,
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenReady) loadVectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tokenReady]);

  async function viewVector(vectorId) {
    setSelectedId(vectorId);
    setSelectedData({ status: "loading" });
    setShowFull(false);
    try {
      const result = await execCmd(id, `FETCH "${vectorId}"`);
      setSelectedData(result);
    } catch (err) {
      setSelectedData({ error: `Error: ${err.message}` });
    }
  }

  const previewText = useMemo(() => {
    if (!selectedData) return null;
    if (selectedData.status === "loading") return "Loading...";
    if (selectedData.error) return selectedData.error;

    const vec = Array.isArray(selectedData)? selectedData : selectedData.vector || selectedData.values;
    const meta = selectedData.metadata || selectedData.meta || selectedData.payload || null;

    if (!vec) return JSON.stringify(selectedData, null, 2);

    const vectorForDisplay = showFull? vec : formatVectorPreview(vec, 10);

    return JSON.stringify(
      {
        id: selectedId,
        dimension: vec.length,
        vector: vectorForDisplay,
        metadata: meta,
      },
      null,
      2
    );
  }, [selectedData, selectedId, showFull]);

  async function handleUpsert() {
    if (!newId ||!newVector) {
      setError("Isi id dan vector dulu.");
      return;
    }
    let vectorArr;
    try {
      vectorArr = JSON.parse(newVector);
      if (!Array.isArray(vectorArr)) throw new Error();
      if (vectorArr.length!== dimension) {
        setError(`Dimensi salah: dapat ${vectorArr.length}, harus ${dimension}`);
        return;
      }
    } catch {
      setError("Vector harus format array angka [0.1, 0.2,...]");
      return;
    }
    let metadataObj;
    try {
      metadataObj = newMetadata.trim()? JSON.parse(newMetadata) : {};
    } catch {
      setError("Metadata harus JSON object valid");
      return;
    }
    try {
      setError("");
      await execCmd(id, `UPSERT "${newId}" ${formatVectorFull(vectorArr)} ${JSON.stringify(metadataObj)}`);
      setNewId("");
      setNewVector("");
      setNewMetadata("{}");
      loadVectors();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(vectorId) {
    try {
      await execCmd(id, `DELETE "${vectorId}"`);
      if (selectedId === vectorId) {
        setSelectedId(null);
        setSelectedData(null);
      }
      loadVectors();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteAll() {
    if (!confirm("Yakin hapus SEMUA vector?")) return;
    try {
      await execCmd(id, "DELETE ALL");
      setSelectedId(null);
      setSelectedData(null);
      loadVectors();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes size={14} className="text-accent" /> Vectors ({vectors.length})
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={loadVectors}><RefreshCw size={13} className={loading? "animate-spin" : ""} /></Button>
            <Button size="icon" variant="danger" onClick={handleDeleteAll}><Eraser size={13} /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
              <Input value={pattern} onChange={(e) => setPattern(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadVectors()} placeholder="Search id e.g. doc*" className="pl-8 mono text-xs" />
            </div>
            <Button size="sm" variant="subtle" onClick={loadVectors}>Scan</Button>
          </div>
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          {!tokenReady && <p className="text-xs text-yellow-400 mb-2">Token belum ke-load. Buka tab Details dulu.</p>}
          <div className="max-h-96 overflow-y-auto space-y-1">
            {vectors.map((v) => (
              <div key={v.id} onClick={() => viewVector(v.id)} className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs group ${selectedId === v.id? "bg-accent/10 border border-accent/30" : "hover:bg-white/5 border border-transparent"}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="zinc" className="shrink-0">{v.dimension || dimension}d</Badge>
                  <span className="mono text-zinc-300 truncate">{v.id}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus size={14} className="text-accent" /> Add / Upsert Vector</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="id" value={newId} onChange={(e) => setNewId(e.target.value)} className="mono text-xs" />
              <Input placeholder={`vector [${dimension} dims]`} value={newVector} onChange={(e) => setNewVector(e.target.value)} className="mono text-xs sm:col-span-2" />
            </div>
            <Input placeholder='metadata JSON' value={newMetadata} onChange={(e) => setNewMetadata(e.target.value)} className="mono text-xs" />
            <div className="flex justify-end"><Button size="sm" onClick={handleUpsert} className="bg-accent text-black">SET</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Value Preview</CardTitle>
              <div className="flex gap-2">
                {selectedId && <Badge variant="green" className="max-w-[10rem] truncate">{selectedId}</Badge>}
                {selectedData &&!selectedData.error && <Button size="icon" variant="ghost" onClick={() => setShowFull(!showFull)}>{showFull? <EyeOff size={12}/> : <Eye size={12}/>}</Button>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="mono text-xs text-zinc-300 bg-card border border-border rounded-lg p-3 min-h-32 max-h-96 overflow-auto whitespace-pre-wrap">
              {previewText || "Klik salah satu vector di kiri."}
            </pre>
            {selectedData && !selectedData.error && <p className="text-xs text-zinc-500 mt-2">{showFull ? "FULL 1536d - bisa lag" : "Preview 10 dims biar gak lag"}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}