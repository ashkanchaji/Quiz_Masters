# backend/app.py
from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.controllers.user_controller import user_bp
from app.controllers.game_session_controller import game_session_bp
from app.controllers.question_controller import question_bp
from app.controllers.category_controller import category_bp
from app.controllers.round_controller import round_bp
from app.controllers.stats_controller import stats_bp
from app.controllers.admin_controller import admin_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for all routes
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(game_session_bp, url_prefix="/api/games")
    app.register_blueprint(question_bp, url_prefix="/api/questions")
    app.register_blueprint(category_bp, url_prefix="/api/categories")
    app.register_blueprint(round_bp, url_prefix="/api/rounds")
    app.register_blueprint(stats_bp, url_prefix="/api/stats")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)