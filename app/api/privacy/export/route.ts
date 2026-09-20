import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
export async function GET(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
 const tables=["x_connections","style_profiles","drafts","chat_sessions","chat_messages","ashqe_memories","ashqe_jobs","ashqe_job_runs","ashqe_signals","ashqe_content_reviews","ashqe_telegram_connections","ashqe_execution_policy","ashqe_action_log","ashqe_payment_intents","ashqe_subscriptions"]
 const out:any={exported_at:new Date().toISOString(),user_id:user.id}
 for(const table of tables){const {data,error}=await supabase.from(table).select("*").eq("user_id",user.id);if(error&&table!=="ashqe_billing_plans")return NextResponse.json({error:"export_failed",table},{status:500});out[table]=data||[]}
 out.ashqe_billing_plans=(await supabase.from("ashqe_billing_plans").select("*")).data||[]
 const paymentIds=(out.ashqe_payment_intents||[]).map((x:any)=>x.id);out.ashqe_payment_events=paymentIds.length?(await supabase.from("ashqe_payment_events").select("*").in("payment_intent_id",paymentIds)).data||[]:[]
 return new NextResponse(JSON.stringify(out,null,2),{headers:{"content-type":"application/json","content-disposition":"attachment; filename=ashqe-data-export.json","cache-control":"no-store"}})
}