import type { SupabaseClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { getChatModel } from "@/lib/openrouter"

export type VoiceValidation = {
  score:number
  factualityScore:number
  riskScore:number
  status:"pass"|"review"|"block"
  flags:string[]
  rewrite?:string
}

const HARD_BLOCK_PATTERNS = [
  /\\b(?:steal|hack|doxx|phish|impersonat(?:e|ion))\\b/i,
  /\\b(?:send|share)\\s+(?:your|my)\\s+(?:password|seed phrase|private key|otp)\\b/i,
]

function deterministicFlags(text: string) {
  const flags: string[] = []
  if (/\\p{Cc}/u.test(text)) flags.push("control_character")
  if (/\\u200b|\\u200c|\\u200d|\\ufeff/.test(text)) flags.push("hidden_unicode")
  if (/(.)\\1{14,}/u.test(text)) flags.push("repeated_character_spam")
  if ((text.match(/https?:\\/\\//gi) ?? []).length > 3) flags.push("excessive_urls")
  if (HARD_BLOCK_PATTERNS.some(pattern => pattern.test(text))) flags.push("unsafe_or_credential_request")
  return flags
}

function parseModelJson(raw: string): Partial<VoiceValidation> {
  const cleaned = raw.trim().replace(/^\\u0060\\u0060\\u0060(?:json)?/i, "").replace(/\\u0060\\u0060\\u0060$/i, "").trim()
  try { return JSON.parse(cleaned) as Partial<VoiceValidation> } catch {
    const match = cleaned.match(/\\{[\\s\\S]*\\}/)
    return match ? JSON.parse(match[0]) as Partial<VoiceValidation> : {}
  }
}

export async function validateVoice(supabase: SupabaseClient, input:{
  userId:string;text:string;evidence?:Array<{claim:string;source?:string}>
}) {
  const text=input.text.trim()
  const flags=deterministicFlags(text)

  if(!text || text.length>280) {
    return persist(supabase,input.userId,text,{
      score:100,factualityScore:0,riskScore:1,status:"block",
      flags:[...flags,"empty_or_over_280_chars"],
    },input.evidence)
  }
  if(flags.includes("unsafe_or_credential_request")) {
    return persist(supabase,input.userId,text,{
      score:0,factualityScore:0,riskScore:1,status:"block",flags,
    },input.evidence)
  }
  if(flags.length) {
    return persist(supabase,input.userId,text,{
      score:0,factualityScore:0,riskScore:.8,status:"review",flags,
    },input.evidence)
  }

  const prompt=[
    "Evaluate this proposed X post/reply for authenticity and factual safety.",
    "AI-like score is only a heuristic for generic/template language; never claim reliable authorship detection.",
    "Flag unsupported factual claims, impersonation, manipulation, unsafe claims, and excessive engagement bait.",
    "If evidence is supplied, only mark a claim supported when the supplied evidence actually supports it. Otherwise use review.",
    "Return JSON only: score (0-100), factualityScore (0-1), riskScore (0-1), status (pass/review/block), flags (string[]), rewrite (optional <=280 chars).",
    "Text:",text,"Evidence:",JSON.stringify(input.evidence??[]).slice(0,12000)
  ].join("\n")

  try {
    const {text:raw}=await generateText({model:getChatModel(),prompt,temperature:.1})
    const parsed=parseModelJson(raw)
    const score=Math.max(0,Math.min(100,Number(parsed.score)||0))
    const factualityScore=Math.max(0,Math.min(1,Number(parsed.factualityScore)||0))
    const riskScore=Math.max(0,Math.min(1,Number(parsed.riskScore)||0))
    const modelFlags=Array.isArray(parsed.flags)?parsed.flags.map(String).slice(0,20):[]
    const status=riskScore>=.8?"block":parsed.status==="block"?"block":(riskScore>=.4||score>=70||factualityScore<.6)?"review":"pass"
    return persist(supabase,input.userId,text,{
      score,factualityScore,riskScore,status,
      flags:[...new Set([...flags,...modelFlags])],
      rewrite:typeof parsed.rewrite==="string"?parsed.rewrite.slice(0,280):undefined,
    },input.evidence)
  } catch {
    return persist(supabase,input.userId,text,{
      score:0,factualityScore:0,riskScore:1,status:"review",flags:["voice_validator_unavailable"],
    },input.evidence)
  }
}

async function persist(
  supabase:SupabaseClient,
  userId:string,
  text:string,
  result:VoiceValidation,
  evidence?:Array<{claim:string;source?:string}>,
){
  const {data,error}=await supabase.from("ashqe_voice_validations").insert({
    user_id:userId,text,score:result.score,factuality_score:result.factualityScore,risk_score:result.riskScore,
    status:result.status,flags:result.flags,
    evidence_ids:(evidence??[]).map(item=>item.source).filter((source):source is string=>Boolean(source)),
  }).select("id").single()
  if(error||!data) throw new Error("voice_validation_persist_failed")
  return {...result,id:data.id as string}
}
