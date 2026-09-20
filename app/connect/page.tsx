import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ConnectXForm from "@/components/connect/connect-x-form"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Returning users with an existing X connection can go straight to the dashboard.
  if (user) {
    const { data: existing } = await supabase
      .from("x_connections")
      .select("x_username")
      .eq("user_id", user.id)
      .maybeSingle()

    if (existing) redirect("/dashboard")
  }

  const params = await searchParams
  const error = params?.error ?? null

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            Ashqe
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Go to dashboard
            </Link>
          ) : (
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to home
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <ConnectXForm error={error} email={user?.email ?? ""} />
      </div>
    </main>
  )
}
