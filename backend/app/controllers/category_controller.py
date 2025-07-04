# app/controllers/category_controller.py
from flask import Blueprint, jsonify, request
from app.dao import category_dao

category_bp = Blueprint("category", __name__)

@category_bp.route("/", methods=["GET"])
def get_categories():
    try:
        categories = category_dao.get_all_categories()
        return jsonify(categories), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve categories"}), 500

@category_bp.route("/<int:c_id>", methods=["GET"])
def get_category(c_id):
    try:
        category = category_dao.get_category_by_id(c_id)
        if category:
            return jsonify(category), 200
        else:
            return jsonify({"error": "Category not found"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to retrieve category"}), 500

@category_bp.route("/", methods=["POST"])
def create_category():
    data = request.get_json()
    category_name = data.get("category_name")
    
    if not category_name:
        return jsonify({"error": "category_name is required"}), 400
    
    try:
        category_id = category_dao.create_category(category_name)
        return jsonify({"c_id": category_id}), 201
    except Exception as e:
        return jsonify({"error": "Category name already exists"}), 409

@category_bp.route("/popular", methods=["GET"])
def get_most_popular_categories():
    try:
        categories = category_dao.get_most_popular_categories()
        return jsonify(categories), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve popular categories"}), 500