import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {chainConfig,decimals,getPlan,tokenAddress,type BillingChain,type BillingToken} from "@/lib/billing/config"
import {amountToUnits} from "@/lib/billing/verify"
const chains=new Set(["solana","base","arc"]),tokens=new Set(["USDC","USDT"])
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
 const body=await request.json() as {planId?:string;chain?:BillingChain;token?:BillingToken};const plan=getPlan(String(body.planId||""));if(!plan)return NextResponse.json({error:"invalid_plan"},{status:400})
 if(typeof body.chain!=="string"||!chains.has(body.chain)||typeof body.token!=="string"||!tokens.has(body.token))return NextResponse.json({error:"unsupported_chain_or_token"},{status:400})
 const chain=body.chain as BillingChain,token=body.token as BillingToken,cfg=chainConfig(chain),recipient=cfg.wallet,contract=tokenAddress(chain,token)
 if(!recipient||!contract)return NextResponse.json({error:"payment_rail_not_configured",message:"This payment rail is not configured yet."},{status:503})
 const units=amountToUnits(plan.monthlyUsd),expires=new Date(Date.now()+30*60*1000).toISOString()
 const {data,error}=await supabase.from("ashqe_payment_intents").insert({user_id:user.id,plan_id:plan.id,chain,token,amount_usd:plan.monthlyUsd,amount_units:units.toString(),recipient,status:"pending",expires_at:expires,last_scanned_block:0,metadata:{token_contract:contract,decimals:decimals(chain,token)}}).select("*").single()
 if(error)return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json({intent:{id:data.id,planId:plan.id,chain,token,amountUsd:plan.monthlyUsd,amountUnits:units.toString(),recipient,expiresAt:expires,tokenContract:contract,decimals:6}})
}