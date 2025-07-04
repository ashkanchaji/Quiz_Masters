from flask import Blueprint, jsonify, request
from app.dao import round_dao, question_dao, game_session_dao

round_bp = Blueprint("round", __name__)

@round_bp.route("/game/<int:s_id>", methods=["GET"])
def get_rounds_by_game(s_id):
    """Get all rounds for a specific game session"""
    try:
        rounds = round_dao.get_rounds_by_game_session(s_id)
        return jsonify(rounds), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch rounds"}), 500

@round_bp.route("/game/<int:s_id>/start", methods=["POST"])
def start_new_round(s_id):
    """Start a new round (legacy endpoint)"""
    data = request.get_json()
    selected_category = data.get("category_id")
    user_id = data.get("user_id")
    
    if not selected_category or not user_id:
        return jsonify({"error": "category_id and user_id are required"}), 400
    
    try:
        # Check if game exists and is ongoing
        game = game_session_dao.get_game_session(s_id)
        if not game or game["game_status"] != "ongoing":
            return jsonify({"error": "Game not found or not ongoing"}), 404
        
        # Verify user is part of this game
        if user_id not in [game['player1'], game['player2']]:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get current round number
        round_count = round_dao.get_round_count(s_id)
        if round_count >= 5:
            return jsonify({"error": "Game already has 5 rounds"}), 400
        
        round_number = round_count + 1
        
        # Get 3 random questions from the selected category
        all_questions = question_dao.get_confirmed_questions_by_category(selected_category, 100)
        if len(all_questions) < 3:
            return jsonify({"error": "Not enough questions in category"}), 400
        
        import random
        selected_questions = random.sample(all_questions, 3)
        
        # Create the round with questions
        round_id = round_dao.create_round_with_questions(
            s_id, round_number, user_id, selected_category, selected_questions
        )
        
        return jsonify({
            "r_id": round_id,
            "round_number": round_number,
            "questions": selected_questions,
            "category_id": selected_category
        }), 201
        
    except Exception as e:
        return jsonify({"error": "Failed to start round"}), 500

@round_bp.route("/games/<int:s_id>/quiz-round", methods=["POST"])
def start_quiz_round(s_id):
    """Start a new quiz round with 3 questions"""
    data = request.get_json()
    selected_category = data.get("category_id")
    user_id = data.get("user_id")
    
    if not selected_category or not user_id:
        return jsonify({"error": "category_id and user_id are required"}), 400
    
    try:
        # Check if game exists and is ongoing
        game = game_session_dao.get_game_session(s_id)
        if not game or game["game_status"] != "ongoing":
            return jsonify({"error": "Game not found or not ongoing"}), 404
        
        # Verify user is part of this game
        if user_id not in [game['player1'], game['player2']]:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get current round number
        round_count = round_dao.get_round_count(s_id)
        if round_count >= 5:
            return jsonify({"error": "Game already has 5 rounds"}), 400
        
        round_number = round_count + 1
        
        # Get 3 random questions from the selected category
        all_questions = question_dao.get_confirmed_questions_by_category(selected_category, 100)
        if len(all_questions) < 3:
            return jsonify({"error": "Not enough questions in category"}), 400
        
        import random
        selected_questions = random.sample(all_questions, 3)
        
        # Create the round with questions
        round_id = round_dao.create_round_with_questions(
            s_id, round_number, user_id, selected_category, selected_questions
        )
        
        return jsonify({
            "r_id": round_id,
            "round_number": round_number,
            "questions": selected_questions,
            "category_id": selected_category
        }), 201
        
    except Exception as e:
        print(f"Error starting quiz round: {e}")  # Debug log
        return jsonify({"error": "Failed to start quiz round"}), 500


