import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/dashboard/dashboard-shell"
import type { UIMessage } from "ai"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: connection } = await supabase.from("x_connections").select("x_username, x_name, x_avatar_url, recent_posts").eq("user_id", user.id).maybeSingle()
  if (!connection) redirect("/connect")

  const { data: style } = await supabase.from("style_profiles").select("tone, length_pref, rhythm, topics, signature_phrases, do_list, dont_list, summary, posts_analyzed, updated_at").eq("user_id", user.id).maybeSingle()
  const { data: drafts } = await supabase.from("drafts").select("id, topic, content, status, x_post_id, published_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12)

  let { data: latestSession } = await supabase.from("chat_sessions").select("id, title, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle()
  if (!latestSession) {
    const { data: created } = await supabase.from("chat_sessions").insert({ user_id: user.id, title: "New chat" }).select("id, title, updated_at").single()
    latestSession = created ?? null
  }

  let initialMessages: UIMessage[] = []
  if (latestSession) {
    const { data: msgs } = await supabase.from("chat_messages").select("id, role, parts, created_at").eq("session_id", latestSession.id).eq("user_id", user.id).order("created_at", { ascending: true })
    initialMessages = (msgs ?? []).map((message) => ({ id: message.id, role: message.role, parts: message.parts }) as UIMessage)
  }

  const recentCount = Array.isArray(connection.recent_posts) ? connection.recent_posts.length : 0
  const publishedCount = (drafts ?? []).filter((draft) => draft.status === "published").length
  const draftCount = (drafts ?? []).filter((draft) => draft.status === "draft").length

  return <DashboardShell user={{ email: user.email ?? "" }} connection={{ username: connection.x_username, name: connection.x_name, avatarUrl: connection.x_avatar_url }} style={style ?? null} drafts={drafts ?? []} initialMessages={initialMessages} sessionId={latestSession?.id ?? null} stats={{ postsAnalyzed: recentCount, published: publishedCount, drafts: draftCount }} />
}
