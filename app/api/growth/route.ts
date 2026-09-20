import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken, fetchRecentTweets } from "@/lib/x/api"
import { getChatModel } from "@/lib/openrouter"
import { generateText } from "ai"

export const maxDuration=60

export async function GET(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
  const conn=await getValidAccessToken(supabase,user.id)
  if(!conn)return NextResponse.json({error:"x_not_connected"},{status:400})
  const tweets=await fetchRecentTweets(conn.access_token,conn.x_user_id,100)
  const corpus=tweets.map(t=>({text:t.text,metrics:t.public_metrics,created_at:t.created_at}))
  if(!process.env.OPENROUTER_API_KEY)return NextResponse.json({tweets:corpus,insights:[]})
  const {text}=await generateText({model:getChatModel(),prompt:"Analyze this X account history as a growth manager. Identify what formats/topics/hooks appear to work, what underperforms, and propose 3 experiments. Do not invent metrics. Return JSON with insights array and experiments array. DATA:\n"+JSON.stringify(corpus).slice(0,30000),temperature:0.2})
  let analysis:unknown={insights:[],experiments:[],raw:text};try{analysis=JSON.parse(text)}catch{}
  return NextResponse.json({tweets:corpus,analysis})
}
