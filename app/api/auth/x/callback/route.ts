import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/connect?error=no_authorization_code', request.url)
    );
  }

  try {
    // Exchange auth code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.X_CLIENT_ID!,
        client_secret: process.env.X_CLIENT_SECRET!,
        redirect_uri: process.env.X_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('[OAuth] Token exchange failed:', error);
      return NextResponse.redirect(
        new URL(
          `/connect?error=${encodeURIComponent(error.error_description || 'Token exchange failed')}`,
          request.url
        )
      );
    }

    const tokenData = await tokenResponse.json();

    // Get user info from X
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await userResponse.json();
    const xUserId = userData.data.id;
    const xUsername = userData.data.username;

    // Check if user exists
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('id')
      .eq('x_user_id', xUserId)
      .single();

    let userId: string;

    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          x_access_token: tokenData.access_token,
          x_refresh_token: tokenData.refresh_token,
          x_token_expires_at: new Date(
            Date.now() + (tokenData.expires_in || 7200) * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('x_user_id', xUserId);

      if (updateError) throw updateError;
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          x_user_id: xUserId,
          x_username: xUsername,
          x_access_token: tokenData.access_token,
          x_refresh_token: tokenData.refresh_token,
          x_token_expires_at: new Date(
            Date.now() + (tokenData.expires_in || 7200) * 1000
          ).toISOString(),
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      userId = newUser.id;

      // Fetch user's posts and analyze style
      try {
        await fetch(
          `${request.nextUrl.origin}/api/analyze-style?user_id=${userId}`,
          { method: 'POST' }
        );
      } catch (analysisError) {
        console.error('[OAuth] Style analysis error:', analysisError);
        // Don't fail the auth flow if analysis fails
      }
    }

    // Redirect to dashboard with session
    const response = NextResponse.redirect(
      new URL('/dashboard', request.url)
    );

    // Set user session cookie
    response.cookies.set('user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    console.error('[OAuth] Error:', err);
    return NextResponse.redirect(
      new URL(
        '/connect?error=' + encodeURIComponent('Authentication failed'),
        request.url
      )
    );
  }
}
