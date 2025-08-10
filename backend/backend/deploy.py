#!/usr/bin/env python3
"""
Production deployment script for the Cathay Mail Solution
Handles database migrations, dependency checks, and environment setup
"""

import os
import sys
import subprocess
from flask import Flask
from flask_migrate import Migrate, upgrade
from models import db
from config import Config

def check_dependencies():
    """Check that all required dependencies are installed"""
    try:
        import flask
        import flask_sqlalchemy  
        import flask_migrate
        import pandas
        import numpy
        print("✓ All required dependencies are installed")
        return True
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("Run: pip install -r requirements.txt")
        return False

def run_migrations():
    """Run database migrations"""
    print("Running database migrations...")
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    try:
        migrate = Migrate(app, db)
        with app.app_context():
            upgrade()
        print("✓ Database migrations completed successfully")
        return True
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        return False

def check_config():
    """Check configuration and environment"""
    print("Checking configuration...")
    
    # Check database file permissions
    db_path = 'shipments.db'
    if os.path.exists(db_path):
        if os.access(db_path, os.R_OK | os.W_OK):
            print("✓ Database file is readable and writable")
        else:
            print("✗ Database file permissions issue")
            return False
    
    # Check required directories exist
    required_dirs = ['templates']
    for dir_name in required_dirs:
        if not os.path.exists(dir_name):
            print(f"✗ Required directory missing: {dir_name}")
            return False
        else:
            print(f"✓ Directory exists: {dir_name}")
    
    print("✓ Configuration check passed")
    return True

def deploy():
    """Main deployment function"""
    print("=== Cathay Mail Solution Deployment ===\n")
    
    steps = [
        ("Checking dependencies", check_dependencies),
        ("Checking configuration", check_config),
        ("Running database migrations", run_migrations),
    ]
    
    for step_name, step_func in steps:
        print(f"{step_name}...")
        if not step_func():
            print(f"\n✗ Deployment failed at: {step_name}")
            return False
        print()
    
    print("🎉 Deployment completed successfully!")
    print("\nTo start the server:")
    print("python app.py")
    print("\nThe application will be available at: http://localhost:5001")
    
    return True

if __name__ == '__main__':
    success = deploy()
    sys.exit(0 if success else 1)