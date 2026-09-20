import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data:{user} } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error:"unauthorized"},{status:401})
  const {data,error}=await supabase.from("ashqe_memories").select("id,kind,title,content,importance,source,created_at,updated_at").eq("user_id",user.id).order("importance",{ascending:false}).order("updated_at",{ascending:false}).limit(100)
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({memories:data ?? []})
}

export async function POST(request:Request){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:"unauthorized"},{status:401})
  const body=await request.json()
  const title=String(body.title||"").trim(), content=String(body.content||"").trim(), kind=String(body.kind||"fact")
  if(!title||!content) return NextResponse.json({error:"title_and_content_required"},{status:400})
  const {data,error}=await supabase.from("ashqe_memories").insert({user_id:user.id,kind,title,content,importance:Math.min(5,Math.max(1,Number(body.importance??3))),source:String(body.source||"user")}).select().single()
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({memory:data})
}

export async function DELETE(request:Request){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:"unauthorized"},{status:401})
  const id=new URL(request.url).searchParams.get("id")
  if(!id) return NextResponse.json({error:"id_required"},{status:400})
  const {error}=await supabase.from("ashqe_memories").delete().eq("id",id).eq("user_id",user.id)
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({ok:true})
}
