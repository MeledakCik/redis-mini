import fs from 'fs'
import path from 'path'
export function getProxies(){try{const p=path.join(process.cwd(),'proxies.txt'); if(!fs.existsSync(p)) return []; return fs.readFileSync(p,'utf-8').split(/\n/).map(s=>s.trim()).filter(Boolean).filter(l=>!l.startsWith('#'))}catch{return []}}