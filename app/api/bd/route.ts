import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getChatModel } from "@/lib/openrouter"
import { generateText } from "ai"

export const maxDuration=60

export async function POST(request:Request){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
  const body=await request.json().catch(()=>({}))
  const query=String(body.query||"").trim()
  if(!query)return NextResponse.json({error:"query_required"},{status:400})
  if(query.length>500)return NextResponse.json({error:"query_too_long"},{status:422})
  const key=process.env.TAVILY_API_KEY
  if(!key||!process.env.OPENROUTER_API_KEY)return NextResponse.json({error:"bd_providers_not_configured"},{status:503})
  const search=await fetch("https://api.tavily.com/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:key,query,max_results:8,search_depth:"advanced"}),cache:"no-store"})
  if(!search.ok)return NextResponse.json({error:"search_failed"},{status:502})
  const data=await search.json() as {results?:Array<{title:string;url:string;content:string}>}
  const evidence=(data.results??[]).map((x,i)=>"["+i+"] "+x.title+"\n"+x.url+"\n"+x.content).join("\n\n")
  const {text}=await generateText({model:getChatModel(),prompt:"Act as Ashqe BD intelligence. Based only on this evidence, identify people, companies, projects or communities worth building relationships with. Return JSON with opportunities [{name,why,angle,evidence_url}] and cautions. Never invent people or relationships.\nQuery:"+query+"\nEvidence:\n"+evidence.slice(0,30000),temperature:0.2})
  let result:unknown={opportunities:[],cautions:[],raw:text};try{result=JSON.parse(text)}catch{}
  return NextResponse.json({result})
}
