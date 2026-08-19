"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TerminalSquare } from "lucide-react";

export function CliTerminal({ id, port, token: propToken, apiPath, scheme="redis", title="Redis CLI", hint="PING, SET foo bar, GET foo, KEYS *, FLUSHALL — Ctrl+L clear, ↑↓ history", connectionString="" }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const tokenRef = useRef(propToken || "");
  const [token, setToken] = useState(propToken || "");
  const pendingCmd = useRef(null);

  useEffect(()=>{ tokenRef.current = token }, [token]);

  useEffect(()=>{
    if(propToken) return;
    if(connectionString){
      const m = connectionString.match(/:([^:@]+)@/);
      if(m?.[1]) { setToken(m[1]); return; }
    }
    // fetch token dari API lu sendiri (pakai cookie login, jadi gak kena middleware)
    (async()=>{
      for(const url of [`/api/redis/${id}`, `/api/instances/${id}`, `/api/databases/${id}`]){
        try{
          const r = await fetch(url); if(!r.ok) continue;
          const d = await r.json();
          const t = d?.instance?.password || d?.instance?.token || d?.password || d?.token || "";
          if(t){ setToken(t); break; }
        }catch{}
      }
    })();
  }, [id, propToken, connectionString]);

  useEffect(()=>{
    let disposed=false, ro;
    async function boot(){
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      await import("@xterm/xterm/css/xterm.css");
      if(disposed||!containerRef.current) return;
      const term = new Terminal({
        theme:{ background:"#0a0a0a", foreground:"#e5e7eb", cursor:"#10b981", selectionBackground:"#1f2937" },
        fontFamily:"'JetBrains Mono', monospace", fontSize:13, lineHeight:1.6, cursorBlink:true, cursorStyle:"bar", convertEol:true
      });
      const fit = new FitAddon(); term.loadAddon(fit); term.open(containerRef.current); fit.fit();
      termRef.current=term;
      const prompt=()=>term.write(`\r\n\x1b[32m${id}\x1b[0m \x1b[90m>\x1b[0m `);
      term.writeln(`\x1b[32m● connected\x1b[0m \x1b[90m${scheme}://127.0.0.1:${port} • ${id}\x1b[0m`);
      term.writeln(`\x1b[90m${hint}\x1b[0m\n`);
      prompt();

      let buf = "";
      term.onData(async (d) => {
        if (d === "\r") {
          const cmd = buf.trim(); buf = ""; term.write("\r\n");
          if (!cmd) { prompt(); return; }
          if (["clear", "cls"].includes(cmd.toLowerCase())) {
            term.clear();
            term.writeln(`\x1b[32m● connected\x1b[0m \x1b[90m${scheme}://127.0.0.1:${port} • ${id}\x1b[0m`);
            prompt();
            return;
          }

          const exec = async ()=>{
            if(!tokenRef.current){
              term.writeln(`\x1b[33m[wait] token belum ready, coba lagi...\x1b[0m`);
              pendingCmd.current=cmd;
              return;
            }
            try{
              const res=await fetch(apiPath||`/api/redis/${id}/exec`,{method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${tokenRef.current}`}, body:JSON.stringify({raw:cmd})});
              const j=await res.json();
              if(!res.ok) term.writeln(`\x1b[31m(error) ${j.error}\x1b[0m`);
              else{
                const r=j.result; if(r===null) term.writeln(`\x1b[90m(nil)\x1b[0m`);
                else if(Array.isArray(r)){ if(!r.length) term.writeln(`\x1b[90m(empty)\x1b[0m`); else r.forEach((v,i)=>term.writeln(`${i+1}) ${typeof v==="string"?v:JSON.stringify(v)}`)); }
                else if(typeof r==="object") term.writeln(JSON.stringify(r,null,2));
                else term.writeln(`${r}`);
              }
            }catch(e){ term.writeln(`\x1b[31m${e.message}\x1b[0m`); }
            prompt();
          };
          await exec();
        }else if(d.charCodeAt(0)===127){ if(buf.length){ buf=buf.slice(0,-1); term.write("\b \b"); } }
        else if(d.charCodeAt(0)>=32){ buf+=d; term.write(d); }
      });

      ro=new ResizeObserver(()=>fit.fit()); ro.observe(containerRef.current);
    }
    boot();
    return()=>{ disposed=true; ro?.disconnect(); termRef.current?.dispose(); };
  },[id,port,apiPath,scheme,hint]);

  // kalau token baru ke-load dan ada pending command (kayak ping yang tadi error)
  useEffect(()=>{
    if(token && pendingCmd.current && termRef.current){
      const cmd=pendingCmd.current; pendingCmd.current=null;
      termRef.current.writeln(`\x1b[32m[ok] token ${token.slice(0,4)}…${token.slice(-4)} ready, retrying: ${cmd}\x1b[0m`);
      // trigger enter lagi
      fetch(apiPath||`/api/redis/${id}/exec`,{method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`}, body:JSON.stringify({raw:cmd})})
       .then(r=>r.json()).then(j=>{
          if(j.result!==undefined) termRef.current.writeln(`${j.result}`);
          termRef.current.write(`\r\n\x1b[32m${id}\x1b[0m \x1b[90m>\x1b[0m `);
        });
    }
  },[token, id, apiPath]);

  return (
    <Card className="bg-[#0a0a0a] border-zinc-800 rounded-xl overflow-hidden">
      <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between flex-wrap gap-2 border-b border-zinc-800">
        <CardTitle className="flex items-center gap-2 text-xs sm:text-sm"><span className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><TerminalSquare size={12} className="text-emerald-400"/></span><span className="truncate">{title}</span><span className="text-zinc-500 font-mono text-xs ml-1 shrink-0">{port}</span></CardTitle>
        <div className="flex items-center gap-2 shrink-0"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/><span className="text-xs text-zinc-400 hidden sm:inline">Cluster Connected</span></div>
      </CardHeader>
      {/* RESPONSIVE FIX: terminal lebih pendek di HP, xterm fit addon otomatis nyesuain */}
      <CardContent className="p-0"><div ref={containerRef} className="h-72 md:h-[420px] w-full px-2 sm:px-3 py-2 bg-[#0a0a0a] text-xs md:text-sm"/></CardContent>
    </Card>
  );
}