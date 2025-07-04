# app/dao/admin_dao.py
from app.db import get_db_connection

def ban_user(user_id, ban_reason):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO banned_users (u_id, ban_reason) VALUES (%s, %s);
        """, (user_id, ban_reason))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def unban_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM banned_users WHERE u_id = %s;", (user_id,))
    conn.commit()
    cursor.close()
    conn.close()

def get_banned_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.u_id, u.user_name, u.email, b.ban_reason, b.ban_date
        FROM banned_users b
        JOIN users u ON b.u_id = u.u_id;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"u_id": row[0], "user_name": row[1], "email": row[2], "ban_reason": row[3], "ban_date": row[4]}
        for row in rows
    ]