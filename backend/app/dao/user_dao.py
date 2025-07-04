# app/dao/user_dao.py
from app.db import get_db_connection

def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT u_id, user_name, email FROM users;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"u_id": row[0], "user_name": row[1], "email": row[2]}
        for row in rows
    ]

def get_user_by_id(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT u_id, user_name, email FROM users WHERE u_id = %s;", (user_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return {"u_id": row[0], "user_name": row[1], "email": row[2]}
    return None

def get_user_by_username(username):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT u_id, user_name, email, password FROM users WHERE user_name = %s;", (username,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return {"u_id": row[0], "user_name": row[1], "email": row[2], "password": row[3]}
    return None

def create_user(username, email, hashed_password):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (user_name, email, password) VALUES (%s, %s, %s) RETURNING u_id;",
            (username, email, hashed_password)
        )
        user_id = cursor.fetchone()[0]
        
        # Initialize user stats
        cursor.execute(
            "INSERT INTO user_stats (u_id) VALUES (%s);",
            (user_id,)
        )
        
        conn.commit()
        return user_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def check_user_banned(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM banned_users WHERE u_id = %s;", (user_id,))
    is_banned = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return is_banned


def is_user_admin(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM admins WHERE u_id = %s;", (user_id,))
    is_admin = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return is_admin