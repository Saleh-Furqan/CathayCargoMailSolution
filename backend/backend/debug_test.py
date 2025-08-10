"""
Debug script to test the weight range overlap validation
"""
import sys
import os
import json

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import TariffRate
from datetime import date

app.config['TESTING'] = True
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
client = app.test_client()

with app.app_context():
    db.create_all()
    
    # Create a base rate
    base_rate = TariffRate(
        origin_country='China',
        destination_country='USA',
        goods_category='Electronics',
        postal_service='EMS',
        start_date=date(2025, 1, 1),
        end_date=date(2025, 12, 31),
        min_weight=0.0,
        max_weight=10.0,
        tariff_rate=0.8,
        minimum_tariff=5.0,
        currency='USD',
        is_active=True
    )
    db.session.add(base_rate)
    db.session.commit()
    
    print(f"Created base rate with ID: {base_rate.id}")
    print(f"Base rate: {base_rate.origin_country} -> {base_rate.destination_country}")
    print(f"Category: {base_rate.goods_category}, Service: {base_rate.postal_service}")
    print(f"Weight: {base_rate.min_weight}-{base_rate.max_weight}kg")
    print(f"Date: {base_rate.start_date} to {base_rate.end_date}")
    print("-" * 50)
    
    # Test 1: Non-overlapping weight range (should succeed)
    print("Test 1: Non-overlapping weight range (15-25kg)")
    response = client.post('/tariff-rates', 
        json={
            'origin_country': 'China',
            'destination_country': 'USA',
            'goods_category': 'Electronics',
            'postal_service': 'EMS',
            'start_date': '2025-06-01',
            'end_date': '2025-06-30',
            'min_weight': 15.0,
            'max_weight': 25.0,
            'tariff_rate': 0.9,
            'minimum_tariff': 6.0
        })
    
    print(f"Response status: {response.status_code}")
    data = json.loads(response.data)
    print(f"Response data: {data}")
    print("-" * 50)
    
    # Test 2: Overlapping weight range (should fail)
    print("Test 2: Overlapping weight range (5-15kg)")
    response = client.post('/tariff-rates', 
        json={
            'origin_country': 'China',
            'destination_country': 'USA',
            'goods_category': 'Electronics',
            'postal_service': 'EMS',
            'start_date': '2025-06-01',
            'end_date': '2025-06-30',
            'min_weight': 5.0,
            'max_weight': 15.0,
            'tariff_rate': 0.9,
            'minimum_tariff': 6.0
        })
    
    print(f"Response status: {response.status_code}")
    data = json.loads(response.data)
    print(f"Response data: {data}")
