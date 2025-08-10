from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class TariffRate(db.Model):
    """Model for storing tariff rates between countries/stations with goods category, postal service, and date ranges"""
    __tablename__ = 'tariff_rates'
    __table_args__ = (
        db.UniqueConstraint(
            'origin_country', 
            'destination_country',
            'goods_category',
            'postal_service',
            'start_date',
            'end_date',
            name='uix_tariff_route_extended'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Route definition
    origin_country = db.Column(db.String(100), nullable=False)  # Origin country/station
    destination_country = db.Column(db.String(100), nullable=False)  # Destination country/station
    
    # Enhanced tariff classification
    goods_category = db.Column(db.String(100), default='*')  # Goods category (e.g., 'Documents', 'Merchandise', '*' for all)
    postal_service = db.Column(db.String(100), default='*')  # Postal service (e.g., 'EMS', 'E-packet', '*' for all)
    
    # Date range for rate validity
    start_date = db.Column(db.Date, nullable=False, default=lambda: datetime.now().date())  # Rate validity start
    end_date = db.Column(db.Date, nullable=False, default=lambda: datetime(2099, 12, 31).date())  # Rate validity end
    
    # Tariff configuration
    tariff_rate = db.Column(db.Float, default=0.8)  # Tariff rate (e.g., 0.8 = 80%)
    minimum_tariff = db.Column(db.Float, default=0.0)  # Minimum tariff amount
    maximum_tariff = db.Column(db.Float, default=None)  # Maximum tariff amount (optional)
    
    # Additional metadata
    currency = db.Column(db.String(10), default='USD')
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text)
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat() if self.created_at else '',
            'updated_at': self.updated_at.isoformat() if self.updated_at else '',
            'origin_country': self.origin_country,
            'destination_country': self.destination_country,
            'goods_category': self.goods_category,
            'postal_service': self.postal_service,
            'start_date': self.start_date.isoformat() if self.start_date else '',
            'end_date': self.end_date.isoformat() if self.end_date else '',
            'tariff_rate': self.tariff_rate,
            'minimum_tariff': self.minimum_tariff,
            'maximum_tariff': self.maximum_tariff,
            'currency': self.currency,
            'is_active': self.is_active,
            'notes': self.notes or ''
        }
    
    def calculate_tariff(self, declared_value):
        """Calculate tariff amount for a given declared value"""
        if not self.is_active or declared_value <= 0:
            return 0.0
        
        tariff_amount = declared_value * self.tariff_rate
        
        # Apply minimum tariff
        if tariff_amount < self.minimum_tariff:
            tariff_amount = self.minimum_tariff
        
        # Apply maximum tariff if set
        if self.maximum_tariff and tariff_amount > self.maximum_tariff:
            tariff_amount = self.maximum_tariff
        
        return round(tariff_amount, 2)
    
    @staticmethod
    def find_applicable_rate(origin, destination, goods_category=None, postal_service=None, ship_date=None):
        """
        Find the most applicable tariff rate for given parameters
        Prioritizes exact matches over wildcard matches
        
        Args:
            origin: Origin country/station
            destination: Destination country/station
            goods_category: Goods category (optional, defaults to '*')
            postal_service: Postal service (optional, defaults to '*')
            ship_date: Shipment date (optional, defaults to today)
        
        Returns:
            TariffRate: Most specific matching rate or None
        """
        from datetime import date
        
        if ship_date is None:
            ship_date = date.today()
        if goods_category is None:
            goods_category = '*'
        if postal_service is None:
            postal_service = '*'
        
        # Query active rates for matching origin/destination
        base_query = TariffRate.query.filter_by(
            origin_country=origin,
            destination_country=destination,
            is_active=True
        )
        
        # Filter by date range
        valid_rates = base_query.filter(
            TariffRate.start_date <= ship_date,
            TariffRate.end_date >= ship_date
        ).all()
        
        # Filter by goods_category (exact match or wildcard)
        category_matches = [r for r in valid_rates 
                          if r.goods_category in (goods_category, '*')]
        
        # Filter by postal_service (exact match or wildcard)
        service_matches = [r for r in category_matches 
                         if r.postal_service in (postal_service, '*')]
        
        if not service_matches:
            return None
        
        # Sort by specificity (most specific first)
        # Priority: exact category & service > exact category only > exact service only > wildcards
        def specificity_score(rate):
            score = 0
            if rate.goods_category != '*':
                score += 2
            if rate.postal_service != '*':
                score += 1
            return score
        
        service_matches.sort(key=specificity_score, reverse=True)
        return service_matches[0]
    
    @staticmethod
    def calculate_tariff_for_shipment(origin, destination, declared_value, 
                                    goods_category=None, postal_service=None, ship_date=None):
        """
        Calculate tariff for a shipment using the most applicable rate
        
        Returns:
            dict: {'tariff_amount': float, 'rate_used': TariffRate or None, 'fallback_used': bool}
        """
        rate = TariffRate.find_applicable_rate(origin, destination, goods_category, postal_service, ship_date)
        
        if rate:
            return {
                'tariff_amount': rate.calculate_tariff(declared_value),
                'rate_used': rate,
                'fallback_used': False
            }
        else:
            # Fallback: use historical average or default rate (80%)
            fallback_rate = 0.8
            tariff_amount = declared_value * fallback_rate
            return {
                'tariff_amount': round(tariff_amount, 2),
                'rate_used': None,
                'fallback_used': True
            }

