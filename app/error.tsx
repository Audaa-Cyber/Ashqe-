"use client"

export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main className="min-h-screen bg-background text-foreground grid place-items-center p-8"><div className="max-w-lg"><div className="ashqe-mono text-xs text-[#d9ff4f]">ASHQE / SYSTEM</div><h1 className="ashqe-display text-6xl mt-4">Something broke.</h1><p className="text-muted-foreground mt-4">Ashqe couldn't complete that operation. Your account and stored work are unchanged.</p><button onClick={()=>reset()} className="mt-8 bg-[#d9ff4f] text-black px-5 py-3 font-semibold">Try again</button></div></main>
}
