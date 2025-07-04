# app/dao/round_dao.py
from app.db import get_db_connection
import json
from datetime import datetime

def create_round(s_id, q_id, round_number, category_selector, selected_category):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO rounds (s_id, q_id, round_number, category_selector, selected_category)
            VALUES (%s, %s, %s, %s, %s) RETURNING r_id;
        """, (s_id, q_id, round_number, category_selector, selected_category))
        round_id = cursor.fetchone()[0]
        conn.commit()
        return round_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def create_round_with_questions(s_id, round_number, round_starter, category_id, questions):
    """Create a new round with questions for quiz mode"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # For the new quiz mode, we don't need a single q_id since we store all questions in JSON
        # We'll use the first question's ID as the primary q_id for compatibility
        primary_q_id = questions[0]['q_id'] if questions and len(questions) > 0 else None
        
        if not primary_q_id:
            raise Exception("No questions provided or questions missing q_id")
        
        cursor.execute("""
            INSERT INTO rounds (s_id, q_id, round_number, category_selector, selected_category, questions, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING r_id;
        """, (s_id, primary_q_id, round_number, round_starter, category_id, json.dumps(questions), datetime.now()))
        
        round_id = cursor.fetchone()[0]
        conn.commit()
        return round_id
    except Exception as e:
        conn.rollback()
        print(f"Error creating round with questions: {e}")
        raise e
    finally:
        cursor.close()
        conn.close()

