-- ============================================
-- 1. BẢNG NGƯỜI DÙNG (KẾT HỢP VỚI AUTH)
-- ============================================

-- Bảng profiles (mở rộng từ auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_score BIGINT DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  kills INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. BẢNG ĐỘI (TEAMS)
-- ============================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT UNIQUE, -- Ví dụ: [ABC]
  leader_id UUID REFERENCES profiles(id) NOT NULL,
  description TEXT,
  privacy TEXT DEFAULT 'public', -- 'public', 'private', 'password'
  password_hash TEXT, -- Nếu có password
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disbanded_at TIMESTAMP WITH TIME ZONE,
  
  -- Index để tìm kiếm nhanh
  CONSTRAINT teams_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 20)
);

-- ============================================
-- 3. BẢNG THÀNH VIÊN ĐỘI
-- ============================================

CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'leader', 'co-leader', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 4. BẢNG GAME SESSIONS (PHÒNG CHƠI)
-- ============================================

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id INTEGER DEFAULT 1, -- Chỉ có 1 map duy nhất
  max_players INTEGER DEFAULT 50,
  current_players INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  winner_team_id UUID REFERENCES teams(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. BẢNG NGƯỜI CHƠI TRONG GAME
-- ============================================

CREATE TABLE IF NOT EXISTS game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),
  
  -- Thông tin vị trí và trạng thái
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  direction_x FLOAT NOT NULL DEFAULT 1,
  direction_y FLOAT NOT NULL DEFAULT 0,
  speed FLOAT NOT NULL DEFAULT 5.0,
  length INTEGER NOT NULL DEFAULT 3,
  score INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#FF0000',
  
  -- Trạng thái
  is_alive BOOLEAN NOT NULL DEFAULT TRUE,
  is_boosted BOOLEAN NOT NULL DEFAULT FALSE,
  boost_until TIMESTAMP WITH TIME ZONE,
  
  -- Cập nhật thời gian
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  died_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 6. BẢNG THỨC ĂN TRÊN MAP
-- ============================================

CREATE TABLE IF NOT EXISTS foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  type TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'special', 'powerup'
  value INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL DEFAULT '#00FF00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  eaten_at TIMESTAMP WITH TIME ZONE,
  eaten_by UUID REFERENCES game_players(id)
);

-- ============================================
-- 7. BẢNG CẤU HÌNH MAP DUY NHẤT
-- ============================================

CREATE TABLE IF NOT EXISTS map_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  width FLOAT NOT NULL DEFAULT 2000,
  height FLOAT NOT NULL DEFAULT 2000,
  name TEXT NOT NULL DEFAULT 'Main Arena',
  min_food_count INTEGER NOT NULL DEFAULT 100,
  food_spawn_rate INTEGER NOT NULL DEFAULT 10, -- Mỗi giây spawn bao nhiêu
  max_food_count INTEGER NOT NULL DEFAULT 300,
  safe_zone_radius FLOAT NOT NULL DEFAULT 100,
  CHECK (id = 1) -- Đảm bảo chỉ có 1 bản ghi
);

-- ============================================
-- 8. BẢNG LỊCH SỬ TRẬN ĐẤU
-- ============================================

CREATE TABLE IF NOT EXISTS match_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES game_sessions(id),
  user_id UUID REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),
  final_score INTEGER NOT NULL DEFAULT 0,
  final_length INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  time_played INTEGER NOT NULL DEFAULT 0, -- Giây
  position INTEGER, -- Xếp hạng trong trận
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. TẠO CÁC INDEX CHO HIỆU SUẤT
-- ============================================

-- Partial index cho team_members: một user chỉ có thể ở một team cùng lúc
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique_active 
ON team_members (user_id) 
WHERE left_at IS NULL;

-- Index cho truy vấn nhanh team members
CREATE INDEX IF NOT EXISTS idx_team_members_active 
ON team_members (team_id) 
WHERE left_at IS NULL;

-- Index cho game_players
CREATE INDEX IF NOT EXISTS idx_game_players_active 
ON game_players (session_id, is_alive);

CREATE INDEX IF NOT EXISTS idx_game_players_position 
ON game_players (session_id, position_x, position_y);

CREATE INDEX IF NOT EXISTS idx_game_players_user_session 
ON game_players (user_id, session_id);

-- Index cho foods
CREATE INDEX IF NOT EXISTS idx_foods_active 
ON foods (session_id) 
WHERE eaten_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_foods_position 
ON foods (session_id, position_x, position_y);

CREATE INDEX IF NOT EXISTS idx_foods_session 
ON foods (session_id, created_at);

-- Index cho match_history
CREATE INDEX IF NOT EXISTS idx_match_history_user 
ON match_history (user_id);

CREATE INDEX IF NOT EXISTS idx_match_history_session 
ON match_history (session_id);

