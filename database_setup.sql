-- Create tables for Snake Game

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    high_score INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    total_play_time INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Snake customizations
CREATE TABLE IF NOT EXISTS snake_customizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    color_primary TEXT DEFAULT '#48bb78',
    color_secondary TEXT DEFAULT '#38a169',
    pattern TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    snake_length INTEGER NOT NULL,
    game_time INTEGER NOT NULL,
    food_eaten INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Weekly leaderboard
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    week_start DATE NOT NULL,
    UNIQUE(user_id, week_start)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('global', 'game', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, friend_id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE snake_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Everyone can read, users can update their own
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Snake customizations: Everyone can read, users can manage their own
CREATE POLICY "Snake customizations are viewable by everyone" 
    ON snake_customizations FOR SELECT USING (true);

CREATE POLICY "Users can manage own snake customization" 
    ON snake_customizations FOR ALL USING (auth.uid() = user_id);

-- Game sessions: Everyone can read, users can insert their own
CREATE POLICY "Game sessions are viewable by everyone" 
    ON game_sessions FOR SELECT USING (true);

CREATE POLICY "Users can insert own game sessions" 
    ON game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Weekly leaderboard: Everyone can read
CREATE POLICY "Weekly leaderboard is viewable by everyone" 
    ON weekly_leaderboard FOR SELECT USING (true);

-- Chat messages: Users can insert their own, read based on type
CREATE POLICY "Users can insert own chat messages" 
    ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Global chat messages are viewable by everyone" 
    ON chat_messages FOR SELECT USING (type = 'global');

-- Friendships: Users can manage their own relationships
CREATE POLICY "Users can manage own friendships" 
    ON friendships FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Achievements: Everyone can read
CREATE POLICY "Achievements are viewable by everyone" 
    ON achievements FOR SELECT USING (true);

-- Functions and Triggers

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user_snake()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.raw_user_meta_data->>'avatar_url' IS NOT NULL 
            THEN NEW.raw_user_meta_data->>'avatar_url'
            ELSE 'https://ui-avatars.com/api/?name=' || 
                 encode_hex(NEW.id::text::bytea) || 
                 '&background=random'
        END
    );
    
    INSERT INTO public.snake_customizations (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_snake();

-- Function to update user high score
CREATE OR REPLACE FUNCTION update_user_high_score_snake()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table
    UPDATE profiles 
    SET 
        high_score = GREATEST(high_score, NEW.score),
        total_games = total_games + 1,
        total_play_time = total_play_time + NEW.game_time,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Update weekly leaderboard
    INSERT INTO weekly_leaderboard (user_id, score, week_start)
    VALUES (
        NEW.user_id,
        NEW.score,
        DATE_TRUNC('week', NEW.created_at)
    )
    ON CONFLICT (user_id, week_start) 
    DO UPDATE SET score = GREATEST(weekly_leaderboard.score, EXCLUDED.score);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update high score after game session
DROP TRIGGER IF EXISTS on_game_session_created ON game_sessions;
CREATE TRIGGER on_game_session_created
    AFTER INSERT ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_user_high_score_snake();

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements_snake(user_uuid UUID, game_score INTEGER, snake_len INTEGER, food_count INTEGER)
RETURNS VOID AS $$
BEGIN
    -- First Game Achievement
    IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = user_uuid AND achievement_id = 'first_game') THEN
        INSERT INTO achievements (user_id, achievement_id, name, description)
        VALUES (user_uuid, 'first_game', 'Game On!', 'Play your first game');
    END IF;
    
    -- Score-based achievements
    IF game_score >= 100 AND NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = user_uuid AND achievement_id = 'score_100') THEN
        INSERT INTO achievements (user_id, achievement_id, name, description)
        VALUES (user_uuid, 'score_100', 'Centurion', 'Score 100 points in a single game');
    END IF;
    
    IF game_score >= 500 AND NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = user_uuid AND achievement_id = 'score_500') THEN
        INSERT INTO achievements (user_id, achievement_id, name, description)
        VALUES (user_uuid, 'score_500', 'Master Slitherer', 'Score 500 points in a single game');
    END IF;
    
    -- Length-based achievements
    IF snake_len >= 20 AND NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = user_uuid AND achievement_id = 'length_20') THEN
        INSERT INTO achievements (user_id, achievement_id, name, description)
        VALUES (user_uuid, 'length_20', 'Long Boi', 'Grow your snake to 20 segments');
    END IF;
    
    -- Food-based achievements
    IF food_count >= 10 AND NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = user_uuid AND achievement_id = 'food_10') THEN
        INSERT INTO achievements (user_id, achievement_id, name, description)
        VALUES (user_uuid, 'food_10', 'Hungry Snake', 'Eat 10 food items in a single game');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_high_score ON profiles(high_score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON game_sessions(score DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_week_score ON weekly_leaderboard(week_start DESC, score DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);