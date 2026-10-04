import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {getValidAccessToken,fetchRecentTweets} from "@/lib/x/api"
import {buildRelationshipGraph} from "@/lib/intelligence/core"
export async function GET(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser()
 if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
 const conn=await getValidAccessToken(supabase,user.id);if(!conn)return NextResponse.json({error:"x_not_connected"},{status:400})
 const tweets=await fetchRecentTweets(conn.access_token,conn.x_user_id,100)
 return NextResponse.json({generatedAt:new Date().toISOString(),nodes:buildRelationshipGraph(tweets)})
}
