import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function send(token:string,chatId:string|number,text:string){
  return fetch("https://api.telegram.org/bot"+token+"/sendMessage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text})})
}

export async function POST(request:Request){
  const secret=process.env.TELEGRAM_WEBHOOK_SECRET
  if(secret&&request.headers.get("x-telegram-bot-api-secret-token")!==secret)return NextResponse.json({ok:false},{status:401})
  const update=await request.json()
  const message=update.message
  const chatId=message?.chat?.id
  if(!chatId)return NextResponse.json({ok:true})
  const token=process.env.TELEGRAM_BOT_TOKEN
  if(!token)return NextResponse.json({ok:true})
  const text=String(message?.text||"").trim()
  const admin=createAdminClient()

  if(text.startsWith("/connect ")){
    const raw=text.slice(9).trim()
    const hash=createHash("sha256").update(raw).digest("hex")
    const {data:connection}=await admin.from("ashqe_telegram_connections").select("user_id").eq("link_token_hash",hash).maybeSingle()
    if(!connection){await send(token,chatId,"That Ashqe link has expired or is invalid.");return NextResponse.json({ok:true})}
    await admin.from("ashqe_telegram_connections").update({chat_id:String(chatId),username:message?.from?.username??null,last_seen_at:new Date().toISOString(),link_token_hash:null}).eq("user_id",connection.user_id)
    await send(token,chatId,"Ashqe is connected. Try /brief.")
    return NextResponse.json({ok:true})
  }

  const {data:connection}=await admin.from("ashqe_telegram_connections").select("user_id").eq("chat_id",String(chatId)).maybeSingle()
  if(!connection){await send(token,chatId,"Connect this Telegram account from Ashqe first.");return NextResponse.json({ok:true})}

  if(text==="/pause"){
    await admin.from("ashqe_execution_policy").upsert({user_id:connection.user_id,autonomous_enabled:false,autonomous_posts:false,autonomous_replies:false,updated_at:new Date().toISOString()})
    await send(token,chatId,"Autonomous mode paused. No posts or replies will execute.")
  }else if(text==="/resume"){
    await admin.from("ashqe_execution_policy").upsert({user_id:connection.user_id,autonomous_enabled:true,updated_at:new Date().toISOString()})
    await send(token,chatId,"Autonomous master switch resumed. Existing post/reply permissions remain unchanged.")
  }else if(text==="/brief"){
    const {data:signals}=await admin.from("ashqe_signals").select("title,summary").eq("user_id",connection.user_id).order("created_at",{ascending:false}).limit(5)
    const body=(signals??[]).map((s,i)=>(i+1)+". "+s.title+"\n"+s.summary).join("\n\n")
    await send(token,chatId,body?"ASHQE / LATEST SIGNALS\n\n"+body:"ASHQE / BRIEF\n\nNo signals yet. Run research from Ashqe.")
  }else if(text==="/autonomous"){
    const {data:p}=await admin.from("ashqe_execution_policy").select("autonomous_enabled,autonomous_posts,autonomous_replies").eq("user_id",connection.user_id).maybeSingle()
    await send(token,chatId,"Autonomous: "+(p?.autonomous_enabled?"ON":"OFF")+"\nPosts: "+(p?.autonomous_posts?"ON":"OFF")+"\nReplies: "+(p?.autonomous_replies?"ON":"OFF"))
  }else{
    await send(token,chatId,"Ashqe commands: /brief · /autonomous · /pause · /resume")
  }
  return NextResponse.json({ok:true})
}
