from flask import Blueprint, jsonify, request
from app.dao import user_dao
import bcrypt

user_bp = Blueprint("user_bp", __name__)

@user_bp.route("/", methods=["GET"])
def get_users():
    users = user_dao.get_all_users()
    return jsonify(users), 200

@user_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = user_dao.get_user_by_id(user_id)
    if user:
        return jsonify(user), 200
    else:
        return jsonify({"error": "User not found"}), 404

@user_bp.route("/", methods=["POST"])
def create_user():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    
    if not username or not email or not password:
        return jsonify({"error": "username, email and password are required"}), 400
    
    try:
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user_id = user_dao.create_user(username, email, hashed_password)
        return jsonify({"u_id": user_id}), 201  # Changed from "id" to "u_id"
    except Exception as e:
        return jsonify({"error": "Username or email already exists"}), 409

@user_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400
    
    try:
        user = user_dao.get_user_by_username(username)
        if user and bcrypt.checkpw(password.encode('utf-8'), user["password"].encode('utf-8')):
            # Check if user is banned
            if user_dao.check_user_banned(user["u_id"]):
                return jsonify({"error": "User is banned"}), 403
            
            return jsonify({"message": "Login successful", "user_id": user["u_id"]}), 200
        else:
            return jsonify({"error": "Invalid username or password"}), 401
    except Exception as e:
        return jsonify({"error": "Login failed"}), 500
    
@user_bp.route("/<int:user_id>/admin-status", methods=["GET"])
def check_admin_status(user_id):
    try:
        is_admin = user_dao.is_user_admin(user_id)
        return jsonify({"is_admin": is_admin}), 200
    except Exception as e:
        return jsonify({"error": "Failed to check admin status"}), 500