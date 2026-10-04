import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {getValidAccessToken,fetchRecentTweets} from "@/lib/x/api"
import {buildContentGenome,buildDailyBriefing,buildRelationshipGraph} from "@/lib/intelligence/core"
import {buildOpportunities} from "@/lib/x/opportunity-engine"
import type {XSignalCandidate} from "@/lib/x/signal-engine"

export async function GET(){
 const supabase=await createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
 const [{data:rows,error:signalError},conn]=await Promise.all([
   supabase.from("ashqe_signals").select("type,title,summary,confidence,urgency,source_url,status,metadata,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100),
   getValidAccessToken(supabase,user.id),
 ])
 if(signalError)return NextResponse.json({error:signalError.message},{status:500})
 const signals=(rows||[]).map((s)=>({
   type:String(s.type||"insight") as XSignalCandidate["type"],
   title:String(s.title||""),
   summary:String(s.summary||""),
   confidence:Number(s.confidence||0),
   urgency:Number(s.urgency||0),
   sourceUrl:typeof s.source_url==="string"?s.source_url:"",
   metadata:(s.metadata||{}) as Record<string,unknown>,
 }))
 let tweets=[]
 if(conn){
   try{tweets=await fetchRecentTweets(conn.access_token,conn.x_user_id,100)}catch{tweets=[]}
 }
 const opportunities=buildOpportunities(signals,tweets)
 return NextResponse.json({
   generatedAt:new Date().toISOString(),
   connected:Boolean(conn),
   briefing:buildDailyBriefing(signals,opportunities),
   opportunities:opportunities.slice(0,10),
   genome:buildContentGenome(tweets),
   relationships:buildRelationshipGraph(tweets).slice(0,20),
   evidence:{signals:signals.length,tweets:tweets.length},
 })
}
