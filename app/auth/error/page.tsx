import { Card } from "@/components/ui/card"
import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-10 border border-border bg-background text-center space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {params?.error ? `Code error: ${params.error}` : "An unspecified error occurred during authentication."}
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2.5 rounded-lg bg-foreground text-background font-semibold hover:bg-foreground/90"
        >
          Try again
        </Link>
      </Card>
    </main>
  )
}
