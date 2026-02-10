#!/usr/bin/env python3
"""Migration script to add missing columns to existing database."""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'backend', 'civicpulse.db')
print(f"[INFO] Migrating database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check existing columns in submissions table
cursor.execute("PRAGMA table_info(submissions)")
existing_cols = {row[1] for row in cursor.fetchall()}
print(f"[INFO] Existing columns: {existing_cols}")

# Columns to add
columns_to_add = {
    'cluster_id': 'INTEGER',
    'priority_score': 'REAL',
    'joined_cluster': 'INTEGER DEFAULT 0',
    'citizen_count': 'INTEGER DEFAULT 1',
}

for col_name, col_type in columns_to_add.items():
    if col_name not in existing_cols:
        try:
            cursor.execute(f"ALTER TABLE submissions ADD COLUMN {col_name} {col_type}")
            print(f"[OK] Added column: {col_name}")
        except sqlite3.OperationalError as e:
            print(f"[SKIP] Column {col_name}: {e}")
    else:
        print(f"[SKIP] Column {col_name} already exists")

conn.commit()
conn.close()
print("[SUCCESS] Migration complete!")
