import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function callOpenRouter(prompt: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://ashqe.app',
      'X-Title': 'Ashqe',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(request: NextRequest) {
  const { user_id } = Object.fromEntries(new URL(request.url).searchParams);

  if (!user_id) {
    return NextResponse.json(
      { error: 'Missing user_id' },
      { status: 400 }
    );
  }

  try {
    // Get user and access token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('x_access_token, x_username')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch last 50 posts from X
    const postsResponse = await fetch(
      'https://api.twitter.com/2/users/me/tweets?max_results=50&tweet.fields=created_at,public_metrics&expansions=author_id',
      {
        headers: {
          Authorization: `Bearer ${user.x_access_token}`,
        },
      }
    );

    if (!postsResponse.ok) {
      throw new Error('Failed to fetch posts from X');
    }

    const postsData = await postsResponse.json();
    const posts = postsData.data || [];

    if (posts.length === 0) {
      // Still create a style profile but with empty analysis
      await supabase.from('style_profiles').insert({
        user_id,
        tone: 'neutral',
        vocabulary: {},
        sentence_structure: {},
        formatting_habits: {},
        common_topics: [],
        analyzed_posts_count: 0,
        raw_analysis: { message: 'No posts found for analysis' },
      });

      return NextResponse.json({
        message: 'No posts found for analysis',
      });
    }

    // Extract post texts
    const postTexts = posts.map((p: any) => p.text).join('\n---\n');

    // Analyze writing style using OpenRouter
    const analysisPrompt = `Analyze the following Twitter posts and provide a detailed structured analysis of the writing style:

${postTexts}

Provide a JSON response with these exact fields:
{
  "tone": "describe the overall tone (e.g., casual, professional, witty, philosophical)",
  "vocabulary_level": "formal/informal/mixed",
  "common_phrases": ["list", "of", "frequently", "used", "phrases"],
  "sentence_length": "short/medium/long",
  "formatting_style": "use of emojis, punctuation, line breaks, etc",
  "common_topics": ["list", "of", "main", "topics"],
  "personality_traits": ["what the voice reveals about the person"],
  "key_characteristics": "summary of the most distinctive writing characteristics"
}`;

    const analysisResult = await callOpenRouter(analysisPrompt);

    let analysis;
    try {
      // Extract JSON from response
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(analysisResult);
    } catch (e) {
      analysis = {
        tone: 'unable to parse',
        raw_text: analysisResult,
      };
    }

    // Store style profile
    const { error: profileError } = await supabase
      .from('style_profiles')
      .upsert(
        {
          user_id,
          tone: analysis.tone || 'neutral',
          vocabulary: {
            level: analysis.vocabulary_level,
            common_phrases: analysis.common_phrases || [],
          },
          sentence_structure: {
            length: analysis.sentence_length,
          },
          formatting_habits: {
            style: analysis.formatting_style,
          },
          common_topics: analysis.common_topics || [],
          analyzed_posts_count: posts.length,
          raw_analysis: analysis,
        },
        { onConflict: 'user_id' }
      );

    if (profileError) {
      throw profileError;
    }

    // Cache the posts
    for (const post of posts) {
      await supabase.from('cached_posts').insert({
        user_id,
        x_post_id: post.id,
        content: post.text,
      });
    }

    return NextResponse.json({
      success: true,
      analyzed_posts: posts.length,
      style_profile: analysis,
    });
  } catch (err) {
    console.error('[Analyze Style] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
