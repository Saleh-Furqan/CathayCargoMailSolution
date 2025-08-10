#!/usr/bin/env python3
"""
Database migration setup script for production deployments
This script helps set up database migrations properly for the Cathay Mail Solution
"""

import os
import sys
from flask import Flask
from flask_migrate import Migrate, init, migrate, upgrade, stamp
from models import db
from config import Config

def setup_migrations():
    """Set up Flask-Migrate for the application"""
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    migrate_obj = Migrate(app, db)
    
    with app.app_context():
        # Check if migrations directory exists
        migrations_dir = 'migrations'
        
        if not os.path.exists(migrations_dir):
            print("Initializing migrations repository...")
            init()
            print("✓ Migrations repository initialized")
        
        # Create initial migration if no versions exist
        versions_dir = os.path.join(migrations_dir, 'versions')
        if not os.path.exists(versions_dir) or not os.listdir(versions_dir):
            print("Creating initial migration...")
            try:
                # If database already exists with tables, stamp it as current
                if os.path.exists('shipments.db'):
                    print("Existing database detected. Creating baseline migration...")
                    migrate(message="Baseline migration for existing database")
                    print("✓ Baseline migration created")
                else:
                    # Fresh database, create tables first then migrate
                    print("Creating fresh database...")
                    db.create_all()
                    migrate(message="Initial database schema")
                    print("✓ Initial migration created")
            except Exception as e:
                print(f"Migration creation failed: {e}")
                return False
        
        print("\n✓ Database migrations are properly configured!")
        print("\nTo apply migrations in production:")
        print("1. flask db upgrade")
        print("\nTo create new migrations after schema changes:")
        print("1. flask db migrate -m 'Description of changes'")
        print("2. flask db upgrade")
        
        return True

if __name__ == '__main__':
    success = setup_migrations()
    sys.exit(0 if success else 1)