# app/controllers/question_controller.py
from flask import Blueprint, jsonify, request
from app.dao import question_dao, category_dao

question_bp = Blueprint("question", __name__)

@question_bp.route("/", methods=["POST"])
def create_question():
    data = request.get_json()
    q_text = data.get("q_text")
    c_id = data.get("c_id")
    option_a = data.get("option_a")
    option_b = data.get("option_b")
    option_c = data.get("option_c")
    option_d = data.get("option_d")
    correct_answer = data.get("correct_answer")
    difficulty_level = data.get("difficulty_level")
    author = data.get("author", "User")
    
    # Validate required fields
    if not all([q_text, c_id, option_a, option_b, option_c, option_d, correct_answer]):
        return jsonify({"error": "All question fields are required"}), 400
    
    # Validate correct_answer
    if correct_answer not in ['A', 'B', 'C', 'D']:
        return jsonify({"error": "correct_answer must be A, B, C, or D"}), 400
    
    # Validate author
    if author not in ['Admin', 'User']:
        return jsonify({"error": "author must be 'Admin' or 'User'"}), 400
    
    # Validate category exists
    if not category_dao.get_category_by_id(c_id):
        return jsonify({"error": "Category not found"}), 404
    
    try:
        question_id = question_dao.create_question(
            q_text, c_id, option_a, option_b, option_c, option_d, 
            correct_answer, difficulty_level, author
        )
        return jsonify({"q_id": question_id, "message": "Question submitted for review"}), 201
    except Exception as e:
        return jsonify({"error": "Failed to create question"}), 500

@question_bp.route("/category/<int:c_id>", methods=["GET"])
def get_questions_by_category(c_id):
    limit = request.args.get("limit", 1, type=int)
    
    if limit < 1 or limit > 20:
        return jsonify({"error": "limit must be between 1 and 20"}), 400
    
    try:
        questions = question_dao.get_confirmed_questions_by_category(c_id, limit)
        # Remove correct_answer for client
        for question in questions:
            question.pop("correct_answer", None)
        
        return jsonify(questions), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve questions"}), 500

@question_bp.route("/pending", methods=["GET"])
def get_pending_questions():
    """Admin endpoint to get questions awaiting confirmation"""
    try:
        questions = question_dao.get_pending_questions()
        return jsonify(questions), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve pending questions"}), 500

@question_bp.route("/<int:q_id>/confirm", methods=["PUT"])
def confirm_question(q_id):
    """Admin endpoint to confirm or reject a question"""
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

@question_bp.route("/category/<int:c_id>/count", methods=["GET"])
def get_confirmed_question_count(c_id):
    """Get count of confirmed questions in a category"""
    try:
        questions = question_dao.get_confirmed_questions_by_category(c_id, 1000)  # Get all
        count = len(questions)
        return jsonify({"category_id": c_id, "confirmed_question_count": count}), 200
    except Exception as e:
        return jsonify({"error": "Failed to get question count"}), 500
    
# Add this to your question_controller.py
@question_bp.route("/category/<int:c_id>/random/<int:count>", methods=["GET"])
def get_random_questions_by_category(c_id, count):
    """Get random confirmed questions from a category"""
    if count < 1 or count > 10:
        return jsonify({"error": "count must be between 1 and 10"}), 400
    
    # Validate category exists
    if not category_dao.get_category_by_id(c_id):
        return jsonify({"error": "Category not found"}), 404
    
    try:
        # Get more questions than needed and randomly select
        all_questions = question_dao.get_confirmed_questions_by_category(c_id, 100)
        
        if len(all_questions) < count:
            return jsonify({"error": f"Not enough questions in category. Available: {len(all_questions)}"}), 400
        
        # Randomly select the requested count
        import random
        selected_questions = random.sample(all_questions, count)
        
        # Include correct_answer for quiz gameplay (but remove in other endpoints)
        return jsonify(selected_questions), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve random questions"}), 500