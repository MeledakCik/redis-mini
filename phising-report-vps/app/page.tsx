"use client"
import { useState } from "react"

type Log = {
  id: string
  time: string
  url: string
  provider: "cloudflare" | "google"
  status: "success" | "failed" | "pending"
  message: string
  stepInfo?: string
  formData?: any
  detail?: any
}

export default function Page() {
  const [urls, setUrls] = useState("")
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(false)

  const urlList = urls.split("\n").map(s => s.trim()).filter(Boolean)

  const report = async (provider: "cloudflare" | "google") => {
    if (!urlList.length || loading) return
    setLoading(true)

    for (const url of urlList) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      const log: Log = {
        id,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        url,
        provider,
        status: "pending",
        message: "Memulai bot pengirim...",
        stepInfo: "Menyiapkan koneksi..."
      }

      setLogs(prev => [log, ...prev])

      try {
        const response = await fetch(`/api/report/${provider}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [url] })
        })

        if (!response.body) throw new Error("No response body")
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.replace("data: ", ""))
                
                if (data.type === 'step') {
                  setLogs(prev => prev.map(l => l.id === id ? {
                    ...l,
                    stepInfo: data.step,
                    formData: data.formData || l.formData
                  } : l))
                } else if (data.type === 'done') {
                  setLogs(prev => prev.map(l => l.id === id ? {
                    ...l,
                    status: data.ok ? "success" : "failed",
                    message: data.ok ? `Berhasil submit ke ${provider}` : `Gagal: ${data.proof}`,
                    stepInfo: data.proof,
                    formData: data.formData,
                    detail: data
                  } : l))
                } else if (data.type === 'error') {
                  setLogs(prev => prev.map(l => l.id === id ? {
                    ...l,
                    status: "failed",
                    message: `Error: ${data.message}`,
                    stepInfo: "Proses terhenti karena error"
                  } : l))
                }
              } catch (err) {}
            }
          }
        }
      } catch (e: any) {
        setLogs(prev => prev.map(l => l.id === id ? {
          ...l,
          status: "failed",
          message: `Network Error: ${e.message}`,
          stepInfo: "Koneksi terputus"
        } : l))
      }
    }

    setLoading(false)
  }

  const successCount = logs.filter(l => l.status === "success").length
  const failedCount = logs.filter(l => l.status === "failed").length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h1 className="text-2xl font-bold tracking-tight text-white">Phishing Auto-Reporter</h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">Multi-provider automated threat mitigation tool</p>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <div className="bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 px-3 py-1.5 rounded-lg">
                <span className="font-bold text-sm">{successCount}</span> Sukses
              </div>
              <div className="bg-rose-950/50 border border-rose-800/60 text-rose-400 px-3 py-1.5 rounded-lg">
                <span className="font-bold text-sm">{failedCount}</span> Gagal
              </div>
            </div>
          </div>
        </div>

        {/* Input & Control Panel */}
        <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400">
            <span>Daftar Target URL (1 per baris):</span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">{urlList.length} URL</span>
          </div>

          <textarea
            value={urls}
            onChange={e => setUrls(e.target.value)}
            placeholder="https://phishing-domain.com/login&#10;https://fake-site.pages.dev/"
            className="w-full h-36 bg-slate-950 border border-slate-800 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 rounded-xl p-4 font-mono text-sm text-slate-200 outline-none transition placeholder:text-slate-600 resize-y"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              disabled={loading || urlList.length === 0}
              onClick={() => report("cloudflare")}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl shadow-lg transition active:scale-[0.99]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
              Report Cloudflare
            </button>

            <button
              disabled={loading || urlList.length === 0}
              onClick={() => report("google")}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl shadow-lg transition active:scale-[0.99]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/></svg>
              Report Google
            </button>
          </div>
        </div>

        {/* Activity Log */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider font-mono">Activity Log</h2>

          {logs.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-600 text-xs font-mono">
              Belum ada aktivitas. Masukkan URL dan klik tombol report.
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`border rounded-xl p-4 transition shadow-sm ${
                  log.status === "success"
                    ? "bg-slate-900/60 border-emerald-900/50"
                    : log.status === "failed"
                    ? "bg-slate-900/60 border-rose-900/50"
                    : "bg-slate-900/30 border-amber-800/60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-mono text-sm text-slate-200 font-medium truncate">{log.url}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>{log.time}</span>
                      <span>•</span>
                      <span className="uppercase font-semibold text-slate-300">{log.provider}</span>
                      <span>•</span>
                      <span className={log.status === "success" ? "text-emerald-400" : log.status === "failed" ? "text-rose-400" : "text-amber-400 font-bold animate-pulse"}>
                        {log.message}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    log.status === "success"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : log.status === "failed"
                      ? "bg-rose-950 text-rose-400 border border-rose-800"
                      : "bg-amber-950 text-amber-400 border border-amber-800 animate-pulse"
                  }`}>
                    {log.status}
                  </span>
                </div>

                {/* Step Info / Realtime Progress */}
                {log.stepInfo && (
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono flex items-center gap-2">
                    <span className="text-amber-500 font-bold">⚡ Real-time Step:</span>
                    <span className="text-slate-200">{log.stepInfo}</span>
                  </div>
                )}

                {/* Live Form Data display */}
                {log.formData && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs font-mono grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-400">
                    <div><span className="text-slate-500">Pelapor:</span> <span className="text-slate-200">{log.formData.name}</span></div>
                    <div><span className="text-slate-500">Email:</span> <span className="text-slate-200">{log.formData.email}</span></div>
                    <div><span className="text-slate-500">Instansi:</span> <span className="text-slate-200">{log.formData.company}</span></div>
                    <div><span className="text-slate-500">Jabatan:</span> <span className="text-slate-200">{log.formData.title}</span></div>
                  </div>
                )}

                {/* JSON Detail Collapse */}
                {log.detail && (
                  <details className="mt-3 group">
                    <summary className="text-[11px] font-mono text-slate-500 hover:text-slate-400 cursor-pointer transition select-none flex items-center gap-1">
                      <span>▸ Lihat Response JSON</span>
                    </summary>
                    <pre className="mt-2 text-[11px] font-mono bg-slate-950 border border-slate-800/80 p-3 rounded-lg overflow-x-auto text-slate-300 whitespace-pre-wrap break-all">
                      {JSON.stringify(log.detail, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
