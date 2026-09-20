import {NextResponse} from "next/server"
import {createAdminClient} from "@/lib/supabase/admin"
export const dynamic="force-dynamic"
export async function GET(){
 const checks:any={timestamp:new Date().toISOString(),service:"ashqe",version:process.env.VERCEL_GIT_COMMIT_SHA||"local"}
 const required=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SECRET_KEY","X_CLIENT_ID","X_REDIRECT_URI","X_TOKEN_ENCRYPTION_KEY","CRON_SECRET"]
 for(const key of required)checks[key]=Boolean(process.env[key])
 try{const admin=createAdminClient();const {error}=await admin.from("ashqe_signals").select("id").limit(1);checks.database=!error}catch{checks.database=false}
 const ok=checks.database&&checks.NEXT_PUBLIC_SUPABASE_URL&&checks.NEXT_PUBLIC_SUPABASE_ANON_KEY&&checks.SUPABASE_SECRET_KEY&&checks.X_CLIENT_ID&&checks.X_REDIRECT_URI&&checks.X_TOKEN_ENCRYPTION_KEY&&checks.CRON_SECRET
 return NextResponse.json(checks,{status:ok?200:503,headers:{"cache-control":"no-store"}})
}