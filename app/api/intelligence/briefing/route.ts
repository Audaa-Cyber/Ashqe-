import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {buildOpportunities} from "@/lib/x/opportunity-engine"
import {buildDailyBriefing} from "@/lib/intelligence/core"
export async function GET(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser()
 if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
 const {data:rows,error}=await supabase.from("ashqe_signals").select("type,title,summary,confidence,urgency,source_url,status,metadata,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(80)
 if(error)return NextResponse.json({error:error.message},{status:500})
 const signals=(rows||[]) as Array<Record<string,unknown>>
 const opp=buildOpportunities(signals.map(s=>({id:"",type:String(s.type||"insight"),title:String(s.title||""),summary:String(s.summary||""),confidence:Number(s.confidence||0),urgency:Number(s.urgency||0),sourceUrl:typeof s.source_url==="string"?s.source_url:undefined,metadata:(s.metadata||{}) as Record<string,unknown>} as any)))
 return NextResponse.json({generatedAt:new Date().toISOString(),items:buildDailyBriefing(signals,opp),opportunities:opp.slice(0,10)})
}
