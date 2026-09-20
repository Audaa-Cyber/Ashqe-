export function scoreAiLikeness(text: string) {
  const flags: string[] = []
  const normalized = text.trim()
  if (/^(great|amazing|love this|this is huge|absolutely)/i.test(normalized)) flags.push("generic opener")
  if (/(exciting|game[- ]changer|revolutionary|incredible).*(future|space|world)/i.test(normalized)) flags.push("generic hype")
  if ((normalized.match(/!/g) || []).length >= 3) flags.push("excessive punctuation")
  if ((normalized.match(/\b(very|really|definitely|truly)\b/gi) || []).length >= 3) flags.push("intensifier stacking")
  if (/\b(in conclusion|moreover|furthermore|additionally)\b/i.test(normalized)) flags.push("template transition")
  const score = Math.min(100, flags.length * 18 + (normalized.length > 900 ? 10 : 0))
  return { score, flags, recommendation: score >= 54 ? "rewrite" : score >= 30 ? "review" : "keep" as const }
}
