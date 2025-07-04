-- Function to update user_stats after a round (only when answers are submitted)
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    p1_id INT;
    p2_id INT;
    p1_answer CHAR(1);
    p2_answer CHAR(1);
    correct CHAR(1);
    p1_correct BOOLEAN;
    p2_correct BOOLEAN;
    total_questions_p1 INT;
    total_questions_p2 INT;
    correct_answers_p1 INT;
    correct_answers_p2 INT;
BEGIN
    -- Only process if answers are being added (UPDATE with players_answers)
    IF TG_OP = 'UPDATE' AND NEW.players_answers IS NOT NULL AND OLD.players_answers IS NULL THEN
        -- Get player IDs from game_sessions
        SELECT player1, player2 INTO p1_id, p2_id FROM game_sessions WHERE s_id = NEW.s_id;

        -- Get correct answer
        SELECT correct_answer INTO correct FROM questions WHERE q_id = NEW.q_id;

        -- Get answers
        p1_answer := NEW.players_answers ->> 'player1';
        p2_answer := NEW.players_answers ->> 'player2';

        -- Check correctness
        p1_correct := (p1_answer = correct);
        p2_correct := (p2_answer = correct);

        -- Count total questions answered by each player across all games
        SELECT COUNT(*) INTO total_questions_p1
        FROM rounds r
        JOIN game_sessions gs ON r.s_id = gs.s_id
        WHERE (gs.player1 = p1_id OR gs.player2 = p1_id) 
        AND r.players_answers IS NOT NULL;

        SELECT COUNT(*) INTO total_questions_p2
        FROM rounds r
        JOIN game_sessions gs ON r.s_id = gs.s_id
        WHERE (gs.player1 = p2_id OR gs.player2 = p2_id) 
        AND r.players_answers IS NOT NULL;

        -- Count correct answers by each player across all games
        SELECT COUNT(*) INTO correct_answers_p1
        FROM rounds r
        JOIN game_sessions gs ON r.s_id = gs.s_id
        JOIN questions q ON r.q_id = q.q_id
        WHERE (gs.player1 = p1_id OR gs.player2 = p1_id) 
        AND r.players_answers IS NOT NULL
        AND ((gs.player1 = p1_id AND r.players_answers ->> 'player1' = q.correct_answer)
             OR (gs.player2 = p1_id AND r.players_answers ->> 'player2' = q.correct_answer));

        SELECT COUNT(*) INTO correct_answers_p2
        FROM rounds r
        JOIN game_sessions gs ON r.s_id = gs.s_id
        JOIN questions q ON r.q_id = q.q_id
        WHERE (gs.player1 = p2_id OR gs.player2 = p2_id) 
        AND r.players_answers IS NOT NULL
        AND ((gs.player1 = p2_id AND r.players_answers ->> 'player1' = q.correct_answer)
             OR (gs.player2 = p2_id AND r.players_answers ->> 'player2' = q.correct_answer));

        -- Update stats for player1
        UPDATE user_stats
        SET average_accuracy = CASE 
                                 WHEN total_questions_p1 > 0 
                                 THEN ROUND((correct_answers_p1::NUMERIC / total_questions_p1 * 100), 2)
                                 ELSE 0 
                               END,
            xp = xp + (CASE WHEN p1_correct THEN 10 ELSE 0 END)
        WHERE u_id = p1_id;

        -- Update stats for player2
        UPDATE user_stats
        SET average_accuracy = CASE 
                                 WHEN total_questions_p2 > 0 
                                 THEN ROUND((correct_answers_p2::NUMERIC / total_questions_p2 * 100), 2)
                                 ELSE 0 
                               END,
            xp = xp + (CASE WHEN p2_correct THEN 10 ELSE 0 END)
        WHERE u_id = p2_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rounds table (on UPDATE when answers are submitted)
DROP TRIGGER IF EXISTS trg_update_user_stats ON rounds;
CREATE TRIGGER trg_update_user_stats
AFTER UPDATE ON rounds
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

-- Function to determine winner after 5 rounds and update game stats
CREATE OR REPLACE FUNCTION update_game_winner()
RETURNS TRIGGER AS $$
DECLARE
    p1_id INT;
    p2_id INT;
    p1_score INT;
    p2_score INT;
    rounds_count INT;
BEGIN
    -- Only process when answers are submitted
    IF TG_OP = 'UPDATE' AND NEW.players_answers IS NOT NULL AND OLD.players_answers IS NULL THEN
        -- Check how many rounds have answers
        SELECT COUNT(*) INTO rounds_count 
        FROM rounds 
        WHERE s_id = NEW.s_id AND players_answers IS NOT NULL;

        -- Only run after 5 rounds with answers
        IF rounds_count = 5 THEN
            -- Get player IDs
            SELECT player1, player2 INTO p1_id, p2_id FROM game_sessions WHERE s_id = NEW.s_id;

            -- Count correct answers for each player
            SELECT COUNT(*) INTO p1_score
            FROM rounds r
            JOIN questions q ON r.q_id = q.q_id
            WHERE r.s_id = NEW.s_id 
            AND r.players_answers IS NOT NULL
            AND r.players_answers ->> 'player1' = q.correct_answer;

            SELECT COUNT(*) INTO p2_score
            FROM rounds r
            JOIN questions q ON r.q_id = q.q_id
            WHERE r.s_id = NEW.s_id 
            AND r.players_answers IS NOT NULL
            AND r.players_answers ->> 'player2' = q.correct_answer;

            -- Determine winner and update game_sessions
            UPDATE game_sessions
            SET winner_id = CASE
                                WHEN p1_score > p2_score THEN p1_id
                                WHEN p2_score > p1_score THEN p2_id
                                ELSE NULL
                             END,
                game_status = 'ended',
                end_time = CURRENT_TIMESTAMP
            WHERE s_id = NEW.s_id;

            -- Update game_count and win_count for both players
            UPDATE user_stats SET game_count = game_count + 1 WHERE u_id = p1_id;
            UPDATE user_stats SET game_count = game_count + 1 WHERE u_id = p2_id;

            -- Update win_count for winner
            IF p1_score > p2_score THEN
                UPDATE user_stats SET win_count = win_count + 1 WHERE u_id = p1_id;
            ELSIF p2_score > p1_score THEN
                UPDATE user_stats SET win_count = win_count + 1 WHERE u_id = p2_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rounds table
DROP TRIGGER IF EXISTS trg_update_game_winner ON rounds;
CREATE TRIGGER trg_update_game_winner
AFTER UPDATE ON rounds
FOR EACH ROW
EXECUTE FUNCTION update_game_winner();