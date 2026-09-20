import type {SupabaseClient} from "@supabase/supabase-js"
import {getChatModel} from "@/lib/openrouter"
import {generateText} from "ai"
type AgentContext={memory:string;signals:string;instruction:string}
function terms(q:string){return q.toLowerCase().split(/[^a-z0-9_@-]+/).filter(x=>x.length>2).slice(0,8)}
export async function buildAgentContext(supabase:SupabaseClient,userId:string,instruction:string):Promise<AgentContext>{
 const words=terms(instruction)
 const [{data:memories},{data:signals},{data:style}]=await Promise.all([
  supabase.from("ashqe_memories").select("title,content,importance,source,updated_at").eq("user_id",userId).order("importance",{ascending:false}).order("updated_at",{ascending:false}).limit(50),
  supabase.from("ashqe_signals").select("type,title,summary,confidence,source_url,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(20),
  supabase.from("style_profiles").select("tone,length_pref,rhythm,topics,signature_phrases,do_list,dont_list,summary").eq("user_id",userId).maybeSingle(),
 ])
 const relevant=(memories||[]).filter((m:any)=>words.some(w=>(m.title+" "+m.content).toLowerCase().includes(w))).slice(0,12)
 const memoryText=[style?"VOICE PROFILE: "+JSON.stringify(style):"",...(relevant.length?relevant:memories||[]).slice(0,8).map((m:any)=>"MEMORY: "+m.title+" — "+m.content+" [importance "+m.importance+"]")].filter(Boolean).join("\n")
 const signalText=(signals||[]).slice(0,8).map((s:any)=>"SIGNAL: "+s.title+" — "+s.summary+" ["+s.confidence+"%]").join("\n")
 let plan=""
 if(process.env.OPENROUTER_API_KEY){
  try{const r=await generateText({model:getChatModel(),temperature:0,prompt:"Classify this Ashqe request into a compact operating plan. Return one line with: intent, needed_context, next_move. Do not answer the user. Request: "+instruction});plan=r.text.trim()}catch{}
 }
 return {memory:memoryText||"No durable memory matched this request.",signals:signalText||"No recent signals matched this request.",instruction,}
}
