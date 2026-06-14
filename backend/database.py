from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os
from dotenv import load_dotenv

load_dotenv()

# .env se DATABASE_URL lo, agar nahi mila toh default use karo
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Goenka2193@localhost/xenocrm"
)

# Engine = database connection
engine = create_engine(DATABASE_URL)

# SessionLocal = har request ke liye ek session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI dependency - har API call ko ek DB session deta hai"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Saari tables create karo agar exist nahi karti"""
    Base.metadata.create_all(bind=engine)
    print("Database tables created!")
