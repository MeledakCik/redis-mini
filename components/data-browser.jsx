"use client";
import { useEffect, useState } from "react";
import { Search, Trash2, RefreshCw, Plus, Eraser, Key as KeyIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

async function execCmd(id, raw, token) {
  const res = await fetch(`/api/redis/${id}/exec`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ raw }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Command gagal");
  return data.result;
}

export function DataBrowser({ id, token: propToken }) {
  const [pattern, setPattern] = useState("*");
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedValue, setSelectedValue] = useState(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [token, setToken] = useState(propToken || "");

  // auto-ambil token dari detail instance kalau prop gak dikirim
  useEffect(() => {
    if (propToken) {
      setToken(propToken);
      return;
    }
    // fetch instance buat dapet token/password
    fetch(`/api/instances/${id}`)
      .then(r => r.json())
      .then(d => {
        const t = d?.instance?.token || d?.instance?.password || d?.token || d?.password || "";
        if (t) setToken(t);
      })
      .catch(()=>{});
  }, [id, propToken]);

  async function loadKeys() {
    if (!token) {
      setError("Token belum ke-load, tunggu 1 detik lalu klik Scan lagi...");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/redis/${id}/keys?pattern=${encodeURIComponent(pattern)}&limit=200`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeys(data.keys || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function viewKey(key, type) {
    if (!token) return;
    setSelectedKey(key);
    setSelectedValue("Loading...");
    try {
      let raw = `GET "${key}"`;
      if (type === "hash") raw = `HGETALL "${key}"`;
      else if (type === "list") raw = `LRANGE "${key}" 0 -1`;
      else if (type === "set") raw = `SMEMBERS "${key}"`;
      else if (type === "zset") raw = `ZRANGE "${key}" 0 -1 WITHSCORES`;

      const result = await execCmd(id, raw, token);
      setSelectedValue(JSON.stringify(result, null, 2));
    } catch (err) {
      setSelectedValue(`Error: ${err.message}`);
    }
  }

  async function handleSet() {
    if (!newKey || !token) return;
    try {
      await execCmd(id, `SET "${newKey}" "${newValue}"`, token);
      setNewKey("");
      setNewValue("");
      loadKeys();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(key) {
    if (!token) return;
    try {
      await execCmd(id, `DEL "${key}"`, token);
      if (selectedKey === key) setSelectedKey(null);
      loadKeys();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFlush() {
    if (!confirm("Yakin FLUSHDB? Semua key akan terhapus permanen.")) return;
    try {
      await execCmd(id, "FLUSHDB", token);
      setSelectedKey(null);
      loadKeys();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon size={14} className="text-accent" /> Keys ({keys.length})
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={loadKeys} title="Refresh">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </Button>
            <Button size="icon" variant="danger" onClick={handleFlush} title="FLUSHDB">
              <Eraser size={13} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
              <Input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadKeys()}
                placeholder="KEYS pattern e.g. user:*"
                className="pl-8 mono text-xs"
              />
            </div>
            <Button size="sm" variant="subtle" onClick={loadKeys}>Scan</Button>
          </div>

          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

          <div className="max-h-96 overflow-y-auto space-y-1">
            {keys.map((k) => (
              <div
                key={k.key}
                onClick={() => viewKey(k.key, k.type)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs group ${
                  selectedKey === k.key ? "bg-accent/10 border border-accent/30" : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="zinc" className="shrink-0">{k.type}</Badge>
                  <span className="mono text-zinc-300 truncate">{k.key}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(k.key); }}
                  className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {!loading && keys.length === 0 && <p className="text-xs text-zinc-600 text-center py-6">Tidak ada key ditemukan.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus size={14} className="text-accent" /> Add / Set Key
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="key" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="mono text-xs" />
            <Input placeholder="value" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="mono text-xs" />
            <Button size="sm" onClick={handleSet}>SET</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Value Preview</CardTitle>
            {selectedKey && <Badge variant="green">{selectedKey}</Badge>}
          </CardHeader>
          <CardContent>
            <pre className="mono text-xs text-zinc-300 bg-card border border-border rounded-lg p-3 min-h-32 max-h-72 overflow-auto whitespace-pre-wrap">
              {selectedValue || "Klik salah satu key di sebelah kiri untuk lihat value-nya."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}