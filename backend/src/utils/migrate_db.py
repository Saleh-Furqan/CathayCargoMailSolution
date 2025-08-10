#!/usr/bin/env python3
"""
Database migration script for enhanced tariff system
Run this to update your existing database with new tariff fields
"""

import os
import sys

# Add src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models.database import db, TariffRate, ProcessedShipment
from datetime import date

def migrate_database():
    """Migrate database to support enhanced tariff system"""
    try:
        with app.app_context():
            print("Creating/updating database tables...")
            
            # This will create new tables with the enhanced schema
            db.create_all()
            
            print("Database migration completed successfully!")
            
            # Update existing records to have default values for new fields
            print("Updating existing records with default values...")
            
            # Update TariffRate records to have weight defaults
            updated_rates = TariffRate.query.filter(
                TariffRate.min_weight.is_(None)
            ).update({
                'min_weight': 0.0,
                'max_weight': 999999.0
            })
            
            # Update ProcessedShipment records to have default category/service
            updated_shipments = ProcessedShipment.query.filter(
                ProcessedShipment.goods_category.is_(None)
            ).update({
                'goods_category': '*',
                'postal_service': '*',
                'tariff_calculation_method': 'fallback'
            })
            
            db.session.commit()
            
            print(f"Updated {updated_rates} tariff rate records")
            print(f"Updated {updated_shipments} shipment records")
            
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