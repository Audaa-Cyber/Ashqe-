import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken, fetchRecentTweets, fetchRecentMentions, searchRecentTweets } from "@/lib/x/api"

export const maxDuration=60

export async function POST(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
  const conn=await getValidAccessToken(supabase,user.id)
  if(!conn)return NextResponse.json({error:"x_not_connected"},{status:400})
  const [tweets,mentions]=await Promise.all([fetchRecentTweets(conn.access_token,conn.x_user_id,100),fetchRecentMentions(conn.access_token,conn.x_user_id,100)])
  const style=await supabase.from("style_profiles").select("topics").eq("user_id",user.id).maybeSingle()
  const topics=Array.isArray(style.data?.topics)?style.data.topics.slice(0,3):[]
  let discovered:unknown[]=[]
  for(const topic of topics){
    try{
      const hits=await searchRecentTweets(conn.access_token,String(topic)+" -is:retweet",30)
      const top=hits.filter(t=>(t.public_metrics?.like_count??0)+(t.public_metrics?.reply_count??0)>=5).slice(0,5)
      for(const hit of top) discovered.push({topic, tweet:hit})
    }catch{}
  }
  const best=tweets.slice().sort((a,b)=>((b.public_metrics?.like_count??0)+(b.public_metrics?.reply_count??0))-((a.public_metrics?.like_count??0)+(a.public_metrics?.reply_count??0))).slice(0,5)
  for(const tweet of best){
    const engagement=(tweet.public_metrics?.like_count??0)+(tweet.public_metrics?.reply_count??0)+(tweet.public_metrics?.retweet_count??0)
    await supabase.from("ashqe_signals").insert({user_id:user.id,type:"content_performance",title:"Your post is a performance signal",summary:tweet.text.slice(0,1000),confidence:Math.min(95,50+Math.min(45,engagement)),urgency:3,metadata:{tweet_id:tweet.id,metrics:tweet.public_metrics}})
  }
  for(const mention of mentions.slice(0,20)){ await supabase.from("ashqe_signals").insert({user_id:user.id,type:"mention",title:"You were mentioned on X",summary:mention.text.slice(0,1000),confidence:80,urgency:4,metadata:{tweet_id:mention.id,author_id:mention.author_id,public_metrics:mention.public_metrics}}) }
  if(discovered.length){
    await supabase.from("ashqe_signals").insert({user_id:user.id,type:"radar",title:"Live niche movement detected",summary:"Ashqe found recent conversation activity in your monitored topics.",confidence:70,urgency:4,metadata:{items:discovered.slice(0,15)}})
  }
  await supabase.from("x_connections").update({recent_posts:tweets.map(t=>({id:t.id,text:t.text,created_at:t.created_at??null,public_metrics:t.public_metrics??null})),updated_at:new Date().toISOString()}).eq("user_id",user.id)
  return NextResponse.json({ok:true,posts:tweets.length,mentions:mentions.length,discovered:discovered.length})
}
