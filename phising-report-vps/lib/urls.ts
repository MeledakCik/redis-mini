import fs from 'fs'
import path from 'path'
export function getUrls(): string[] {
  try {
    const p = path.join(process.cwd(), 'phishing_urls.txt')
    if (!fs.existsSync(p)) return []
    return Array.from(new Set(fs.readFileSync(p,'utf-8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).filter(l=>!l.startsWith('#'))))
  } catch { return [] }
}
export function addUrl(url: string) {
  const p = path.join(process.cwd(), 'phishing_urls.txt')
  fs.appendFileSync(p, `\n${url}`, 'utf-8')
}