def submit_round_answers(r_id, player1_answer, player2_answer):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        answers = {"player1": player1_answer, "player2": player2_answer}
        cursor.execute("""
            UPDATE rounds SET players_answers = %s WHERE r_id = %s;
        """, (json.dumps(answers), r_id))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def submit_player_quiz_answers(s_id, round_number, player_id, answers, score):
    """Submit player answers for a quiz round"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # First, get the round ID and existing answers
        cursor.execute("""
            SELECT r_id, players_answers FROM rounds 
            WHERE s_id = %s AND round_number = %s;
        """, (s_id, round_number))
        result = cursor.fetchone()
        
        if not result:
            raise Exception(f"Round {round_number} not found for game {s_id}")
        
        round_id = result[0]
        existing_answers = result[1]
        
        # Get existing players_answers or create new structure
        players_answers = {}
        if existing_answers:
            players_answers = json.loads(existing_answers) if isinstance(existing_answers, str) else existing_answers
        
        # Add this player's answers
        players_answers[str(player_id)] = {
            'answers': answers,
            'score': score,
            'submitted_at': datetime.now().isoformat()
        }
        
        # Update the round with new answers
        cursor.execute("""
            UPDATE rounds SET players_answers = %s WHERE r_id = %s;
        """, (json.dumps(players_answers), round_id))
        conn.commit()
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error submitting player answers: {e}")
        raise e
    finally:
        cursor.close()
        conn.close()

def is_round_complete(s_id, round_number):
    """Check if both players have answered for a round"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Get the round's players_answers and game players
        cursor.execute("""
            SELECT r.players_answers, gs.player1, gs.player2
            FROM rounds r
            JOIN game_sessions gs ON r.s_id = gs.s_id
            WHERE r.s_id = %s AND r.round_number = %s;
        """, (s_id, round_number))
        result = cursor.fetchone()
        
        if not result or not result[0]:
            return False
        
        players_answers_data = result[0]
        player1 = result[1]
        player2 = result[2]
        
        # Handle both string and dict formats
        if isinstance(players_answers_data, str):
            players_answers = json.loads(players_answers_data)
        else:
            players_answers = players_answers_data
        
        # Check if we have answers from both players
        return str(player1) in players_answers and str(player2) in players_answers
        
    except Exception as e:
        print(f"Error checking round completion: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def get_game_rounds(s_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.r_id, r.round_number, r.players_answers, q.q_text, q.option_a, 
               q.option_b, q.option_c, q.option_d, q.correct_answer, c.category_name
        FROM rounds r
        JOIN questions q ON r.q_id = q.q_id
        JOIN categories c ON q.c_id = c.c_id
        WHERE r.s_id = %s
        ORDER BY r.round_number;
    """, (s_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return [
        {
            "r_id": row[0], "round_number": row[1], "players_answers": row[2],
            "question": {
                "q_text": row[3], "option_a": row[4], "option_b": row[5],
                "option_c": row[6], "option_d": row[7], "correct_answer": row[8]
            },
            "category_name": row[9]
        }
        for row in rows
    ]

def get_rounds_by_game_session(s_id):
    """Get all rounds for a specific game session (quiz mode)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT r_id, s_id, round_number, category_selector, selected_category, 
                   questions, players_answers, created_at
            FROM rounds 
            WHERE s_id = %s 
            ORDER BY round_number;
        """, (s_id,))
        rows = cursor.fetchall()
        
        rounds = []
        for row in rows:
            # Handle both string and dict formats for JSON fields
            questions_data = row[5]
            if isinstance(questions_data, str):
                questions = json.loads(questions_data) if questions_data else []
            else:
                questions = questions_data or []
            
            answers_data = row[6]
            if isinstance(answers_data, str):
                players_answers = json.loads(answers_data) if answers_data else {}
            else:
                players_answers = answers_data or {}
            
            round_data = {
                'r_id': row[0],
                's_id': row[1],
                'round_number': row[2],
                'round_starter': row[3],
                'category_id': row[4],
                'questions': questions,
                'players_answers': players_answers,
                'created_at': row[7]
            }
            rounds.append(round_data)
        
        return rounds
    except Exception as e:
        print(f"Error getting rounds by game session: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def get_round_count(s_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM rounds WHERE s_id = %s;", (s_id,))
        count = cursor.fetchone()[0]
        return count
    except Exception as e:
        print(f"Error getting round count: {e}")
        return 0
    finally:
        cursor.close()
        conn.close()

def get_current_round(s_id):
    """Get current round information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT r_id, s_id, round_number, category_selector, selected_category, 
                   questions, players_answers, created_at
            FROM rounds 
            WHERE s_id = %s 
            ORDER BY round_number DESC 
            LIMIT 1;
        """, (s_id,))
        result = cursor.fetchone()
        
        if not result:
            return None
        
        # Handle JSON fields
        questions_data = result[5]
        if isinstance(questions_data, str):
            questions = json.loads(questions_data) if questions_data else []
        else:
            questions = questions_data or []
        
        answers_data = result[6]
        if isinstance(answers_data, str):
            players_answers = json.loads(answers_data) if answers_data else {}
        else:
            players_answers = answers_data or {}
        
        return {
            'r_id': result[0],
            's_id': result[1],
            'round_number': result[2],
            'round_starter': result[3],
            'category_id': result[4],
            'questions': questions,
            'players_answers': players_answers,
            'created_at': result[7]
        }
        
    except Exception as e:
        print(f"Error getting current round: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def get_round_status(s_id, round_number):
    """Get status of a specific round"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT r.players_answers, gs.player1, gs.player2
            FROM rounds r
            JOIN game_sessions gs ON r.s_id = gs.s_id
            WHERE r.s_id = %s AND r.round_number = %s;
        """, (s_id, round_number))
        result = cursor.fetchone()
        
        if not result:
            return None
        
        players_answers_data = result[0]
        player1 = result[1]
        player2 = result[2]
        
        # Handle JSON data
        if isinstance(players_answers_data, str):
            players_answers = json.loads(players_answers_data) if players_answers_data else {}
        else:
            players_answers = players_answers_data or {}
        
        return {
            'round_number': round_number,
            'player1_answered': str(player1) in players_answers,
            'player2_answered': str(player2) in players_answers,
            'round_complete': str(player1) in players_answers and str(player2) in players_answers,
            'players_answers': players_answers
        }
        
    except Exception as e:
        print(f"Error getting round status: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def get_round_by_id(r_id):
    """Get round information by round ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT r_id, s_id, round_number, category_selector, selected_category, 
                   questions, players_answers, created_at
            FROM rounds 
            WHERE r_id = %s;
        """, (r_id,))
        result = cursor.fetchone()
        
        if not result:
            return None
        
        # Handle JSON fields
        questions_data = result[5]
        if isinstance(questions_data, str):
            questions = json.loads(questions_data) if questions_data else []
        else:
            questions = questions_data or []
        
        answers_data = result[6]
        if isinstance(answers_data, str):
            players_answers = json.loads(answers_data) if answers_data else {}
        else:
            players_answers = answers_data or {}
        
        return {
            'r_id': result[0],
            's_id': result[1],
            'round_number': result[2],
            'round_starter': result[3],
            'category_id': result[4],
            'questions': questions,
            'players_answers': players_answers,
            'created_at': result[7]
        }
        
    except Exception as e:
        print(f"Error getting round by ID: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def get_round_questions(r_id):
    """Get questions for a specific round"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT questions FROM rounds WHERE r_id = %s;", (r_id,))
        result = cursor.fetchone()
        
        if not result or not result[0]:
            return []
        
        questions_data = result[0]
        if isinstance(questions_data, str):
            return json.loads(questions_data)
        else:
            return questions_data or []
        
    except Exception as e:
        print(f"Error getting round questions: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def get_next_category_selector(s_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT player1, player2 FROM game_sessions WHERE s_id = %s;
        """, (s_id,))
        players = cursor.fetchone()
        
        cursor.execute("""
            SELECT category_selector FROM rounds 
            WHERE s_id = %s ORDER BY round_number DESC LIMIT 1;
        """, (s_id,))
        last_selector = cursor.fetchone()
        
        if not last_selector:
            # First round, player1 selects
            return players[0]
        else:
            # Alternate between players
            return players[1] if last_selector[0] == players[0] else players[0]
    except Exception as e:
        print(f"Error getting next category selector: {e}")
        return None
    finally:
        cursor.close()
        conn.close()


def get_current_round_for_quiz(s_id):
    """Get current round information for answering existing questions"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT r_id, s_id, round_number, category_selector, selected_category, 
                   questions, players_answers, created_at
            FROM rounds 
            WHERE s_id = %s 
            ORDER BY round_number DESC 
            LIMIT 1;
        """, (s_id,))
        result = cursor.fetchone()
        
        if not result:
            return None
        
        # Handle JSON fields
        questions_data = result[5]
        if isinstance(questions_data, str):
            questions = json.loads(questions_data) if questions_data else []
        else:
            questions = questions_data or []
        
        answers_data = result[6]
        if isinstance(answers_data, str):
            players_answers = json.loads(answers_data) if answers_data else {}
        else:
            players_answers = answers_data or {}
        
        return {
            'r_id': result[0],
            's_id': result[1],
            'round_number': result[2],
            'round_starter': result[3],
            'category_id': result[4],
            'questions': questions,
            'players_answers': players_answers,
            'created_at': result[7]
        }
        
    except Exception as e:
        print(f"Error getting current round for quiz: {e}")
        return None
    finally:
        cursor.close()
        conn.close()


def is_game_complete(s_id):
    """Check if all 5 rounds have answers from both players"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Get game players and all rounds
        cursor.execute("""
            SELECT gs.player1, gs.player2
            FROM game_sessions gs
            WHERE gs.s_id = %s;
        """, (s_id,))
        game_result = cursor.fetchone()
        
        if not game_result:
            return False
        
        player1_id = game_result[0]
        player2_id = game_result[1]
        
        # Get all rounds for this game
        cursor.execute("""
            SELECT r.players_answers
            FROM rounds r
            WHERE r.s_id = %s
            ORDER BY r.round_number ASC
            LIMIT 5;
        """, (s_id,))
        rounds_data = cursor.fetchall()
        
        if len(rounds_data) < 5:
            return False
        
        # Check if all 5 rounds have answers from both players
        completed_rounds = 0
        for round_data in rounds_data:
            players_answers_data = round_data[0]
            
            if not players_answers_data:
                continue
            
            # Handle JSON data
            if isinstance(players_answers_data, str):
                players_answers = json.loads(players_answers_data)
            else:
                players_answers = players_answers_data
            
            # Check if both players have answered
            player1_has_answered = str(player1_id) in players_answers
            player2_has_answered = str(player2_id) in players_answers
            
            if player1_has_answered and player2_has_answered:
                completed_rounds += 1
        
        return completed_rounds == 5
        
    except Exception as e:
        print(f"Error checking if game is complete: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
