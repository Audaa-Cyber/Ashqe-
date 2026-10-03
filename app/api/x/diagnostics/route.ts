import { NextResponse, type NextRequest } from "next/server"
import { availablePublicIndexers } from "@/lib/x/public-indexers"

export async function GET(request:NextRequest){
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
      publicDataIndexer:true,
      publicDataIndexerKey:Boolean(process.env.ASHQE_X_PUBLIC_DATA_KEY),
    },
    expectedRedirectUri:process.env.X_REDIRECT_URI||expected,
    currentOrigin:origin,
    callbackPath:"/api/x/callback",
    publicDataProviders:availablePublicIndexers(),
    note:"Public X reads use public-data indexers. OAuth is retained only for account identity and write actions; this endpoint never returns client secrets or token values."
  })
}
