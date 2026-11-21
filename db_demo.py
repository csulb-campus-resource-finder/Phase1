import os
from importlib import import_module

# Load environment variables from .env when python-dotenv is installed.
try:
    load_dotenv = import_module("dotenv").load_dotenv
except ModuleNotFoundError as exc:
    if exc.name != "dotenv":
        raise
else:
    load_dotenv()

# Retrieve the Neon connection string from environment variables
DATABASE_URL = os.environ.get("DATABASE_URL")


def _connect():
    """Connect to the database, reporting how to install the driver if absent."""
    try:
        psycopg = import_module("psycopg")
    except ModuleNotFoundError as exc:
        if exc.name == "psycopg":
            raise RuntimeError(
                "The PostgreSQL driver is missing. Install it with: "
                "python -m pip install 'psycopg[binary]'"
            ) from exc
        raise
    return psycopg.connect(DATABASE_URL)


def setup_database():
    """Ensure the demo table exists."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS demo_records (
                    id SERIAL PRIMARY KEY,
                    item_name VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()


def save_record(item_name: str):
    """Save (INSERT) data to the Neon database."""
    setup_database()
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO demo_records (item_name) VALUES (%s) RETURNING id, created_at;",
                (item_name,)
            )
            record = cur.fetchone()
            conn.commit()
            print(f"Saved successfully! ID: {record[0]}, Time: {record[1]}")
            return record


def retrieve_records():
    """Retrieve (SELECT) data from the Neon database."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, item_name, created_at FROM demo_records ORDER BY created_at DESC;")
            rows = cur.fetchall()
            print("Retrieved Records:")
            for row in rows:
                print(f" - ID: {row[0]} | Name: {row[1]} | Created: {row[2]}")
            return rows


if __name__ == "__main__":
    # Demo execution
    print("--- Running Neon Database Demo ---")
    save_record("Test Capstone Resource")
    retrieve_records()