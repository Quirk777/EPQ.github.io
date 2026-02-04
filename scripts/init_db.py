from app.services.db import init_db

if __name__ == "__main__":
    print("Initializing DB...")
    init_db()
    print("Done.")
