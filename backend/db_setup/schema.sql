-- Users/Players Table
CREATE TABLE users (
    u_id SERIAL PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    signup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    c_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

-- Questions Table
CREATE TABLE questions (
    q_id SERIAL PRIMARY KEY,
    q_text TEXT NOT NULL,
    c_id INT NOT NULL REFERENCES categories(c_id) ON DELETE CASCADE,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    difficulty_level INT,
    author VARCHAR(20) CHECK (author IN ('Admin', 'User')) DEFAULT 'User',
    confirmation_status BOOLEAN DEFAULT FALSE
);

-- Game Sessions Table
CREATE TABLE game_sessions (
    s_id SERIAL PRIMARY KEY,
    player1 INT NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    player2 INT NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    game_status VARCHAR(10) CHECK (game_status IN ('ongoing', 'ended')) DEFAULT 'ongoing',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    winner_id INT REFERENCES users(u_id)
);

-- Rounds Table
CREATE TABLE rounds (
    r_id SERIAL PRIMARY KEY,
    s_id INT NOT NULL REFERENCES game_sessions(s_id) ON DELETE CASCADE,
    q_id INT NOT NULL REFERENCES questions(q_id) ON DELETE CASCADE,
    players_answers JSONB,  -- example: {"player1":"A", "player2":"B"}
    round_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add these columns to the rounds table
ALTER TABLE rounds ADD COLUMN round_number INT NOT NULL DEFAULT 1;
ALTER TABLE rounds ADD COLUMN category_selector INT REFERENCES users(u_id);
ALTER TABLE rounds ADD COLUMN selected_category INT REFERENCES categories(c_id);

-- User Stats Table
CREATE TABLE user_stats (
    u_id INT PRIMARY KEY REFERENCES users(u_id) ON DELETE CASCADE,
    game_count INT DEFAULT 0,
    win_count INT DEFAULT 0,
    average_accuracy NUMERIC(5,2) DEFAULT 0,
    xp INT DEFAULT 0
);

-- Banned Users Table
CREATE TABLE banned_users (
    u_id INT PRIMARY KEY REFERENCES users(u_id) ON DELETE CASCADE,
    ban_reason TEXT,
    ban_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- View for leaderboard (Top 10 players by XP, weekly, monthly, overall)
-- Overall leaderboard
CREATE VIEW leaderboard_overall AS
SELECT u.user_name, s.xp, s.win_count, s.game_count,
       CASE WHEN s.game_count > 0 THEN ROUND((s.win_count::NUMERIC / s.game_count * 100), 1) ELSE 0 END as win_ratio
FROM users u
JOIN user_stats s ON u.u_id = s.u_id
WHERE u.u_id NOT IN (SELECT u_id FROM banned_users)
ORDER BY s.xp DESC
LIMIT 10;

-- Weekly leaderboard (games played in last 7 days)
CREATE VIEW leaderboard_weekly AS
SELECT u.user_name, s.xp, s.win_count, s.game_count
FROM users u
JOIN user_stats s ON u.u_id = s.u_id
JOIN game_sessions gs ON (gs.player1 = u.u_id OR gs.player2 = u.u_id)
WHERE u.u_id NOT IN (SELECT u_id FROM banned_users)
  AND gs.start_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY u.user_name, s.xp, s.win_count, s.game_count
ORDER BY s.xp DESC
LIMIT 10;

-- Monthly leaderboard
CREATE VIEW leaderboard_monthly AS
SELECT u.user_name, s.xp, s.win_count, s.game_count
FROM users u
JOIN user_stats s ON u.u_id = s.u_id
JOIN game_sessions gs ON (gs.player1 = u.u_id OR gs.player2 = u.u_id)
WHERE u.u_id NOT IN (SELECT u_id FROM banned_users)
  AND gs.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.user_name, s.xp, s.win_count, s.game_count
ORDER BY s.xp DESC
LIMIT 10;

-- Create new view showing all categories ranked by popularity
CREATE VIEW most_popular_categories AS
SELECT c.category_name, COUNT(*) AS played_count,
       RANK() OVER (ORDER BY COUNT(*) DESC) AS popularity_rank
FROM rounds r
JOIN questions q ON r.q_id = q.q_id
JOIN categories c ON q.c_id = c.c_id
GROUP BY c.c_id, c.category_name
ORDER BY played_count DESC;

-- If you still want just the single most popular category:
CREATE VIEW most_popular_category AS
SELECT c.category_name, COUNT(*) AS played_count
FROM rounds r
JOIN questions q ON r.q_id = q.q_id
JOIN categories c ON q.c_id = c.c_id
GROUP BY c.c_id, c.category_name
ORDER BY played_count DESC
LIMIT 1;