-- Index cho profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username 
ON profiles (username);

CREATE INDEX IF NOT EXISTS idx_profiles_score 
ON profiles (total_score DESC);

-- Index cho teams
CREATE INDEX IF NOT EXISTS idx_teams_name 
ON teams (name);

CREATE INDEX IF NOT EXISTS idx_teams_leader 
ON teams (leader_id);

-- ============================================
-- 10. BẬT ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. TẠO ROW LEVEL SECURITY POLICIES
-- ============================================

-- Xóa các policies cũ nếu tồn tại
DO $$ 
BEGIN
    -- Policies cho profiles
    DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    
    -- Policies cho teams
    DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
    DROP POLICY IF EXISTS "Team leaders can manage their team" ON teams;
    
    -- Policies cho team_members
    DROP POLICY IF EXISTS "Team members are viewable by everyone" ON team_members;
    DROP POLICY IF EXISTS "Team leaders can manage members" ON team_members;
    DROP POLICY IF EXISTS "Users can join teams" ON team_members;
    
    -- Policies cho game_sessions
    DROP POLICY IF EXISTS "Game sessions are viewable by everyone" ON game_sessions;
    DROP POLICY IF EXISTS "Users can join game sessions" ON game_sessions;
    
    -- Policies cho game_players
    DROP POLICY IF EXISTS "Game players are viewable by everyone" ON game_players;
    DROP POLICY IF EXISTS "Users can update own game player" ON game_players;
    DROP POLICY IF EXISTS "Users can insert own game player" ON game_players;
    
    -- Policies cho foods
    DROP POLICY IF EXISTS "Foods are viewable by everyone" ON foods;
    DROP POLICY IF EXISTS "System can insert foods" ON foods;
    
    -- Policies cho map_config
    DROP POLICY IF EXISTS "Map config is viewable by everyone" ON map_config;
    
    -- Policies cho match_history
    DROP POLICY IF EXISTS "Match history is viewable by everyone" ON match_history;
END $$;

-- 1. Profiles: Người dùng chỉ xem được public info
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. Teams: Ai cũng xem được, chỉ leader mới sửa
CREATE POLICY "Teams are viewable by everyone" 
ON teams FOR SELECT 
USING (true);

CREATE POLICY "Team leaders can manage their team" 
ON teams FOR ALL 
USING (auth.uid() = leader_id);

-- 3. Team members: Xem được, leader quản lý thành viên
CREATE POLICY "Team members are viewable by everyone" 
ON team_members FOR SELECT 
USING (true);

CREATE POLICY "Team leaders can manage members" 
ON team_members FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM teams 
    WHERE teams.id = team_members.team_id 
    AND teams.leader_id = auth.uid()
  )
);

CREATE POLICY "Users can join teams" 
ON team_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Game sessions: Xem được, join tự do
CREATE POLICY "Game sessions are viewable by everyone" 
ON game_sessions FOR SELECT 
USING (true);

CREATE POLICY "Users can join game sessions" 
ON game_sessions FOR INSERT 
WITH CHECK (true);

-- 5. Game players: Xem được, chỉ update chính mình
CREATE POLICY "Game players are viewable by everyone" 
ON game_players FOR SELECT 
USING (true);

CREATE POLICY "Users can update own game player" 
ON game_players FOR UPDATE 
USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can insert own game player" 
ON game_players FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

-- 6. Foods: Chỉ xem, chỉ system mới insert
CREATE POLICY "Foods are viewable by everyone" 
ON foods FOR SELECT 
USING (true);

CREATE POLICY "System can insert foods" 
ON foods FOR INSERT 
WITH CHECK (true);

-- 7. Map config: Chỉ đọc
CREATE POLICY "Map config is viewable by everyone" 
ON map_config FOR SELECT 
USING (true);

-- 8. Match history: Ai cũng xem được
CREATE POLICY "Match history is viewable by everyone" 
ON match_history FOR SELECT 
USING (true);

-- ============================================
-- 12. FUNCTIONS VÀ TRIGGERS
-- ============================================

