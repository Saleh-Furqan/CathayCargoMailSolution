import os

class Config:
    # Get the project root directory (go up from config to src to backend to root)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Single database configuration - store in backend/data
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(base_dir, "data", "shipments.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
