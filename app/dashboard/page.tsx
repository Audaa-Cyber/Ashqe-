'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [styleProfile, setStyleProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          const data = await response.json();
          setUserData(data.user);
          setStyleProfile(data.styleProfile);
          setIsAuthenticated(true);
        } else {
          router.push('/connect');
        }
      } catch (err) {
        console.error('[Dashboard] Auth check error:', err);
        router.push('/connect');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const userInput = inputValue;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          conversation_id: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      const messageId = (Date.now() + 1).toString();
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.delta) {
                assistantMessage += parsed.delta;

                if (isFirstChunk) {
                  // Add initial message
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: messageId,
                      role: 'assistant',
                      content: assistantMessage,
                      createdAt: new Date(),
                    },
                  ]);
                  isFirstChunk = false;
                } else {
                  // Update message with new content
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMessage = updated[updated.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content = assistantMessage;
                    }
                    return updated;
                  });
                }
              }
            } catch {
              // Skip parsing errors
            }
          }
        }
      }
    } catch (err) {
      console.error('[Chat] Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-foreground border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            Ashqe
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="font-semibold">@{userData?.x_username || 'user'}</p>
              <p className="text-muted-foreground">Voice trained</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                document.cookie = 'user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
                router.push('/');
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Chat area */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col border-border bg-background">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div className="space-y-4">
                    <p className="text-xl font-semibold text-foreground">
                      Start writing with your personal agent
                    </p>
                    <p className="text-muted-foreground max-w-xs">
                      Tell your agent what you want to say. It writes posts that sound like you.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-foreground text-background'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="What do you want to write about?"
                  disabled={isStreaming}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50"
                />
                <Button
                  type="submit"
                  disabled={isStreaming || !inputValue.trim()}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {isStreaming ? 'Sending...' : 'Send'}
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Style profile */}
          {styleProfile && (
            <Card className="p-6 border-border bg-secondary/50">
              <h3 className="font-semibold text-foreground mb-4">Your Voice</h3>
              <div className="space-y-3 text-sm">
                {styleProfile.raw_analysis?.tone && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Tone</p>
                    <p className="text-foreground font-medium">
                      {styleProfile.raw_analysis.tone}
                    </p>
                  </div>
                )}
                {styleProfile.raw_analysis?.sentence_length && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Style</p>
                    <p className="text-foreground font-medium">
                      {styleProfile.raw_analysis.sentence_length}
                    </p>
                  </div>
                )}
                {styleProfile.analyzed_posts_count > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Trained on</p>
                    <p className="text-foreground font-medium">
                      {styleProfile.analyzed_posts_count} posts
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick actions */}
          <Card className="p-6 border-border bg-background">
            <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => setInputValue('Write a post about my latest project')}
              >
                New post
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => setInputValue('Make this more casual')}
              >
                Rewrite
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => setInputValue('Create a thread about')}
              >
                New thread
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
