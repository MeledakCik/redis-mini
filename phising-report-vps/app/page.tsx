"use client"
import { useState, useEffect } from 'react'
export default function Page(){
  const [input,setInput]=useState('')
  const [proxies,setProxies]=useState<string[]>([])
  const [log,setLog]=useState('')
  const [loading,setLoading]=useState('')
  useEffect(()=>{fetch('/api/urls').then(r=>r.json()).then(d=>setProxies(d.proxies||[]))},[])
  const parsed=input.split(/\n|,|\s/).map(s=>s.trim()).filter(Boolean).filter(s=>s.startsWith('http'))
  async function report(p:string){
    if(!parsed.length){setLog('Isi URL dulu');return}
    setLoading(p); setLog(`Reporting ${parsed.length} to ${p}...`)
    const r=await fetch(`/api/report/${p}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({urls:parsed})})
    const j=await r.json(); setLog(JSON.stringify(j,null,2)); setLoading('')
  }
  return(<main className="max-w-4xl mx-auto p-8 space-y-6">
    <h1 className="text-3xl font-black">Phishing Reporter - CLEAN</h1>
    <p className="text-zinc-500 text-sm">{proxies.length} proxies • No file • No duplikat</p>
    <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="https://scam.com" className="w-full h-64 p-4 rounded-xl bg-black border border-zinc-800 font-mono text-sm"/>
    <p className="text-xs text-zinc-500">{parsed.length} URL</p>
    <div className="grid grid-cols-2 gap-3">
      <button onClick={()=>report('cloudflare')} disabled={!!loading} className="p-3 rounded-xl bg-orange-500 text-black font-bold">{loading==='cloudflare'?'...':'Report Cloudflare'}</button>
      <button onClick={()=>report('google')} disabled={!!loading} className="p-3 rounded-xl bg-blue-600 text-white font-bold">{loading==='google'?'...':'Report Google'}</button>
    </div>
    <pre className="bg-zinc-900 p-4 rounded-xl text-xs whitespace-pre-wrap">{log}</pre>
  </main>)
}
