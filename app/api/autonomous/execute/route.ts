import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getValidAccessToken, postTweet, postReply } from "@/lib/x/api"
import { authorizeAutonomousAction } from "@/lib/execution-policy"
import { getChatModel } from "@/lib/openrouter"
import { generateText } from "ai"

export const maxDuration = 60

export async function POST(request:Request){
  const auth=request.headers.get("authorization")
  if(!process.env.CRON_SECRET || auth !== "Bearer " + process.env.CRON_SECRET) return NextResponse.json({error:"unauthorized"},{status:401})
  const body=await request.json().catch(()=>({})) as {userId?:string; actionType?: "post"|"reply"; instruction?:string; targetId?:string; targetText?:string; recipientOptedIn?:boolean; aiReplyApproved?:boolean}
  if(!body.userId || !body.actionType || !body.instruction) return NextResponse.json({error:"user_id_action_type_instruction_required"},{status:400})

  const admin=createAdminClient()
  const authz=await authorizeAutonomousAction(admin,body.userId,body.actionType,{targetId:body.targetId,recipientOptedIn:body.recipientOptedIn,aiReplyApproved:body.aiReplyApproved})
  if(!authz.allowed) return NextResponse.json({executed:false,blocked:true,reason:authz.reason})

  const conn=await getValidAccessToken(admin,body.userId)
  if(!conn) return NextResponse.json({error:"x_not_connected"},{status:400})

  const prompt=body.actionType==="reply"
    ? "Write one concise, genuinely human X reply to this interaction. Never use generic AI praise, hashtags unless clearly natural, or fake enthusiasm. Reply only to the supplied interaction. User instruction: " + body.instruction + "\nInteraction:\n" + (body.targetText ?? "")
    : "Write one original X post under 280 characters. It must sound like a specific human with an actual observation, not an AI content template. No generic hook, no engagement bait. User instruction: " + body.instruction
  const {text}=await generateText({model:getChatModel(),prompt,temperature:0.8})
  const clean=text.trim().replace(/^["']|["']$/g,"")
  if(!clean || clean.length>280) return NextResponse.json({error:"generated_content_invalid"},{status:422})

  try{
    const posted=body.actionType==="reply" ? await postReply(conn.access_token,clean,String(body.targetId)) : await postTweet(conn.access_token,clean)
    await admin.from("ashqe_action_log").update({content:clean,status:"executed",reason:"autonomous_executor",policy_snapshot:authz.policy}).eq("id",authz.reservationId).eq("user_id",body.userId)
    return NextResponse.json({executed:true,id:posted.id,text:posted.text,url:"https://x.com/"+conn.x_username+"/status/"+posted.id})
  }catch(error){
    await admin.from("ashqe_action_log").update({content:clean,status:"failed",reason:error instanceof Error?error.message:"x_action_failed",policy_snapshot:authz.policy}).eq("id",authz.reservationId).eq("user_id",body.userId)
    return NextResponse.json({error:"x_action_failed"},{status:502})
  }
}
