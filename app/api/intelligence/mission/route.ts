import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {planMission} from "@/lib/intelligence/core"
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser()
 if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
 const body=await request.json().catch(()=>({}))
 const goal=typeof body.goal==="string"?body.goal.trim():""
 if(!goal||goal.length>4000)return NextResponse.json({error:"goal_required"},{status:400})
 return NextResponse.json({mission:planMission(goal,{write:Boolean(body.write)})})
}
