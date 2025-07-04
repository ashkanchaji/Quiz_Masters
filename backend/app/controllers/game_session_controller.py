# app/controllers/game_session_controller.py
from flask import Blueprint, request, jsonify
from app.dao import game_session_dao, user_dao

game_session_bp = Blueprint("game_session", __name__)

@game_session_bp.route("/start/random", methods=["POST"])
def start_game_with_random_opponent():
    data = request.get_json()
    player1_id = data.get("player1_id")

    if not player1_id:
        return jsonify({"error": "player1_id is required"}), 400

    # Check if player1 exists and is not banned
    if not user_dao.get_user_by_id(player1_id):
        return jsonify({"error": "Player not found"}), 404
    
    if user_dao.check_user_banned(player1_id):
        return jsonify({"error": "Player is banned"}), 403

    try:
        session_id = game_session_dao.create_game_session_with_random_opponent(player1_id)
        if session_id:
            return jsonify({"session_id": session_id}), 201
        else:
            return jsonify({"error": "No available opponent found"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to create game session"}), 500

@game_session_bp.route("/start/selected", methods=["POST"])
def start_game_with_selected_opponent():
    data = request.get_json()
    player1_id = data.get("player1_id")
    opponent_username = data.get("opponent_username")

    if not player1_id or not opponent_username:
        return jsonify({"error": "player1_id and opponent_username are required"}), 400

    # Check if player1 exists and is not banned
    if not user_dao.get_user_by_id(player1_id):
        return jsonify({"error": "Player not found"}), 404
    
    if user_dao.check_user_banned(player1_id):
        return jsonify({"error": "Player is banned"}), 403

    try:
        session_id = game_session_dao.create_game_session_with_selected_opponent(player1_id, opponent_username)
        if session_id:
            return jsonify({"session_id": session_id}), 201
        else:
            return jsonify({"error": "Opponent not found or unavailable"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to create game session"}), 500

@game_session_bp.route("/<int:session_id>", methods=["GET"])
def get_game_session(session_id):
    try:
        session = game_session_dao.get_game_session_with_details(session_id)
        if session:
            return jsonify(session), 200
        else:
            return jsonify({"error": "Game session not found"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to retrieve game session"}), 500

@game_session_bp.route("/user/<int:user_id>/active", methods=["GET"])
def get_user_active_games(user_id):
    try:
        games = game_session_dao.get_user_active_games(user_id)
        return jsonify(games), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve active games"}), 500