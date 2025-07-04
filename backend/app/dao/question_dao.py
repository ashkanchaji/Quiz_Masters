# app/dao/question_dao.py
from app.db import get_db_connection

def create_question(q_text, c_id, option_a, option_b, option_c, option_d, correct_answer, difficulty_level, author='User'):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO questions (q_text, c_id, option_a, option_b, option_c, option_d, 
                                 correct_answer, difficulty_level, author)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING q_id;
        """, (q_text, c_id, option_a, option_b, option_c, option_d, correct_answer, difficulty_level, author))
        question_id = cursor.fetchone()[0]
        conn.commit()
        return question_id
    finally:
        cursor.close()
        conn.close()

def get_confirmed_questions_by_category(c_id, limit=1):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT q_id, q_text, option_a, option_b, option_c, option_d, correct_answer, difficulty_level
        FROM questions 
        WHERE c_id = %s AND confirmation_status = TRUE
        ORDER BY RANDOM() LIMIT %s;
    """, (c_id, limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "q_id": row[0], "q_text": row[1], "option_a": row[2], "option_b": row[3],
            "option_c": row[4], "option_d": row[5], "correct_answer": row[6], "difficulty_level": row[7]
        }
        for row in rows
    ]

def get_pending_questions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT q.q_id, q.q_text, q.option_a, q.option_b, q.option_c, q.option_d, 
               q.correct_answer, q.difficulty_level, q.author, c.category_name
        FROM questions q
        JOIN categories c ON q.c_id = c.c_id
        WHERE q.confirmation_status = FALSE;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "q_id": row[0], "q_text": row[1], "option_a": row[2], "option_b": row[3],
            "option_c": row[4], "option_d": row[5], "correct_answer": row[6], 
            "difficulty_level": row[7], "author": row[8], "category_name": row[9]
        }
        for row in rows
    ]

def confirm_question(q_id, status):
    conn = get_db_connection()
    cursor = conn.cursor()
    if status:
        cursor.execute("UPDATE questions SET confirmation_status = TRUE WHERE q_id = %s;", (q_id,))
    else:
        cursor.execute("DELETE FROM questions WHERE q_id = %s;", (q_id,))
    conn.commit()
    cursor.close()
    conn.close()