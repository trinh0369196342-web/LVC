-- ====================
-- SUPABASE DATABASE SETUP
-- ====================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================
-- PROFILES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    high_score INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    total_play_time INTEGER DEFAULT 0,
    map_explored INTEGER DEFAULT 0,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- SNAKE CUSTOMIZATIONS
-- ====================
CREATE TABLE IF NOT EXISTS snake_customizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    color_primary TEXT DEFAULT '#00adb5',
    color_secondary TEXT DEFAULT '#34495e',
    pattern TEXT DEFAULT 'solid',
    accessories JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ====================
-- GAME SESSIONS
-- ====================
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    snake_length INTEGER NOT NULL,
    game_time INTEGER NOT NULL,
    map_explored INTEGER DEFAULT 0,
    food_eaten INTEGER DEFAULT 0,
    obstacles_hit INTEGER DEFAULT 0,
    boost_used INTEGER DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- CHAT MESSAGES
-- ====================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('global', 'game', 'private', 'system')),
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- FRIENDSHIPS
-- ====================
CREATE TABLE IF NOT EXISTS friendships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- ====================
-- LEADERBOARD (Weekly)
-- ====================
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    week_start DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- ====================
-- ACHIEVEMENTS
-- ====================
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- ====================
-- INDEXES
-- ====================
CREATE INDEX IF NOT EXISTS idx_profiles_high_score ON profiles(high_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON game_sessions(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type_created_at ON chat_messages(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_week_score ON weekly_leaderboard(week_start DESC, score DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);

-- ====================
-- ROW LEVEL SECURITY
-- ====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE snake_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- ====================
-- RLS POLICIES
-- ====================

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Snake Customizations: Users can read all, but only modify own
CREATE POLICY "Snake customizations are viewable by everyone" ON snake_customizations
    FOR SELECT USING (true);

CREATE POLICY "Users can update own snake customization" ON snake_customizations
    FOR ALL USING (auth.uid() = user_id);

-- Game Sessions: Users can read all, but only insert/update own
CREATE POLICY "Game sessions are viewable by everyone" ON game_sessions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own game sessions" ON game_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat Messages: Users can read global/game messages, private only between users
CREATE POLICY "Global and game chat messages are viewable by everyone" ON chat_messages
    FOR SELECT USING (type IN ('global', 'game', 'system'));

CREATE POLICY "Private messages are viewable by participants" ON chat_messages
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (type = 'private' AND auth.uid() = recipient_id)
    );

CREATE POLICY "Users can insert chat messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Friendships: Users can only see their own friendships
CREATE POLICY "Users can see own friendships" ON friendships
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Weekly Leaderboard: Readable by everyone
CREATE POLICY "Leaderboard is viewable by everyone" ON weekly_leaderboard
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own leaderboard entries" ON weekly_leaderboard
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements: Readable by everyone
CREATE POLICY "Achievements are viewable by everyone" ON achievements
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own achievements" ON achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ====================
-- FUNCTIONS & TRIGGERS
-- ====================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_snake_customizations_updated_at BEFORE UPDATE ON snake_customizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, username, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'username',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || (NEW.raw_user_meta_data->>'username')
    );
    
    -- Create default snake customization
    INSERT INTO snake_customizations (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update high score in profiles when game session ends
CREATE OR REPLACE FUNCTION update_user_high_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.score > 0 THEN
        UPDATE profiles
        SET 
            high_score = GREATEST(high_score, NEW.score),
            total_games = total_games + 1,
            total_play_time = total_play_time + NEW.game_time,
            map_explored = map_explored + NEW.map_explored,
            last_seen = NOW()
        WHERE id = NEW.user_id;
        
        -- Update weekly leaderboard
        INSERT INTO weekly_leaderboard (user_id, score, week_start)
        VALUES (
            NEW.user_id,
            NEW.score,
            DATE_TRUNC('week', NOW())::DATE
        )
        ON CONFLICT (user_id, week_start) 
        DO UPDATE SET 
            score = GREATEST(weekly_leaderboard.score, NEW.score),
            created_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_game_session_completed AFTER UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_user_high_score();

-- ====================
-- VIEWS
-- ====================

-- Online users view
CREATE OR REPLACE VIEW online_users AS
SELECT 
    id,
    username,
    avatar_url,
    high_score,
    last_seen,
    CASE 
        WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 'online'
        WHEN last_seen > NOW() - INTERVAL '1 hour' THEN 'away'
        ELSE 'offline'
    END as status
FROM profiles
ORDER BY 
    CASE 
        WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 1
        WHEN last_seen > NOW() - INTERVAL '1 hour' THEN 2
        ELSE 3
    END,
    high_score DESC;

-- Global leaderboard view
CREATE OR REPLACE VIEW global_leaderboard AS
SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.high_score,
    p.total_games,
    RANK() OVER (ORDER BY p.high_score DESC) as rank
FROM profiles p
WHERE p.high_score > 0
ORDER BY p.high_score DESC
LIMIT 100;

-- Weekly leaderboard view
CREATE OR REPLACE VIEW current_weekly_leaderboard AS
SELECT 
    w.user_id,
    p.username,
    p.avatar_url,
    w.score,
    RANK() OVER (ORDER BY w.score DESC) as rank,
    w.week_start
FROM weekly_leaderboard w
JOIN profiles p ON p.id = w.user_id
WHERE w.week_start = DATE_TRUNC('week', NOW())::DATE
ORDER BY w.score DESC
LIMIT 50;

-- Recent chat messages view
CREATE OR REPLACE VIEW recent_chat_messages AS
SELECT 
    cm.*,
    p.username,
    p.avatar_url
FROM chat_messages cm
JOIN profiles p ON p.id = cm.user_id
WHERE cm.type IN ('global', 'game', 'system')
ORDER BY cm.created_at DESC
LIMIT 100;

-- ====================
-- SAMPLE DATA
-- ====================
INSERT INTO achievements (achievement_id, name, description, icon_url) VALUES
    ('first_game', 'Trò chơi đầu tiên', 'Hoàn thành trò chơi đầu tiên', '🏆'),
    ('score_100', '100 điểm', 'Đạt 100 điểm trong một trò chơi', '⭐'),
    ('score_500', '500 điểm', 'Đạt 500 điểm trong một trò chơi', '🌟'),
    ('score_1000', '1000 điểm', 'Đạt 1000 điểm trong một trò chơi', '💎'),
    ('snake_length_10', 'Rắn dài', 'Đạt độ dài rắn 10', '🐍'),
    ('snake_length_50', 'Rắn khổng lồ', 'Đạt độ dài rắn 50', '🐉'),
    ('explorer', 'Nhà thám hiểm', 'Khám phá 50% bản đồ', '🗺️'),
    ('food_master', 'Bậc thầy thức ăn', 'Ăn 1000 thức ăn', '🍎'),
    ('speed_demon', 'Quỷ tốc độ', 'Sử dụng tăng tốc 100 lần', '⚡'),
    ('social_butterfly', 'Bướm xã hội', 'Gửi 100 tin nhắn chat', '💬')
ON CONFLICT DO NOTHING;