class ProcessedShipment(db.Model):
    """Model for storing processed CHINAPOST export data (the complete workflow output)"""
    __tablename__ = 'processed_shipments'
    __table_args__ = (
        db.UniqueConstraint(
            'tracking_number', 
            'receptacle_id',
            'pawb',
            name='uix_shipment_unique'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Core identification fields (from CHINAPOST export structure)
    sequence_number = db.Column(db.String(10))  # The unnamed first column (1, 2, 3...)
    pawb = db.Column(db.String(100))  # PAWB
    cardit = db.Column(db.String(100))  # CARDIT
    tracking_number = db.Column(db.String(100))  # Tracking Number
    receptacle_id = db.Column(db.String(200))  # Receptacle
    
    # Flight and routing information
    host_origin_station = db.Column(db.String(50))  # Host Origin Station
    host_destination_station = db.Column(db.String(50))  # Host Destination Station
    
    # Dynamic flight leg fields (can have 1, 2, 3... legs)
    flight_carrier_1 = db.Column(db.String(50))  # Flight Carrier 1
    flight_number_1 = db.Column(db.String(50))  # Flight Number 1
    flight_date_1 = db.Column(db.String(50))  # Flight Date 1
    flight_carrier_2 = db.Column(db.String(50))  # Flight Carrier 2
    flight_number_2 = db.Column(db.String(50))  # Flight Number 2
    flight_date_2 = db.Column(db.String(50))  # Flight Date 2
    flight_carrier_3 = db.Column(db.String(50))  # Flight Carrier 3 (if needed)
    flight_number_3 = db.Column(db.String(50))  # Flight Number 3 (if needed)
    flight_date_3 = db.Column(db.String(50))  # Flight Date 3 (if needed)
    
    # Arrival and ULD information
    arrival_date = db.Column(db.String(50))  # Arrival Date
    arrival_uld_number = db.Column(db.String(100))  # Arrival ULD number
    
    # Package and content details
    bag_weight = db.Column(db.String(50))  # Bag weight
    bag_number = db.Column(db.String(50))  # Bag Number
    declared_content = db.Column(db.Text)  # Declared content
    hs_code = db.Column(db.String(100))  # HS Code
    declared_value = db.Column(db.String(50))  # Declared Value
    currency = db.Column(db.String(10))  # Currency
    number_of_packets = db.Column(db.String(50))  # Number of Packet under same receptacle
    tariff_amount = db.Column(db.String(50))  # Tariff amount (calculated from rates)
    
    # Enhanced tariff fields
    declared_content_category = db.Column(db.String(100))  # Derived goods category for tariff calculation
    postal_service_type = db.Column(db.String(100))  # Postal service type for tariff calculation
    tariff_rate_used = db.Column(db.Float)  # Actual rate used for calculation
    tariff_calculation_method = db.Column(db.String(50))  # 'configured' or 'fallback'
    
    # CBD export derived fields (computed from CHINAPOST data)
    carrier_code = db.Column(db.String(50))  # Highest leg carrier for CBD
    flight_trip_number = db.Column(db.String(50))  # Highest leg flight for CBD
    arrival_port_code = db.Column(db.String(50))  # Port code for CBD
    arrival_date_formatted = db.Column(db.String(50))  # Formatted date for CBD
    declared_value_usd = db.Column(db.String(50))  # USD formatted value for CBD

    def _clean_value(self, value):
        """Clean value to remove NaN/null strings"""
        if value is None:
            return ''
        val_str = str(value).lower().strip()
        if val_str in ['nan', 'null', 'none', 'n/a', 'na']:
            return ''
        return str(value)

    def to_dict(self):
        """Convert entry to dictionary for API responses with clean values"""
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat() if self.created_at else '',
            
            # Core identification
            'sequence_number': self._clean_value(self.sequence_number),
            'pawb': self._clean_value(self.pawb),
            'cardit': self._clean_value(self.cardit),
            'tracking_number': self._clean_value(self.tracking_number),
            'receptacle_id': self._clean_value(self.receptacle_id),
            
            # Flight and routing
            'host_origin_station': self._clean_value(self.host_origin_station),
            'host_destination_station': self._clean_value(self.host_destination_station),
            'flight_carrier_1': self._clean_value(self.flight_carrier_1),
            'flight_number_1': self._clean_value(self.flight_number_1),
            'flight_date_1': self._clean_value(self.flight_date_1),
            'flight_carrier_2': self._clean_value(self.flight_carrier_2),
            'flight_number_2': self._clean_value(self.flight_number_2),
            'flight_date_2': self._clean_value(self.flight_date_2),
            'flight_carrier_3': self._clean_value(self.flight_carrier_3),
            'flight_number_3': self._clean_value(self.flight_number_3),
            'flight_date_3': self._clean_value(self.flight_date_3),
            
            # Arrival and ULD
            'arrival_date': self._clean_value(self.arrival_date),
            'arrival_uld_number': self._clean_value(self.arrival_uld_number),
            
            # Package details
            'bag_weight': self._clean_value(self.bag_weight),
            'bag_number': self._clean_value(self.bag_number),
            'declared_content': self._clean_value(self.declared_content),
            'hs_code': self._clean_value(self.hs_code),
            'declared_value': self._clean_value(self.declared_value),
            'currency': self._clean_value(self.currency),
            'number_of_packets': self._clean_value(self.number_of_packets),
            'tariff_amount': self._clean_value(self.tariff_amount),
            'declared_content_category': self._clean_value(self.declared_content_category),
            'postal_service_type': self._clean_value(self.postal_service_type),
            'tariff_rate_used': self.tariff_rate_used,
            'tariff_calculation_method': self._clean_value(self.tariff_calculation_method),
            
            # CBD export fields
            'carrier_code': self._clean_value(self.carrier_code),
            'flight_trip_number': self._clean_value(self.flight_trip_number),
            'arrival_port_code': self._clean_value(self.arrival_port_code),
            'arrival_date_formatted': self._clean_value(self.arrival_date_formatted),
            'declared_value_usd': self._clean_value(self.declared_value_usd)
        }
    
    def to_chinapost_format(self):
        """Convert to CHINAPOST export format for frontend display"""
        return {
            '': self.sequence_number or '',
            'PAWB': self.pawb or '',
            'CARDIT': self.cardit or '',
            'Host Origin Station': self.host_origin_station or '',
            'Host Destination Station': self.host_destination_station or '',
            'Flight Carrier 1': self.flight_carrier_1 or '',
            'Flight Number 1': self.flight_number_1 or '',
            'Flight Date 1': self.flight_date_1 or '',
            'Flight Carrier 2': self.flight_carrier_2 or '',
            'Flight Number 2': self.flight_number_2 or '',
            'Flight Date 2': self.flight_date_2 or '',
            'Flight Carrier 3': self.flight_carrier_3 or '',
            'Flight Number 3': self.flight_number_3 or '',
            'Flight Date 3': self.flight_date_3 or '',
            'Arrival Date': self.arrival_date or '',
            'Arrival ULD number': self.arrival_uld_number or '',
            'Receptacle': self.receptacle_id or '',
            'Bag weight': self.bag_weight or '',
            'Bag Number': self.bag_number or '',
            'Tracking Number': self.tracking_number or '',
            'Declared content': self.declared_content or '',
            'HS Code': self.hs_code or '',
            'Declared Value': self.declared_value or '',
            'Currency': self.currency or '',
            'Number of Packet under same receptacle': self.number_of_packets or '',
            'Tariff amount': self.tariff_amount or ''
        }
    
    def to_cbd_format(self):
        """Convert to CBD export format for frontend display"""
        return {
            'Carrier Code': self.carrier_code or '',
            'Flight/Trip Number': self.flight_trip_number or '',
            'Tracking Number': self.tracking_number or '',
            'Arrival Port Code': self.arrival_port_code or '',
            'Arrival Date': self.arrival_date_formatted or '',
            'Declared Value (USD)': self.declared_value_usd or ''
        }