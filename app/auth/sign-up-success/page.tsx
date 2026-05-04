import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-10 border border-border bg-background text-center space-y-6">
        <Link href="/" className="inline-block text-2xl font-bold tracking-tight">
          Ashqe
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a confirmation link to your inbox. Confirm your email, then come back and sign in.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2.5 rounded-lg bg-foreground text-background font-semibold hover:bg-foreground/90"
        >
          Back to sign in
        </Link>
      </Card>
    </main>
  )
}
