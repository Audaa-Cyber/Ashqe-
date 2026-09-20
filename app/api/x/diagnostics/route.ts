import { NextResponse } from "next/server"

export async function GET(request:Request){
  const origin=request.nextUrl.origin
  const expected=origin+"/api/x/callback"
  return NextResponse.json({
    configured:{
      clientId:Boolean(process.env.X_CLIENT_ID),
      clientSecret:Boolean(process.env.X_CLIENT_SECRET),
      redirectUri:Boolean(process.env.X_REDIRECT_URI),
      tokenEncryptionKey:Boolean(process.env.X_TOKEN_ENCRYPTION_KEY),
      supabase:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      admin:Boolean(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    expectedRedirectUri:process.env.X_REDIRECT_URI||expected,
    currentOrigin:origin,
    callbackPath:"/api/x/callback",
    note:"This endpoint never returns client secrets or token values."
  })
}
