# app/controllers/stats_controller.py
from flask import Blueprint, jsonify
from app.dao import stats_dao

stats_bp = Blueprint("stats", __name__)

@stats_bp.route("/user/<int:user_id>", methods=["GET"])
def get_user_stats(user_id):
    """Get personal statistics for a specific user"""
    try:
        stats = stats_dao.get_user_stats(user_id)
        if stats:
            return jsonify(stats), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to retrieve user stats"}), 500

@stats_bp.route("/leaderboard/overall", methods=["GET"])
def get_overall_leaderboard():
    """Get overall leaderboard (top 10 by XP)"""
    try:
        leaderboard = stats_dao.get_leaderboard_overall()
        return jsonify(leaderboard), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve overall leaderboard"}), 500

@stats_bp.route("/leaderboard/weekly", methods=["GET"])
def get_weekly_leaderboard():
    """Get weekly leaderboard (top 10 by XP, last 7 days)"""
    try:
        leaderboard = stats_dao.get_leaderboard_weekly()
        return jsonify(leaderboard), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve weekly leaderboard"}), 500

@stats_bp.route("/leaderboard/monthly", methods=["GET"])
def get_monthly_leaderboard():
    """Get monthly leaderboard (top 10 by XP, last 30 days)"""
    try:
        leaderboard = stats_dao.get_leaderboard_monthly()
        return jsonify(leaderboard), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve monthly leaderboard"}), 500