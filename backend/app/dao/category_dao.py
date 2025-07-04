# app/dao/category_dao.py
from app.db import get_db_connection

def get_all_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT c_id, category_name FROM categories ORDER BY category_name;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"c_id": row[0], "category_name": row[1]}
        for row in rows
    ]

def get_category_by_id(c_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT c_id, category_name FROM categories WHERE c_id = %s;", (c_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return {"c_id": row[0], "category_name": row[1]}
    return None

def create_category(category_name):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO categories (category_name) VALUES (%s) RETURNING c_id;",
            (category_name,)
        )
        category_id = cursor.fetchone()[0]
        conn.commit()
        return category_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def get_most_popular_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM most_popular_categories;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"category_name": row[0], "played_count": row[1], "popularity_rank": row[2]}
        for row in rows
    ]