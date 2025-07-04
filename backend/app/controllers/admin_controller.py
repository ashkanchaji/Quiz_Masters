# app/controllers/admin_controller.py
from flask import Blueprint, jsonify, request
from app.dao import admin_dao, question_dao

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/users/ban", methods=["POST"])
def ban_user():
    """Ban a user"""
    data = request.get_json()
    user_id = data.get("user_id")
    ban_reason = data.get("ban_reason", "No reason provided")
    
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    
    try:
        admin_dao.ban_user(user_id, ban_reason)
        return jsonify({"message": "User banned successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to ban user or user already banned"}), 500

@admin_bp.route("/users/unban", methods=["POST"])
def unban_user():
    """Unban a user"""
    data = request.get_json()
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    
    try:
        admin_dao.unban_user(user_id)
        return jsonify({"message": "User unbanned successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to unban user"}), 500

@admin_bp.route("/users/banned", methods=["GET"])
def get_banned_users():
    """Get list of all banned users"""
    try:
        banned_users = admin_dao.get_banned_users()
        return jsonify(banned_users), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve banned users"}), 500

@admin_bp.route("/questions/pending", methods=["GET"])
def get_pending_questions():
    """Get all questions pending approval"""
    try:
        questions = question_dao.get_pending_questions()
        return jsonify(questions), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve pending questions"}), 500

@admin_bp.route("/questions/<int:q_id>/confirm", methods=["PUT"])
def confirm_question(q_id):
    """Confirm or reject a question"""
    data = request.get_json()
    status = data.get("status")  # True to confirm, False to reject
    
    if status is None:
        return jsonify({"error": "status is required (true/false)"}), 400
    
    if not isinstance(status, bool):
        return jsonify({"error": "status must be boolean"}), 400
    
    try:
        question_dao.confirm_question(q_id, status)
        message = "Question confirmed" if status else "Question rejected and deleted"
        return jsonify({"message": message}), 200
    except Exception as e:
        return jsonify({"error": "Failed to update question status"}), 500

@admin_bp.route("/dashboard", methods=["GET"])
def get_admin_dashboard():
    """Get admin dashboard summary"""
    try:
        pending_questions = len(question_dao.get_pending_questions())
        banned_users = len(admin_dao.get_banned_users())
        
        return jsonify({
            "pending_questions_count": pending_questions,
            "banned_users_count": banned_users
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve dashboard data"}), 500