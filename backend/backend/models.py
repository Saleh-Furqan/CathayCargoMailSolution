from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class ShipmentEntry(db.Model):
    """Model for storing processed workflow data from CNP + IODA merge"""
    __tablename__ = 'shipments'
    __table_args__ = (
        db.UniqueConstraint(
            'tracking_number', 
            'receptacle_id',
            'flight_number',
            'flight_date',
            name='uix_shipment_unique'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Core identification fields
    pawb = db.Column(db.String(100))  # Pre-Alert AWB
    cardit = db.Column(db.String(100))  # CARDIT reference
    tracking_number = db.Column(db.String(100))  # Individual package tracking
    receptacle_id = db.Column(db.String(200))  # Receptacle/bag identifier
    
    # Flight information
    host_origin_station = db.Column(db.String(50))  # Origin airport
    host_destination_station = db.Column(db.String(50))  # Destination airport
    flight_carrier_1 = db.Column(db.String(50))  # Primary carrier
    flight_number_1 = db.Column(db.String(50))  # Primary flight number
    flight_date_1 = db.Column(db.String(50))  # Primary flight date
    flight_carrier_2 = db.Column(db.String(50))  # Secondary carrier (if any)
    flight_number_2 = db.Column(db.String(50))  # Secondary flight number (if any)
    flight_date_2 = db.Column(db.String(50))  # Secondary flight date (if any)
    arrival_date = db.Column(db.String(50))  # Final arrival date
    uld_number = db.Column(db.String(50))  # ULD container number
    
    # Package/Receptacle details
    bag_weight = db.Column(db.String(50))  # Weight of receptacle/bag
    bag_number = db.Column(db.String(50))  # Bag number from CNP
    packets_in_receptacle = db.Column(db.String(50))  # Number of packets in receptacle
    
    # Content and customs information
    declared_content = db.Column(db.Text)  # Item description
    hs_code = db.Column(db.String(50))  # Harmonized System code
    declared_value = db.Column(db.String(50))  # Original declared value
    currency = db.Column(db.String(10))  # Currency of declared value
    declared_value_usd = db.Column(db.String(50))  # Converted to USD
    tariff_amount = db.Column(db.String(50))  # Calculated tariff (80% of declared value)
    
    # CBP specific fields
    carrier_code = db.Column(db.String(50))  # For CBP submission
    arrival_port_code = db.Column(db.String(50))  # Port code for CBP
    
    # Legacy fields for backward compatibility (populated from new fields)
    awb_number = db.Column(db.String(50))  # Maps to PAWB
    departure_station = db.Column(db.String(100))  # Maps to host_origin_station
    destination = db.Column(db.String(100))  # Maps to host_destination_station
    weight = db.Column(db.String(50))  # Maps to bag_weight
    airline = db.Column(db.String(50))  # Maps to flight_carrier_1
    flight_number = db.Column(db.String(50))  # Maps to flight_number_1
    flight_date = db.Column(db.String(50))  # Maps to flight_date_1
    total_charges = db.Column(db.String(50))  # Maps to tariff_amount

    def to_dict(self):
        """Convert entry to dictionary with complete workflow data"""
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat() if self.created_at else '',
            
            # Core identification
            'pawb': self.pawb or '',
            'cardit': self.cardit or '',
            'tracking_number': self.tracking_number or '',
            'receptacle_id': self.receptacle_id or '',
            
            # Flight information
            'host_origin_station': self.host_origin_station or '',
            'host_destination_station': self.host_destination_station or '',
            'flight_carrier_1': self.flight_carrier_1 or '',
            'flight_number_1': self.flight_number_1 or '',
            'flight_date_1': self.flight_date_1 or '',
            'flight_carrier_2': self.flight_carrier_2 or '',
            'flight_number_2': self.flight_number_2 or '',
            'flight_date_2': self.flight_date_2 or '',
            'arrival_date': self.arrival_date or '',
            'uld_number': self.uld_number or '',
            
            # Package details
            'bag_weight': self.bag_weight or '',
            'bag_number': self.bag_number or '',
            'packets_in_receptacle': self.packets_in_receptacle or '',
            
            # Content and customs
            'declared_content': self.declared_content or '',
            'hs_code': self.hs_code or '',
            'declared_value': self.declared_value or '',
            'currency': self.currency or '',
            'declared_value_usd': self.declared_value_usd or '',
            'tariff_amount': self.tariff_amount or '',
            
            # CBP fields
            'carrier_code': self.carrier_code or '',
            'arrival_port_code': self.arrival_port_code or '',
            
            # Legacy fields for backward compatibility
            'awb_number': self.awb_number or self.pawb or '',
            'departure_station': self.departure_station or self.host_origin_station or '',
            'destination': self.destination or self.host_destination_station or '',
            'weight': self.weight or self.bag_weight or '',
            'airline': self.airline or self.flight_carrier_1 or '',
            'flight_number': self.flight_number or self.flight_number_1 or '',
            'flight_date': self.flight_date or self.flight_date_1 or '',
            'total_charges': self.total_charges or self.tariff_amount or ''
        }
