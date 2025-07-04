# app/utils/auth.py
from functools import wraps
from flask import request, jsonify, current_app
import jwt
from app.dao import user_dao

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Decode the token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
            
            # Get user from database
            current_user = user_dao.get_user_by_id(current_user_id)
            if not current_user:
                return jsonify({'error': 'Invalid token'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'error': 'Token validation failed'}), 401
        
        # Create a simple user object
        class User:
            def __init__(self, user_data):
                self.user_id = user_data['user_id']
                self.username = user_data['username']
                self.email = user_data.get('email', '')
        
        current_user_obj = User(current_user)
        return f(current_user_obj, *args, **kwargs)
    
    return decorated