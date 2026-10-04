import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getValidAccessToken, postTweet, postReply } from "@/lib/x/api"
import { authorizeAutonomousAction } from "@/lib/execution-policy"
import { getChatModel } from "@/lib/openrouter"
import { generateText } from "ai"
import { verifyXWrite, persistVerification } from "@/lib/intelligence/verification"
import { recordOutcome } from "@/lib/intelligence/outcomes"

export const maxDuration = 60

export async function POST(request:Request){
  const auth=request.headers.get("authorization")
  if(!process.env.CRON_SECRET || auth !== "Bearer " + process.env.CRON_SECRET) return NextResponse.json({error:"unauthorized"},{status:401})
  const body=await request.json().catch(()=>({})) as {userId?:string; actionType?: "post"|"reply"; instruction?:string; targetId?:string; targetText?:string; recipientOptedIn?:boolean; aiReplyApproved?:boolean}
  if(!body.userId || !body.actionType || !body.instruction) return NextResponse.json({error:"user_id_action_type_instruction_required"},{status:400})

  const admin=createAdminClient()
  const authz=await authorizeAutonomousAction(admin,body.userId,body.actionType,{targetId:body.targetId ?? undefined,recipientOptedIn:body.recipientOptedIn ?? false,aiReplyApproved:body.aiReplyApproved ?? false})
  if(!authz.allowed) return NextResponse.json({executed:false,blocked:true,reason:authz.reason})

  const conn=await getValidAccessToken(admin,body.userId)
  if(!conn) { await admin.from("ashqe_action_log").update({status:"failed",reason:"x_not_connected"}).eq("id",authz.reservationId); return NextResponse.json({error:"x_not_connected"},{status:400}) }

  const prompt=body.actionType==="reply"
    ? "Write one concise, genuinely human X reply to this interaction. Never use generic AI praise, hashtags unless clearly natural, or fake enthusiasm. Reply only to the supplied interaction. User instruction: " + body.instruction + "\nInteraction:\n" + (body.targetText ?? "")
    : "Write one original X post under 280 characters. It must sound like a specific human with an actual observation, not an AI content template. No generic hook, no engagement bait. User instruction: " + body.instruction
  const {text}=await generateText({model:getChatModel(),prompt,temperature:0.8})
  const clean=text.trim().replace(/^["']|["']$/g,"")
  if(!clean || clean.length>280) { await admin.from("ashqe_action_log").update({status:"failed",reason:"generated_content_invalid"}).eq("id",authz.reservationId); return NextResponse.json({error:"generated_content_invalid"},{status:422}) }

  try{
    const posted=body.actionType==="reply" ? await postReply(conn.access_token,clean,String(body.targetId)) : await postTweet(conn.access_token,clean)
    const verification = await verifyXWrite(admin, {
      userId: body.userId,
      actionId: authz.reservationId,
      expected: { authorId: conn.x_user_id, text: posted.text, tweetId: posted.id, replyToId: body.actionType === "reply" ? body.targetId : undefined },
    })
    const verificationId = await persistVerification(admin, {
      userId: body.userId,
      actionId: authz.reservationId,
      verificationType: body.actionType === "reply" ? "x_reply_readback" : "x_post_readback",
      result: verification,
    })
    const outcomeId = await recordOutcome(admin, {
      userId: body.userId,
      actionId: authz.reservationId,
      verificationId,
      state: verification.status,
      confidence: verification.confidence,
      metrics: { tweetId: posted.id, actionType: body.actionType },
      unknownReason: verification.reason,
    })
    if (verification.status !== "verified") {
      await admin.from("ashqe_action_log").update({content:clean,status:"failed",reason:"x_write_verification_failed",policy_snapshot:authz.policy}).eq("id",authz.reservationId).eq("user_id",body.userId)
      return NextResponse.json({executed:false,id:posted.id,verificationId,outcomeId,error:"x_write_verification_failed"},{status:502})
    }
    await admin.from("ashqe_action_log").update({content:clean,status:"executed",reason:"autonomous_executor_verified",policy_snapshot:authz.policy}).eq("id",authz.reservationId).eq("user_id",body.userId)
    return NextResponse.json({executed:true,id:posted.id,text:posted.text,verificationId,outcomeId,url:"https://x.com/"+conn.x_username+"/status/"+posted.id})
  }catch(error){
    await admin.from("ashqe_action_log").update({content:clean,status:"failed",reason:error instanceof Error?error.message:"x_action_failed",policy_snapshot:authz.policy}).eq("id",authz.reservationId).eq("user_id",body.userId)
    return NextResponse.json({error:"x_action_failed"},{status:502})
  }
}
