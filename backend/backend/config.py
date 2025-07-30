import os

class Config:
    # Get the directory containing this file
    base_dir = os.path.abspath(os.path.dirname(__file__))
    
    # Single database configuration
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(base_dir, "shipments.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
