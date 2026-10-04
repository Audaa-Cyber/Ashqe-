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

export async function validateVoice(supabase: SupabaseClient, input:{
  userId:string;text:string;evidence?:Array<{claim:string;source?:string}>
}) {
  const text=input.text.trim()
  if(!text || text.length>280) return persist(supabase,input.userId,text,{score:100,factualityScore:0,riskScore:1,status:"block",flags:["empty_or_over_280_chars"]})
  const prompt=[
    "Evaluate this proposed X post/reply for authenticity and factual safety.",
    "Do not claim AI detection certainty. Flag generic/template language, unsupported factual claims, impersonation, manipulation, unsafe claims, and excessive engagement bait.",
    "Return JSON: score (0-100 generic/AI-like likelihood), factualityScore (0-1), riskScore (0-1), status (pass/review/block), flags (string[]), rewrite (optional <=280 chars).",
    "Text:",text,"Evidence:",JSON.stringify(input.evidence??[]).slice(0,12000)
  ].join("\n")
  try {
    const {text:raw}=await generateText({model:getChatModel(),prompt,temperature:.1})
    const parsed=JSON.parse(raw) as Partial<VoiceValidation>
    const score=Math.max(0,Math.min(100,Number(parsed.score)||0))
    const factualityScore=Math.max(0,Math.min(1,Number(parsed.factualityScore)||0))
    const riskScore=Math.max(0,Math.min(1,Number(parsed.riskScore)||0))
    const status=riskScore>=.8?"block":parsed.status==="block"?"block":(riskScore>=.4||score>=70||factualityScore<.6)?"review":"pass"
    return persist(supabase,input.userId,text,{score,factualityScore,riskScore,status,flags:Array.isArray(parsed.flags)?parsed.flags.map(String):[],rewrite:typeof parsed.rewrite==="string"?parsed.rewrite.slice(0,280):undefined})
  } catch {
    return persist(supabase,input.userId,text,{score:0,factualityScore:0,riskScore:1,status:"review",flags:["voice_validator_unavailable"]})
  }
}

async function persist(supabase:SupabaseClient,userId:string,text:string,result:VoiceValidation){
  const {data,error}=await supabase.from("ashqe_voice_validations").insert({
    user_id:userId,text,score:result.score,factuality_score:result.factualityScore,risk_score:result.riskScore,
    status:result.status,flags:result.flags
  }).select("id").single()
  if(error||!data) throw new Error("voice_validation_persist_failed")
  return {...result,id:data.id as string}
}
