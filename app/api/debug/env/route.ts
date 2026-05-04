import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET

  return NextResponse.json({
    x_client_id_set: !!clientId,
    x_client_id_length: clientId?.length ?? 0,
    x_client_secret_set: !!clientSecret,
    x_client_secret_length: clientSecret?.length ?? 0,
  })
}
