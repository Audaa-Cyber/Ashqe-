import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) return NextResponse.json({ok:false},{status:401})
  const update = await request.json(), message = update.message, chatId = message?.chat?.id
  if (!chatId) return NextResponse.json({ok:true})
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ok:true})
  const text = String(message?.text || "").trim()
  const reply = text === "/brief"
    ? "Ashqe: your scheduled intelligence brief is queued. Connect the AI provider and scheduler to enable live research."
    : "Ashqe is online. Try /brief."
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text:reply})})
  return NextResponse.json({ok:true})
}
