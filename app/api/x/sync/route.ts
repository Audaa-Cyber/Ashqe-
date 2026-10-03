import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchRecentTweets, fetchRecentMentions, searchRecentTweets, getValidAccessToken } from "@/lib/x/api"
import { fetchPublicTweetsFromIndexer, searchPublicTweets } from "@/lib/x/public-indexers"

export const maxDuration=60

export async function POST(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
  const { data: conn, error: connectionError } = await supabase
    .from("x_connections")
    .select("x_user_id,x_username")

    .eq("user_id", user.id)
    .maybeSingle()
  if (connectionError || !conn) return NextResponse.json({ error: "x_not_connected" }, { status: 400 })
  let tweets, mentions
  let oauthConnection: Awaited<ReturnType<typeof getValidAccessToken>> = null
  try {
    // Public reads should work without an X OAuth token. Use the public indexers
    // first, then fall back to the connected account for private/uncached data.
    try {
      [tweets, mentions] = await Promise.all([
        fetchPublicTweetsFromIndexer(conn.x_user_id, 100),
        searchPublicTweets(`to:${conn.x_username} -is:retweet`, 100).then((result) => result.tweets),
      ])
    } catch (publicError) {
      console.warn("[x-sync] public X fetch failed, falling back to OAuth", publicError)
      oauthConnection = await getValidAccessToken(supabase, user.id)
      if (!oauthConnection) throw publicError
      ;[tweets, mentions] = await Promise.all([
        fetchRecentTweets(oauthConnection.access_token, conn.x_user_id, 100),
        fetchRecentMentions(oauthConnection.access_token, conn.x_user_id, 100),
      ])
    }
  } catch (error) {
    console.error("[x-sync] X read failed", error)
    return NextResponse.json({ error: "x_api_read_failed", detail: error instanceof Error ? error.message : String(error) }, { status: 502 })
  }
  const style=await supabase.from("style_profiles").select("topics").eq("user_id",user.id).maybeSingle()
  const topics=Array.isArray(style.data?.topics)?style.data.topics.slice(0,3):[]
  let discovered:unknown[]=[]
  for(const topic of topics){
    try{
      const hits=await searchPublicTweets(String(topic)+" -is:retweet",30).then((result) => result.tweets)
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
