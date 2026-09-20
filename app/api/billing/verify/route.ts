import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {createAdminClient} from "@/lib/supabase/admin"
import {verifyPayment} from "@/lib/billing/verify"
import {chainConfig,getPlan,type BillingChain,type BillingToken} from "@/lib/billing/config"
import {currentEvmBlock} from "@/lib/billing/verify"
export const maxDuration=60
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
 const admin=createAdminClient()
 const {intentId}=await request.json() as {intentId?:string};if(!intentId)return NextResponse.json({error:"intent_required"},{status:400})
 const {data:intent,error}=await admin.from("ashqe_payment_intents").select("*").eq("id",intentId).eq("user_id",user.id).maybeSingle();if(error||!intent)return NextResponse.json({error:"intent_not_found"},{status:404})
 if(intent.status==="paid")return NextResponse.json({status:"paid",txHash:intent.tx_hash})
 if(new Date(intent.expires_at).getTime()<Date.now()){await admin.from("ashqe_payment_intents").update({status:"expired",updated_at:new Date().toISOString()}).eq("id",intent.id);return NextResponse.json({status:"expired"})}
 try{
  const chain=intent.chain as BillingChain,token=intent.token as BillingToken,cfg=chainConfig(chain)
  const verified=await verifyPayment(chain,token,intent.recipient,BigInt(intent.amount_units),BigInt(intent.last_scanned_block||0))
  if(!verified){ if(chain!=="solana"){const latest=await currentEvmBlock(chain);const next=latest>BigInt(intent.last_scanned_block||0)+2500n?BigInt(intent.last_scanned_block||0)+2500n:latest;await admin.from("ashqe_payment_intents").update({last_scanned_block:Number(next),updated_at:new Date().toISOString()}).eq("id",intent.id)} return NextResponse.json({status:"pending"}) }
  const {data:existingEvent}=await admin.from("ashqe_payment_events").select("payment_intent_id").eq("event_key",verified.eventKey).maybeSingle();if(existingEvent&&existingEvent.payment_intent_id!==intent.id)return NextResponse.json({error:"payment_already_used"},{status:409})
  const event={payment_intent_id:intent.id,chain,token,tx_hash:verified.txHash,event_key:verified.eventKey,sender_address:verified.sender,recipient_address:intent.recipient,amount_units:verified.amountUnits.toString(),block_number:Number(verified.blockNumber),confirmations:cfg.confirmations,verified:true,raw:verified.raw,verified_at:new Date().toISOString()}
  const inserted=await admin.from("ashqe_payment_events").insert(event);if(inserted.error&&!inserted.error.message.toLowerCase().includes("duplicate"))return NextResponse.json({error:inserted.error.message},{status:500})
  const now=new Date(),end=new Date(now.getTime()+30*24*60*60*1000),plan=getPlan(intent.plan_id);if(!plan)return NextResponse.json({error:"plan_missing"},{status:500})
  const settled=await admin.rpc("ashqe_settle_payment_intent",{p_intent_id:intent.id,p_user_id:user.id,p_tx_hash:verified.txHash,p_sender_address:verified.sender,p_block_number:Number(verified.blockNumber),p_chain:chain,p_token:token})
  if(settled.error || settled.data!==true) return NextResponse.json({error:"settlement_failed"},{status:503})
  return NextResponse.json({status:"paid",txHash:verified.txHash,periodEnd:end.toISOString()})
 }catch(e){console.error("[billing] verification failed",e);return NextResponse.json({error:"verification_unavailable"},{status:503})}
}