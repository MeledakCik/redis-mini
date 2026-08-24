"use client"
import { useState } from "react"

type Log = {
  time: string
  url: string
  provider: "cloudflare" | "google"
  status: "success" | "failed" | "pending"
  message: string
  detail?: any
}

export default function Page() {
  const [urls, setUrls] = useState("")
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(false)

  const report = async (provider: "cloudflare" | "google") => {
    const list = urls.split("\n").map(s=>s.trim()).filter(Boolean)
    if(!list.length) return
    setLoading(true)

    for (const url of list) {
      const log: Log = {
        time: new Date().toLocaleTimeString(),
        url,
        provider,
        status: "pending",
        message: "Mengirim..."
      }
      setLogs(prev => [log,...prev])

      try {
        const res = await fetch(`/api/report/${provider}`, {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ urls: [url] })
        })
        const data = await res.json()

        setLogs(prev => prev.map(l =>
          l.url === url && l.time === log.time? {
           ...l,
            status: data.success? "success" : "failed",
            message: data.success? `Berhasil report ke ${provider}` : `Gagal: ${data.error || 'unknown'}`,
            detail: data
          } : l
        ))
      } catch (e:any) {
        setLogs(prev => prev.map(l =>
          l.url === url && l.time === log.time? {
           ...l,
            status: "failed",
            message: `Error: ${e.message}`,
            detail: e
          } : l
        ))
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Phishing Reporter - CLEAN</h1>
      <p className="text-zinc-400 mb-4">{logs.filter(l=>l.status==="success").length} sukses • {logs.filter(l=>l.status==="failed").length} gagal</p>

      <textarea
        value={urls}
        onChange={e=>setUrls(e.target.value)}
        placeholder="https://contoh-phising.pages.dev/"
        className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-xl p-4 font-mono text-sm"
      />
      <div className="text-xs text-zinc-500 mt-1">{urls.split("\n").filter(Boolean).length} URL</div>

      <div className="flex gap-3 mt-4">
        <button disabled={loading} onClick={()=>report("cloudflare")} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 py-3 rounded-xl font-bold">
          {loading? "Mengirim..." : "Report Cloudflare"}
        </button>
        <button disabled={loading} onClick={()=>report("google")} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl font-bold">
          Report Google
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {logs.map((log,i)=>(
          <div key={i} className={`p-4 rounded-xl border ${log.status==="success"? "bg-green-950/30 border-green-800" : log.status==="failed"? "bg-red-950/30 border-red-800" : "bg-zinc-900 border-zinc-700"}`}>
            <div className="flex justify-between">
              <span className="font-mono text-sm truncate">{log.url}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${log.status==="success"? "bg-green-600" : log.status==="failed"? "bg-red-600" : "bg-zinc-600"}`}>{log.status}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">{log.time} • {log.provider} • {log.message}</div>
            {log.detail && <pre className="mt-2 text- bg-black/50 p-2 rounded-lg overflow-x-auto">{JSON.stringify(log.detail, null, 2)}</pre>}
          </div>
        ))}
      </div>
    </div>
  )
}