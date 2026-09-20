import {NextResponse} from "next/server"
import {createAdminClient} from "@/lib/supabase/admin"
import {verifyPayment,currentEvmBlock} from "@/lib/billing/verify"
import {chainConfig,type BillingChain,type BillingToken} from "@/lib/billing/config"
export const dynamic="force-dynamic"
export const maxDuration=60
export async function GET(request:Request){
 const auth=request.headers.get("authorization");if(!process.env.CRON_SECRET||auth!=="Bearer "+process.env.CRON_SECRET)return NextResponse.json({error:"unauthorized"},{status:401})
 const admin=createAdminClient();const {data:intents,error}=await admin.from("ashqe_payment_intents").select("*").in("status",["pending","confirming"]).gt("expires_at",new Date().toISOString()).limit(50);if(error)return NextResponse.json({error:error.message},{status:500})
 const results=[]
 for(const intent of intents||[]){
  try{
   const chain=intent.chain as BillingChain,token=intent.token as BillingToken,verified=await verifyPayment(chain,token,intent.recipient,BigInt(intent.amount_units),BigInt(intent.last_scanned_block||0))
   if(!verified){if(chain!=="solana"){const latest=await currentEvmBlock(chain);const old=BigInt(intent.last_scanned_block||0);const next=latest>old+2500n?old+2500n:latest;await admin.from("ashqe_payment_intents").update({last_scanned_block:Number(next),updated_at:new Date().toISOString()}).eq("id",intent.id)}results.push({id:intent.id,status:"pending"});continue}
   const {data:existing}=await admin.from("ashqe_payment_events").select("payment_intent_id").eq("event_key",verified.eventKey).maybeSingle()
   if(existing&&existing.payment_intent_id!==intent.id){await admin.from("ashqe_payment_intents").update({status:"rejected",metadata:{...intent.metadata,rejection:"payment_already_used"}}).eq("id",intent.id);results.push({id:intent.id,status:"rejected"});continue}
   await admin.from("ashqe_payment_events").upsert({payment_intent_id:intent.id,chain,token,tx_hash:verified.txHash,event_key:verified.eventKey,sender_address:verified.sender,recipient_address:intent.recipient,amount_units:verified.amountUnits.toString(),block_number:Number(verified.blockNumber),confirmations:chainConfig(chain).confirmations,verified:true,raw:verified.raw,verified_at:new Date().toISOString()},{onConflict:"event_key"})
   const now=new Date(),end=new Date(now.getTime()+30*24*60*60*1000)
   await admin.from("ashqe_payment_intents").update({status:"paid",paid_at:now.toISOString(),tx_hash:verified.txHash,sender_address:verified.sender,block_number:Number(verified.blockNumber),updated_at:now.toISOString()}).eq("id",intent.id)
   await admin.from("ashqe_subscriptions").update({status:"expired",updated_at:now.toISOString()}).eq("user_id",intent.user_id).eq("status","active")
   await admin.from("ashqe_subscriptions").insert({user_id:intent.user_id,plan_id:intent.plan_id,status:"active",current_period_start:now.toISOString(),current_period_end:end.toISOString(),payment_intent_id:intent.id,chain,token,tx_hash:verified.txHash})
   results.push({id:intent.id,status:"paid"})
  }catch(e){results.push({id:intent.id,status:"error",error:e instanceof Error?e.message:"verification_failed"})}
 }
 return NextResponse.json({processed:results.length,results})
}