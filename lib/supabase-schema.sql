-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x_user_id TEXT UNIQUE NOT NULL,
  x_username TEXT NOT NULL,
  x_access_token TEXT NOT NULL ENCRYPTED,
  x_refresh_token TEXT ENCRYPTED,
  x_token_expires_at TIMESTAMP,
  style_profile JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Style profiles table (stores analyzed voice data)
CREATE TABLE IF NOT EXISTS style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tone TEXT,
  vocabulary JSONB,
  sentence_structure JSONB,
  formatting_habits JSONB,
  common_topics JSONB,
  analyzed_posts_count INTEGER DEFAULT 0,
  raw_analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table (stores chat history)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Drafts table (stores generated posts before publishing)
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  prompt TEXT,
  published BOOLEAN DEFAULT FALSE,
  published_x_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Raw posts cache (for style analysis)
CREATE TABLE IF NOT EXISTS cached_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  x_post_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own profiles" ON style_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own drafts" ON drafts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create drafts" ON drafts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own drafts" ON drafts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own drafts" ON drafts FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view own cached posts" ON cached_posts FOR SELECT USING (user_id = auth.uid());
