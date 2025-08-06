from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Country(db.Model):
    """Model for storing country information"""
    __tablename__ = 'countries'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(3), unique=True, nullable=False)  # ISO 3-letter code
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    origin_rates = db.relationship('TariffRate', foreign_keys='TariffRate.origin_country_id', backref='origin_country')
    destination_rates = db.relationship('TariffRate', foreign_keys='TariffRate.destination_country_id', backref='destination_country')
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'created_at': self.created_at.isoformat()
        }

class TariffRate(db.Model):
    """Model for storing tariff rates between countries"""
    __tablename__ = 'tariff_rates'
    __table_args__ = (
        db.UniqueConstraint('origin_country_id', 'destination_country_id', name='uix_country_pair'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    origin_country_id = db.Column(db.Integer, db.ForeignKey('countries.id'), nullable=False)
    destination_country_id = db.Column(db.Integer, db.ForeignKey('countries.id'), nullable=False)
    rate_percentage = db.Column(db.Float, nullable=False, default=50.0)  # Default 50%
    is_custom = db.Column(db.Boolean, default=False)  # Track if user customized this rate
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'origin_country_id': self.origin_country_id,
            'destination_country_id': self.destination_country_id,
            'origin_country': self.origin_country.to_dict() if self.origin_country else None,
            'destination_country': self.destination_country.to_dict() if self.destination_country else None,
            'rate_percentage': self.rate_percentage,
            'is_custom': self.is_custom,
            'last_updated': self.last_updated.isoformat(),
            'created_at': self.created_at.isoformat()
        }

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

    def get_tariff_rate(self):
        """Get the applicable tariff rate for this shipment"""
        if not self.departure_station or not self.destination:
            return 50.0  # Default rate
            
        # Try to find countries by station/destination codes or names
        origin_country = Country.query.filter(
            db.or_(
                Country.code.ilike(f'%{self.departure_station}%'),
                Country.name.ilike(f'%{self.departure_station}%')
            )
        ).first()
        
        dest_country = Country.query.filter(
            db.or_(
                Country.code.ilike(f'%{self.destination}%'),
                Country.name.ilike(f'%{self.destination}%')
            )
        ).first()
        
        if origin_country and dest_country:
            tariff_rate = TariffRate.query.filter_by(
                origin_country_id=origin_country.id,
                destination_country_id=dest_country.id
            ).first()
            
            if tariff_rate:
                return tariff_rate.rate_percentage
                
        return 50.0  # Default rate if no specific rate found

    def calculate_tariff_amount(self):
        """Calculate the tariff amount based on declared value and applicable rate"""
        try:
            # Clean the declared value string by removing currency symbols and spaces
            declared_value_str = str(self.declared_value_usd or '0')
            # Remove common currency symbols and spaces
            cleaned_value = declared_value_str.replace('$', '').replace(',', '').replace(' ', '')
            declared_value = float(cleaned_value)
            tariff_rate = self.get_tariff_rate()
            return declared_value * (tariff_rate / 100)
        except (ValueError, TypeError):
            return 0.0

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
            'tracking_number': self.tracking_number or '',
            # Tariff information
            'tariff_rate': self.get_tariff_rate(),
            'tariff_amount': self.calculate_tariff_amount()
        }
