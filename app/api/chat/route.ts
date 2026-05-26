import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { streamText } from 'ai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function callOpenRouter(messages: any[], systemPrompt: string) {
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
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 500,
      temperature: 0.9,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenRouter API error');
  }

  return response;
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get('user_id')?.value;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { message, conversation_id } = await request.json();

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Get user's style profile
    const { data: styleProfile } = await supabase
      .from('style_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ user_id: userId, messages: [] })
        .select('id')
        .single();
      convId = newConv?.id;
    }

    // Get conversation history
    const { data: conv } = await supabase
      .from('conversations')
      .select('messages')
      .eq('id', convId)
      .single();

    const conversationHistory = conv?.messages || [];

    // Build style profile context
    const styleContext = styleProfile
      ? `The user's writing style:
- Tone: ${styleProfile.raw_analysis?.tone || 'conversational'}
- Common phrases: ${styleProfile.raw_analysis?.common_phrases?.join(', ') || 'none'}
- Sentence length: ${styleProfile.raw_analysis?.sentence_length || 'medium'}
- Formatting: ${styleProfile.raw_analysis?.formatting_style || 'standard'}
- Personality: ${styleProfile.raw_analysis?.personality_traits?.join(', ') || 'genuine, engaging'}
- Key characteristic: ${styleProfile.raw_analysis?.key_characteristics || 'authentic voice'}`
      : 'Write in an authentic, engaging voice';

    // System prompt for the agent
    const systemPrompt = `You are an AI agent that helps write posts in the exact voice and style of the user. You have been trained on their previous posts.

${styleContext}

When the user describes what they want to say, write a post that sounds exactly like them. Keep it concise, engaging, and authentic to their voice. If they ask for a draft, provide just the post text (no explanations or meta-commentary). If they ask questions, answer as their agent would.`;

    // Format conversation for API
    const formattedMessages = conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));
    formattedMessages.push({ role: 'user', content: message });

    // Call OpenRouter API with streaming
    const apiResponse = await callOpenRouter(
      formattedMessages,
      systemPrompt
    );

    // Handle streaming response
    if (!apiResponse.body) {
      throw new Error('No response body');
    }

    const encoder = new TextEncoder();
    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder();

    let fullContent = '';
    let buffer = '';

    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Save final message to database
              const updatedMessages = [
                ...formattedMessages,
                { role: 'assistant', content: fullContent },
              ];
              await supabase
                .from('conversations')
                .update({ messages: updatedMessages })
                .eq('id', convId);

              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                const data = trimmed.slice(5).trim();
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices[0]?.delta?.content;
                  if (delta) {
                    fullContent += delta;
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: 'text-delta', delta })}\n\n`
                      )
                    );
                  }
                } catch {
                  // Skip parsing errors
                }
              }
            }
          }
        } catch (error) {
          console.error('[Chat] Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[Chat] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Chat failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
