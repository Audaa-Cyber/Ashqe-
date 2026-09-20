import {NextResponse} from "next/server"
import {createAdminClient} from "@/lib/supabase/admin"
import {createClient} from "@/lib/supabase/server"
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
 const body=await request.json().catch(()=>({}));if(body.confirmation!=="DELETE MY ACCOUNT")return NextResponse.json({error:"confirmation_required"},{status:400})
 const admin=createAdminClient();const {error}=await admin.auth.admin.deleteUser(user.id);if(error)return NextResponse.json({error:"delete_failed"},{status:500})
 return NextResponse.json({deleted:true})
}