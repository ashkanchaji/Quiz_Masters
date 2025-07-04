# app/dao/stats_dao.py
from app.db import get_db_connection

def get_user_stats(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.user_name, s.game_count, s.win_count, s.average_accuracy, s.xp,
               CASE WHEN s.game_count > 0 THEN ROUND((s.win_count::NUMERIC / s.game_count * 100), 1) ELSE 0 END as win_ratio
        FROM users u
        JOIN user_stats s ON u.u_id = s.u_id
        WHERE u.u_id = %s;
    """, (user_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if row:
        return {
            "user_name": row[0], "game_count": row[1], "win_count": row[2],
            "average_accuracy": row[3], "xp": row[4], "win_ratio": row[5]
        }
    return None

def get_leaderboard_overall():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leaderboard_overall;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"user_name": row[0], "xp": row[1], "win_count": row[2], "game_count": row[3], "win_ratio": row[4]}
        for row in rows
    ]

def get_leaderboard_weekly():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leaderboard_weekly;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"user_name": row[0], "xp": row[1], "win_count": row[2], "game_count": row[3]}
        for row in rows
    ]

def get_leaderboard_monthly():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leaderboard_monthly;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"user_name": row[0], "xp": row[1], "win_count": row[2], "game_count": row[3]}
        for row in rows
    ]