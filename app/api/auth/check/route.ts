import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, x_user_id, x_username')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get style profile
    const { data: styleProfile } = await supabase
      .from('style_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      user,
      styleProfile,
    });
  } catch (err) {
    console.error('[Auth Check] Error:', err);
    return NextResponse.json(
      { error: 'Auth check failed' },
      { status: 500 }
    );
  }
}
