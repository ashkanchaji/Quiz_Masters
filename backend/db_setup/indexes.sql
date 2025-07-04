-- Indexes to speed up queries
CREATE INDEX idx_questions_category ON questions(c_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(game_status);
CREATE INDEX idx_rounds_game ON rounds(s_id);
CREATE INDEX idx_user_stats_xp ON user_stats(xp DESC);
