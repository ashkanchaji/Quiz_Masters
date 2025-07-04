from app.db import get_db_connection

def create_game_session_with_random_opponent(player1_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Find a random opponent that is not the same as player1 and not banned
        cursor.execute("""
            SELECT u.u_id FROM users u
            LEFT JOIN banned_users b ON u.u_id = b.u_id
            WHERE u.u_id != %s AND b.u_id IS NULL
            ORDER BY RANDOM()
            LIMIT 1;
        """, (player1_id,))
        opponent = cursor.fetchone()

        if opponent is None:
            return None  # No opponent found

        player2_id = opponent[0]

        # Create the game session
        cursor.execute("""
            INSERT INTO game_sessions (player1, player2, game_status, start_time)
            VALUES (%s, %s, 'ongoing', CURRENT_TIMESTAMP)
            RETURNING s_id;
        """, (player1_id, player2_id))
        session_id = cursor.fetchone()[0]

        conn.commit()
        return session_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def create_game_session_with_selected_opponent(player1_id, opponent_username):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Find the opponent by username (exclude banned users)
        cursor.execute("""
            SELECT u.u_id FROM users u
            LEFT JOIN banned_users b ON u.u_id = b.u_id
            WHERE u.user_name = %s AND u.u_id != %s AND b.u_id IS NULL;
        """, (opponent_username, player1_id))
        opponent = cursor.fetchone()

        if opponent is None:
            return None  # No such opponent or opponent is banned

        player2_id = opponent[0]

        # Create the game session
        cursor.execute("""
            INSERT INTO game_sessions (player1, player2, game_status, start_time)
            VALUES (%s, %s, 'ongoing', CURRENT_TIMESTAMP)
            RETURNING s_id;
        """, (player1_id, player2_id))
        session_id = cursor.fetchone()[0]

        conn.commit()
        return session_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def get_game_session(session_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s_id, player1, player2, game_status, start_time, end_time, winner_id
        FROM game_sessions WHERE s_id = %s;
    """, (session_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if row:
        return {
            "s_id": row[0], "player1": row[1], "player2": row[2],
            "game_status": row[3], "start_time": row[4], 
            "end_time": row[5], "winner_id": row[6]
        }
    return None

def get_game_session_with_details(session_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get game session basic info
        cursor.execute("""
            SELECT gs.s_id, gs.player1, gs.player2, gs.game_status, gs.start_time, gs.end_time, gs.winner_id
            FROM game_sessions gs
            WHERE gs.s_id = %s;
        """, (session_id,))
        game_session = cursor.fetchone()
        
        if not game_session:
            return None
        
        # Get player names
        cursor.execute("""
            SELECT u.user_name FROM users u WHERE u.u_id = %s;
        """, (game_session[1],))
        player1_name = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT u.user_name FROM users u WHERE u.u_id = %s;
        """, (game_session[2],))
        player2_name = cursor.fetchone()[0]
        
        # Get rounds data
        cursor.execute("""
            SELECT r.r_id, r.players_answers
            FROM rounds r
            WHERE r.s_id = %s
            ORDER BY r.round_number ASC;
        """, (session_id,))
        rounds_data = cursor.fetchall()
        
        # Process rounds
        rounds = []
        for round_data in rounds_data:
            players_answers = round_data[1] if round_data[1] else {}
            
            # Default to empty arrays if no answers exist
            player1_answers = players_answers.get(str(game_session[1]), [])
            player2_answers = players_answers.get(str(game_session[2]), [])
            
            rounds.append({
                "player1_answers": player1_answers,
                "player2_answers": player2_answers
            })
        
        # Determine whose turn it is (simple logic: alternating turns)
        # You can implement more complex logic based on your game rules
        current_round = len(rounds)
        is_player1_turn = current_round % 2 == 0  # Player 1 starts odd rounds (0, 2, 4...)
        
        return {
            "s_id": game_session[0],
            "player1": {
                "id": game_session[1],
                "name": player1_name
            },
            "player2": {
                "id": game_session[2], 
                "name": player2_name
            },
            "game_status": game_session[3],
            "start_time": game_session[4],
            "end_time": game_session[5],
            "winner_id": game_session[6],
            "rounds": rounds,
            "is_player1_turn": is_player1_turn,
            "current_round": current_round
        }
        
    finally:
        cursor.close()
        conn.close()

def get_user_active_games(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s_id, player1, player2, start_time
        FROM game_sessions 
        WHERE (player1 = %s OR player2 = %s) AND game_status = 'ongoing';
    """, (user_id, user_id))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return [
        {"s_id": row[0], "player1": row[1], "player2": row[2], "start_time": row[3]}
        for row in rows
    ]

def update_game_status(session_id, status):
    """Update game status"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE game_sessions 
            SET game_status = %s, end_time = CURRENT_TIMESTAMP
            WHERE s_id = %s;
        """, (status, session_id))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error updating game status: {e}")
        raise e
    finally:
        cursor.close()
        conn.close()

def check_and_end_game_if_complete(session_id):
    """Check if game should be ended and end it if complete"""
    from app.dao import round_dao  # Import here to avoid circular imports
    
    try:
        game_is_complete = round_dao.is_game_complete(session_id)
        if game_is_complete:
            update_game_status(session_id, "ended")
            return True
        return False
    except Exception as e:
        print(f"Error checking and ending game: {e}")
        return False