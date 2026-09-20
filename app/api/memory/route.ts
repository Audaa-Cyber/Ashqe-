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
  const body=await request.json().catch(()=>({}))
  const title=String(body.title||"").trim(), content=String(body.content||"").trim(), kind=String(body.kind||"fact")
  const allowedKinds=new Set(["fact","preference","project","opinion","rule","style","context"])
  if(!title||!content) return NextResponse.json({error:"title_and_content_required"},{status:400})
  if(title.length>160||content.length>5000) return NextResponse.json({error:"memory_too_long"},{status:422})
  if(!allowedKinds.has(kind)) return NextResponse.json({error:"invalid_memory_kind"},{status:400})
  const parsedImportance=Number(body.importance??3)
  if(!Number.isFinite(parsedImportance)) return NextResponse.json({error:"invalid_importance"},{status:400})
  const importance=Math.min(5,Math.max(1,Math.round(parsedImportance)))
  const source=String(body.source||"user").slice(0,80)
  const {data,error}=await supabase.from("ashqe_memories").insert({user_id:user.id,kind,title,content,importance,source}).select().single()
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
