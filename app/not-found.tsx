import Link from "next/link"

export default function NotFound(){
  return <main className="min-h-screen bg-background text-foreground grid place-items-center p-8"><div className="max-w-lg"><div className="ashqe-mono text-xs text-[#ffffff]">ASHQE / 404</div><h1 className="ashqe-display text-6xl mt-4">Signal not found.</h1><p className="text-muted-foreground mt-4">The page you're looking for doesn't exist or has moved.</p><Link href="/" className="inline-block mt-8 bg-white text-black px-5 py-3 font-semibold">Return home</Link></div></main>
}