-- Hàm spawn player ngẫu nhiên
CREATE OR REPLACE FUNCTION spawn_player_randomly(
  p_user_id UUID,
  p_session_id UUID,
  p_team_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_map_width FLOAT;
  v_map_height FLOAT;
  v_safe_radius FLOAT;
  v_pos_x FLOAT;
  v_pos_y FLOAT;
  v_attempts INTEGER := 0;
  v_color TEXT;
  v_is_safe BOOLEAN := FALSE;
BEGIN
  -- Lấy thông tin map
  SELECT width, height, safe_zone_radius 
  INTO v_map_width, v_map_height, v_safe_radius
  FROM map_config WHERE id = 1;
  
  -- Random màu (trừ màu đặc biệt)
  v_color := '#' || substr(md5(random()::text), 1, 6);
  
  -- Tìm vị trí an toàn (không có player khác trong radius)
  WHILE NOT v_is_safe AND v_attempts < 50 LOOP
    v_pos_x := random() * v_map_width;
    v_pos_y := random() * v_map_height;
    
    -- Kiểm tra xem có player nào trong safe radius không
    IF NOT EXISTS (
      SELECT 1 FROM game_players gp
      WHERE gp.session_id = p_session_id
        AND gp.is_alive = true
        AND SQRT(POWER(gp.position_x - v_pos_x, 2) + POWER(gp.position_y - v_pos_y, 2)) < v_safe_radius
    ) THEN
      v_is_safe := TRUE;
    END IF;
    
    v_attempts := v_attempts + 1;
  END LOOP;
  
  -- Nếu không tìm được vị trí an toàn, spawn bất kỳ
  IF NOT v_is_safe THEN
    v_pos_x := random() * v_map_width;
    v_pos_y := random() * v_map_height;
  END IF;
  
  -- Tạo player mới
  INSERT INTO game_players (
    session_id, user_id, team_id,
    position_x, position_y,
    color
  ) VALUES (
    p_session_id, p_user_id, p_team_id,
    v_pos_x, v_pos_y,
    v_color
  ) RETURNING id INTO v_player_id;
  
  -- Tăng số player trong session
  UPDATE game_sessions 
  SET current_players = current_players + 1
  WHERE id = p_session_id;
  
  RETURN v_player_id;
END;
$$ LANGUAGE plpgsql;

-- Hàm spawn thức ăn tự động
CREATE OR REPLACE FUNCTION auto_spawn_food()
RETURNS TRIGGER AS $$
DECLARE
  v_map_width FLOAT;
  v_map_height FLOAT;
  v_min_food INTEGER;
  v_current_food INTEGER;
  v_foods_needed INTEGER;
  i INTEGER;
BEGIN
  -- Lấy thông tin map
  SELECT width, height, min_food_count 
  INTO v_map_width, v_map_height, v_min_food
  FROM map_config WHERE id = 1;
  
  -- Đếm thức ăn hiện có
  SELECT COUNT(*) INTO v_current_food
  FROM foods 
  WHERE session_id = NEW.id 
    AND eaten_at IS NULL;
  
  -- Tính số thức ăn cần spawn
  v_foods_needed := GREATEST(v_min_food - v_current_food, 0);
  
  -- Spawn thức ăn
  FOR i IN 1..v_foods_needed LOOP
    INSERT INTO foods (
      session_id,
      position_x,
      position_y,
      type,
      value,
      color
    ) VALUES (
      NEW.id,
      random() * v_map_width,
      random() * v_map_height,
      CASE 
        WHEN random() < 0.1 THEN 'special'
        ELSE 'normal'
      END,
      CASE 
        WHEN random() < 0.1 THEN 5
        ELSE 1
      END,
      CASE 
        WHEN random() < 0.1 THEN '#FFD700' -- Vàng cho special
        ELSE '#00FF00' -- Xanh cho normal
      END
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Khi tạo session mới, tự động spawn thức ăn
DROP TRIGGER IF EXISTS spawn_initial_food ON game_sessions;
CREATE TRIGGER spawn_initial_food
  AFTER INSERT ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_spawn_food();

-- Hàm kiểm tra và xử lý ăn thức ăn
CREATE OR REPLACE FUNCTION check_food_collision(
  p_player_id UUID,
  p_player_x FLOAT,
  p_player_y FLOAT
)
RETURNS TABLE(food_id UUID, food_value INTEGER, food_type TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.value,
    f.type
  FROM foods f
  WHERE f.eaten_at IS NULL
    AND SQRT(POWER(f.position_x - p_player_x, 2) + POWER(f.position_y - p_player_y, 2)) < 10 -- Collision radius
  FOR UPDATE SKIP LOCKED; -- Tránh race condition
  
  -- Đánh dấu thức ăn đã bị ăn
  UPDATE foods
  SET eaten_at = NOW(),
      eaten_by = p_player_id
  WHERE id IN (
    SELECT f.id
    FROM foods f
    WHERE f.eaten_at IS NULL
      AND SQRT(POWER(f.position_x - p_player_x, 2) + POWER(f.position_y - p_player_y, 2)) < 10
  );
END;
$$ LANGUAGE plpgsql;

-- Hàm tự động spawn thức ăn định kỳ
CREATE OR REPLACE FUNCTION periodic_food_spawn()
RETURNS void AS $$
DECLARE
  v_session RECORD;
  v_map_width FLOAT;
  v_map_height FLOAT;
  v_min_food INTEGER;
  v_current_food INTEGER;
  v_foods_needed INTEGER;
  i INTEGER;
BEGIN
  -- Lấy thông tin map
  SELECT width, height, min_food_count 
  INTO v_map_width, v_map_height, v_min_food
  FROM map_config WHERE id = 1;
  
  -- Duyệt qua các session đang chơi
  FOR v_session IN SELECT id FROM game_sessions WHERE status = 'playing' LOOP
    -- Đếm thức ăn hiện có
    SELECT COUNT(*) INTO v_current_food
    FROM foods 
    WHERE session_id = v_session.id 
      AND eaten_at IS NULL;
    
    -- Tính số thức ăn cần spawn
    v_foods_needed := GREATEST(v_min_food - v_current_food, 0);
    
    -- Spawn thức ăn (tối đa 10 mỗi lần)
    v_foods_needed := LEAST(v_foods_needed, 10);
    
    FOR i IN 1..v_foods_needed LOOP
      INSERT INTO foods (
        session_id,
        position_x,
        position_y,
        type,
        value,
        color
      ) VALUES (
        v_session.id,
        random() * v_map_width,
        random() * v_map_height,
        CASE 
          WHEN random() < 0.1 THEN 'special'
          ELSE 'normal'
        END,
        CASE 
          WHEN random() < 0.1 THEN 5
          ELSE 1
        END,
        CASE 
          WHEN random() < 0.1 THEN '#FFD700'
          ELSE '#00FF00'
        END
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Hàm xóa player không hoạt động
CREATE OR REPLACE FUNCTION cleanup_inactive_players()
RETURNS void AS $$
BEGIN
  UPDATE game_players
  SET is_alive = false
  WHERE last_updated < NOW() - INTERVAL '30 seconds'
    AND is_alive = true;
END;
$$ LANGUAGE plpgsql;

-- Hàm giảm số player trong session
CREATE OR REPLACE FUNCTION decrement_session_players(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE game_sessions 
  SET current_players = GREATEST(current_players - 1, 0)
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. INSERT DỮ LIỆU MẪU
-- ============================================

-- Chèn cấu hình map mặc định
INSERT INTO map_config (id, width, height, name, min_food_count, food_spawn_rate, max_food_count, safe_zone_radius)
VALUES (1, 2000, 2000, 'Main Arena', 100, 10, 300, 100)
ON CONFLICT (id) DO UPDATE SET
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  name = EXCLUDED.name,
  min_food_count = EXCLUDED.min_food_count,
  food_spawn_rate = EXCLUDED.food_spawn_rate,
  max_food_count = EXCLUDED.max_food_count,
  safe_zone_radius = EXCLUDED.safe_zone_radius;

-- ============================================
-- 14. BỔ SUNG THÊM FUNCTIONS CẦN THIẾT
-- ============================================

-- Function kiểm tra và xử lý va chạm giữa players
CREATE OR REPLACE FUNCTION check_player_collision(
  p_player_id UUID,
  p_player_x FLOAT,
  p_player_y FLOAT
)
RETURNS TABLE(
  collided_player_id UUID,
  collided_team_id UUID,
  is_teammate BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.id,
    gp.team_id,
    gp.team_id = (SELECT team_id FROM game_players WHERE id = p_player_id)
  FROM game_players gp
  WHERE gp.id != p_player_id
    AND gp.is_alive = true
    AND SQRT(POWER(gp.position_x - p_player_x, 2) + POWER(gp.position_y - p_player_y, 2)) < 20 -- Collision radius
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function lấy thông tin players trong khu vực
CREATE OR REPLACE FUNCTION get_players_in_area(
  p_session_id UUID,
  p_center_x FLOAT,
  p_center_y FLOAT,
  p_radius FLOAT
)
RETURNS TABLE(
  player_id UUID,
  username TEXT,
  team_id UUID,
  position_x FLOAT,
  position_y FLOAT,
  score INTEGER,
  length INTEGER,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.id,
    p.username,
    gp.team_id,
    gp.position_x,
    gp.position_y,
    gp.score,
    gp.length,
    gp.color
  FROM game_players gp
  JOIN profiles p ON gp.user_id = p.id
  WHERE gp.session_id = p_session_id
    AND gp.is_alive = true
    AND SQRT(POWER(gp.position_x - p_center_x, 2) + POWER(gp.position_y - p_center_y, 2)) < p_radius
  ORDER BY gp.score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function lấy top players
CREATE OR REPLACE FUNCTION get_top_players(p_session_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  rank INTEGER,
  player_id UUID,
  username TEXT,
  team_id UUID,
  score INTEGER,
  length INTEGER,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY gp.score DESC)::INTEGER as rank,
    gp.id,
    p.username,
    gp.team_id,
    gp.score,
    gp.length,
    gp.color
  FROM game_players gp
  JOIN profiles p ON gp.user_id = p.id
  WHERE gp.session_id = p_session_id
    AND gp.is_alive = true
  ORDER BY gp.score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;