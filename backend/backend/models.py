from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class ShipmentEntry(db.Model):
    """Model for storing raw shipment data"""
    __tablename__ = 'shipments'
    __table_args__ = (
        db.UniqueConstraint(
            'awb_number', 
            'destination', 
            'departure_station',
            'flight_number',
            'flight_date',
            name='uix_shipment_unique'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    
    # Common fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # China Post fields
    awb_number = db.Column(db.String(50))  # "*运单号 (AWB Number)"
    departure_station = db.Column(db.String(100))  # "*始发站（Departure station）"
    destination = db.Column(db.String(100))  # "*目的站（Destination）"
    pieces = db.Column(db.String(50))  # "*件数(Pieces)"
    weight = db.Column(db.String(50))  # "*重量 (Weight)"
    airline = db.Column(db.String(50))  # "航司(Airline)"
    flight_number = db.Column(db.String(50))  # "航班号 (Flight Number)"
    flight_date = db.Column(db.String(50))  # "航班日期 (Flight Date)"
    total_mail_items = db.Column(db.String(50))  # "一个航班的邮件item总数"
    total_mail_weight = db.Column(db.String(50))  # "一个航班的邮件总重量"
    rate_type = db.Column(db.String(50))  # "*运价类型 (Rate Type)"
    rate = db.Column(db.String(50))  # "*费率 (Rate)"
    air_freight = db.Column(db.String(50))  # "*航空运费 (Air Freight)"
    agent_charges = db.Column(db.String(50))  # "代理人的其他费用"
    carrier_charges = db.Column(db.String(50))  # "承运人的其他费用"
    total_charges = db.Column(db.String(50))  # "*总运费 (Total Charges)"
    
    # CBP fields
    carrier_code = db.Column(db.String(50))  # Maps to airline in China Post
    arrival_port_code = db.Column(db.String(50))  # Maps to destination in China Post
    arrival_date = db.Column(db.String(50))  # Maps to flight_date in China Post
    declared_value_usd = db.Column(db.String(50))  # Store as string
    tracking_number = db.Column(db.String(100))  # Can be derived from AWB number

    def to_dict(self):
        """Convert entry to dictionary"""
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat(),
            # China Post fields
            'awb_number': self.awb_number or '',
            'departure_station': self.departure_station or '',
            'destination': self.destination or '',
            'pieces': self.pieces or '',
            'weight': self.weight or '',
            'airline': self.airline or '',
            'flight_number': self.flight_number or '',
            'flight_date': self.flight_date or '',
            'total_mail_items': self.total_mail_items or '',
            'total_mail_weight': self.total_mail_weight or '',
            'rate_type': self.rate_type or '',
            'rate': self.rate or '',
            'air_freight': self.air_freight or '',
            'agent_charges': self.agent_charges or '',
            'carrier_charges': self.carrier_charges or '',
            'total_charges': self.total_charges or '',
            # CBP fields
            'carrier_code': self.carrier_code or '',
            'arrival_port_code': self.arrival_port_code or '',
            'arrival_date': self.arrival_date or '',
            'declared_value_usd': self.declared_value_usd or '',
            'tracking_number': self.tracking_number or ''
        }
