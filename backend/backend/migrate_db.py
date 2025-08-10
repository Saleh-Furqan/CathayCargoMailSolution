#!/usr/bin/env python3
"""
Database migration script for enhanced tariff system
Run this to update your existing database with new tariff fields
"""

from app import app
from models import db, TariffRate, ProcessedShipment
from datetime import date
import sys

def migrate_database():
    """Migrate database to support enhanced tariff system"""
    try:
        with app.app_context():
            print("Creating/updating database tables...")
            
            # This will create new tables with the enhanced schema
            db.create_all()
            
            print("Database migration completed successfully!")
            
            # Display current state
            total_rates = TariffRate.query.count()
            total_shipments = ProcessedShipment.query.count()
            
            print(f"\nDatabase Status:")
            print(f"- Total tariff rates: {total_rates}")
            print(f"- Total processed shipments: {total_shipments}")
            print(f"- Enhanced tariff system: READY")
            
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("Enhanced Tariff System - Database Migration")
    print("=" * 50)
    migrate_database()