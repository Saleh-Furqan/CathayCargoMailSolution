#!/usr/bin/env python3
"""
Apply latest migration to remove unique constraint
"""

import os
import sys

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))

from flask import Flask
from models.database import db
from config.settings import Config

def apply_constraint_fix():
    """Remove the unique constraint from existing database"""
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        try:
            # Try to drop the constraint if it exists using SQLAlchemy 2.0 syntax
            with db.engine.connect() as conn:
                conn.execute(db.text('DROP INDEX IF EXISTS uix_tariff_route_weight_no_dates'))
                conn.commit()
            print("✓ Removed unique constraint successfully!")
        except Exception as e:
            print(f"Note: Constraint may not exist or already removed: {e}")
        
        # Ensure all tables are up to date
        db.create_all()
        print("✓ Database schema updated!")
        
        return True

if __name__ == '__main__':
    success = apply_constraint_fix()
    sys.exit(0 if success else 1)
