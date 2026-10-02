export type RadarMemory = { title: string; content: string; kind: string; importance?: number | null }
export type RadarQuery = { query: string; source: string; priority: number }
function clean(value: string) { return value.replace(/[\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) }
export function buildRadarQueries(memories: RadarMemory[], max = 8): RadarQuery[] {
  const candidates = memories.filter((m) => ["goal","interest","project","person","rule","fact"].includes(m.kind))
    .map((m) => ({ query: clean(m.content), source: m.title || m.kind, priority: Math.min(5, Math.max(1, Number(m.importance ?? 3))) }))
    .filter((x) => x.query.length >= 2)
  const seen = new Set<string>()
  return candidates.sort((a,b) => b.priority-a.priority).filter((x) => { const k=x.query.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true }).slice(0,max)
}
