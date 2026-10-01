import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import OnboardingFlow from "@/components/onboarding/onboarding-flow"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")
  const { data: connection } = await supabase
    .from("x_connections")
    .select("x_username, x_name, x_avatar_url")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!connection) redirect("/connect")

  const { data: style } = await supabase
    .from("style_profiles")
    .select("tone, length_pref, rhythm, summary, posts_analyzed")
    .eq("user_id", user.id)
    .maybeSingle()

  return <OnboardingFlow username={connection.x_username} name={connection.x_name} style={style ?? null} />
}