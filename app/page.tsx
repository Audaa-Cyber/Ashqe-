import { redirect } from "next/navigation"
import ConnectXForm from "@/components/connect/connect-x-form"

export const dynamic = "force-dynamic"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params?.error ?? null

  // Try to check if user is already authenticated
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // If user is already authenticated, check if they have X connection
    if (user) {
      const { data: xConnection } = await supabase
        .from("x_connections")
        .select("x_username")
        .eq("user_id", user.id)
        .maybeSingle()

      // If they have X connection, go to dashboard; otherwise to connect X
      if (xConnection) {
        redirect("/dashboard")
      } else {
        redirect("/connect")
      }
    }
  } catch (e) {
    // Supabase not configured - just show login form
    console.error("[v0] Supabase check failed:", e)
  }

  // Not authenticated — show X OAuth login
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="text-2xl font-bold tracking-tight">Ashqe</div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <ConnectXForm error={error} email="" />
      </div>
    </main>
  )
}