@round_bp.route("/games/<int:s_id>/quiz-answers", methods=["POST"])
def submit_quiz_answers(s_id):
    """Submit quiz answers for current round"""
    data = request.get_json()
    answers = data.get("answers")
    user_id = data.get("user_id")
    
    if not answers or not user_id:
        return jsonify({"error": "answers and user_id are required"}), 400
    
    try:
        # Get game session
        game = game_session_dao.get_game_session(s_id)
        if not game:
            return jsonify({"error": "Game session not found"}), 404
        
    
        # Verify user is part of this game
        if user_id not in [game['player1'], game['player2']]:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get current round number
        current_round = round_dao.get_round_count(s_id)
        
        # Calculate score
        correct_answers = sum(1 for answer in answers if answer.get('is_correct', False))
        
        # Submit answers to round
        round_dao.submit_player_quiz_answers(
            s_id=s_id,
            round_number=current_round,
            player_id=user_id,
            answers=answers,
            score=correct_answers
        )
        
        # CORRECTED LOGIC: Check if the entire game is complete (all 5 rounds have both players' answers)
        game_is_complete = round_dao.is_game_complete(s_id)
        
        if game_is_complete:
            # Update game status to ended only after ALL 5 rounds are complete with both players' answers
            game_session_dao.update_game_status(s_id, "ended")
        
        # Also check if current round is complete for response
        round_complete = round_dao.is_round_complete(s_id, current_round)
        
        return jsonify({
            "message": "Answers submitted successfully",
            "score": correct_answers,
            "round_complete": round_complete,
            "game_complete": game_is_complete
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to submit answers"}), 500

@round_bp.route("/games/<int:s_id>/current-round", methods=["GET"])
def get_current_round(s_id):
    """Get current round information"""
    try:
        current_round = round_dao.get_current_round(s_id)
        if not current_round:
            return jsonify({"error": "No active round found"}), 404
        
        return jsonify(current_round), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get current round"}), 500

@round_bp.route("/games/<int:s_id>/round/<int:round_number>/status", methods=["GET"])
def get_round_status(s_id, round_number):
    """Get status of a specific round"""
    try:
        round_status = round_dao.get_round_status(s_id, round_number)
        if not round_status:
            return jsonify({"error": "Round not found"}), 404
        
        return jsonify(round_status), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get round status"}), 500

@round_bp.route("/round/<int:r_id>", methods=["GET"])
def get_round_by_id(r_id):
    """Get round information by round ID"""
    try:
        round_info = round_dao.get_round_by_id(r_id)
        if not round_info:
            return jsonify({"error": "Round not found"}), 404
        
        return jsonify(round_info), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get round"}), 500

@round_bp.route("/round/<int:r_id>/questions", methods=["GET"])
def get_round_questions(r_id):
    """Get questions for a specific round"""
    try:
        questions = round_dao.get_round_questions(r_id)
        return jsonify(questions), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get round questions"}), 500

@round_bp.route("/round/<int:r_id>/submit", methods=["POST"])
def submit_round_answers(r_id):
    """Submit answers for a round (legacy endpoint)"""
    data = request.get_json()
    user_id = data.get("user_id")
    answers = data.get("answers")
    
    if not user_id or not answers:
        return jsonify({"error": "user_id and answers are required"}), 400
    
    try:
        # Calculate score
        correct_count = sum(1 for answer in answers if answer.get('is_correct', False))
        
        # Submit answers
        result = round_dao.submit_round_answers(r_id, user_id, answers, correct_count)
        
        return jsonify({
            "message": "Answers submitted successfully",
            "score": correct_count,
            "round_complete": result.get("round_complete", False)
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to submit answers"}), 500

@round_bp.route("/games/<int:s_id>/results", methods=["GET"])
def get_game_results(s_id):
    """Get complete game results with all rounds"""
    try:
        # Get game info
        game = game_session_dao.get_game_session(s_id)
        if not game:
            return jsonify({"error": "Game not found"}), 404
        
        # Get all rounds
        rounds = round_dao.get_rounds_by_game_session(s_id)
        
        # Calculate final scores
        player1_score = 0
        player2_score = 0
        
        for round_data in rounds:
            if round_data.get('players_answers'):
                answers = round_data['players_answers']
                if str(game['player1']) in answers:
                    player1_score += answers[str(game['player1'])].get('score', 0)
                if str(game['player2']) in answers:
                    player2_score += answers[str(game['player2'])].get('score', 0)
        
        # Determine winner
        if player1_score > player2_score:
            winner = game['player1']
        elif player2_score > player1_score:
            winner = game['player2']
        else:
            winner = None  # Tie
        
        return jsonify({
            "game_id": s_id,
            "game_status": game['game_status'],
            "player1": game['player1'],
            "player2": game['player2'],
            "player1_score": player1_score,
            "player2_score": player2_score,
            "winner": winner,
            "rounds": rounds,
            "total_rounds": len(rounds)
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get game results"}), 500
    

@round_bp.route("/games/<int:s_id>/current-round-quiz", methods=["GET"])
def get_current_round_for_quiz(s_id):
    """Get current round for answering existing questions"""
    try:
        current_round = round_dao.get_current_round_for_quiz(s_id)
        if not current_round:
            return jsonify({"error": "No active round found"}), 404
        
        return jsonify(current_round), 200
        
    except Exception as e:
        print(f"Error getting current round for quiz: {e}")
        return jsonify({"error": "Failed to get current round"}), 500

# Health check endpoint
@round_bp.route("/health", methods=["GET"])
def health_check():
    """Health check for rounds service"""
    return jsonify({"status": "ok", "service": "rounds"}), 200