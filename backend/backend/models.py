from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class TariffRate(db.Model):
    """Enhanced model for storing comprehensive tariff rates with goods category, postal service, and date ranges"""
    __tablename__ = 'tariff_rates'
    __table_args__ = (
        db.UniqueConstraint(
            'origin_country', 
            'destination_country',
            'goods_category',
            'postal_service',
            'start_date',
            'end_date',
            name='uix_tariff_comprehensive'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Route definition
    origin_country = db.Column(db.String(100), nullable=False)  # Origin country/station
    destination_country = db.Column(db.String(100), nullable=False)  # Destination country/station
    
    # Enhanced tariff variables from workflow diagram
    goods_category = db.Column(db.String(100), nullable=False, default='*')  # Goods category (e.g., Documents, Merchandise, Electronics, or * for all)
    postal_service = db.Column(db.String(100), nullable=False, default='*')  # Postal service type (e.g., EMS, E-packet, Registered Mail, or * for all)
    start_date = db.Column(db.Date, nullable=False)  # Rate validity start date
    end_date = db.Column(db.Date, nullable=False)  # Rate validity end date
    
    # Optional weight brackets for weight-based tariffs
    min_weight = db.Column(db.Float, default=None)  # Minimum weight (kg) for this rate
    max_weight = db.Column(db.Float, default=None)  # Maximum weight (kg) for this rate
    
    # Tariff configuration
    tariff_rate = db.Column(db.Float, default=0.8)  # Tariff rate (e.g., 0.8 = 80%)
    minimum_tariff = db.Column(db.Float, default=0.0)  # Minimum tariff amount
    maximum_tariff = db.Column(db.Float, default=None)  # Maximum tariff amount (optional)
    
    # Additional metadata
    currency = db.Column(db.String(10), default='USD')
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text)
    
    def to_dict(self):
        """Convert to dictionary for API responses with enhanced fields"""
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
            'min_weight': self.min_weight,
            'max_weight': self.max_weight,
            'tariff_rate': self.tariff_rate,
            'minimum_tariff': self.minimum_tariff,
            'maximum_tariff': self.maximum_tariff,
            'currency': self.currency,
            'is_active': self.is_active,
            'notes': self.notes or ''
        }
    
    def calculate_tariff(self, declared_value, weight=None):
        """Enhanced tariff calculation with optional weight consideration"""
        if not self.is_active or declared_value <= 0:
            return 0.0
        
        # Check weight brackets if applicable
        if weight is not None:
            if self.min_weight is not None and weight < self.min_weight:
                return 0.0
            if self.max_weight is not None and weight > self.max_weight:
                return 0.0
        
        tariff_amount = declared_value * self.tariff_rate
        
        # Apply minimum tariff
        if tariff_amount < self.minimum_tariff:
            tariff_amount = self.minimum_tariff
        
        # Apply maximum tariff if set
        if self.maximum_tariff and tariff_amount > self.maximum_tariff:
            tariff_amount = self.maximum_tariff
        
        return round(tariff_amount, 2)
    
    def is_applicable_for_date(self, date):
        """Check if this rate is valid for the given date"""
        return self.start_date <= date <= self.end_date if date else False
    
    def matches_criteria(self, goods_category=None, postal_service=None):
        """Check if this rate matches the given criteria (supports wildcards)"""
        goods_match = (self.goods_category == '*' or 
                      (goods_category and self.goods_category == goods_category) or
                      goods_category is None)
        
        service_match = (self.postal_service == '*' or 
                        (postal_service and self.postal_service == postal_service) or
                        postal_service is None)
        
        return goods_match and service_match
    
    def specificity_score(self):
        """Calculate specificity score for sorting (higher = more specific)"""
        score = 0
        if self.goods_category != '*':
            score += 4
        if self.postal_service != '*':
            score += 2
        if self.min_weight is not None or self.max_weight is not None:
            score += 1
        return score

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
    tariff_amount = db.Column(db.String(50))  # Tariff amount (calculated using enhanced tariff logic)
    
    # Enhanced tariff classification fields (for advanced tariff calculation)
    goods_category = db.Column(db.String(100), default='*')  # Derived from declared_content or user input
    postal_service = db.Column(db.String(100), default='*')  # Derived from input data or user specification
    shipment_date = db.Column(db.Date)  # Calculated shipment date for tariff rate lookup
    
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
            
            # Enhanced tariff classification fields
            'goods_category': self._clean_value(self.goods_category),
            'postal_service': self._clean_value(self.postal_service),
            'shipment_date': self.shipment_date.isoformat() if self.shipment_date else '',
            
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
    
    def classify_goods_category(self):
        """Automatically classify goods category based on declared content and HS code"""
        if not self.declared_content:
            return '*'
        
        content_lower = str(self.declared_content).lower().strip()
        
        # Document-related keywords
        if any(keyword in content_lower for keyword in ['document', 'paper', 'letter', 'mail', 'invoice', 'contract']):
            return 'Documents'
        
        # Electronics keywords  
        if any(keyword in content_lower for keyword in ['electronic', 'phone', 'computer', 'tablet', 'battery', 'charger']):
            return 'Electronics'
        
        # Clothing keywords
        if any(keyword in content_lower for keyword in ['clothing', 'shirt', 'dress', 'shoe', 'apparel', 'textile']):
            return 'Clothing'
        
        # Jewelry/Luxury keywords
        if any(keyword in content_lower for keyword in ['jewelry', 'watch', 'gold', 'silver', 'diamond', 'ring']):
            return 'Jewelry'
        
        # Medicine/Health keywords
        if any(keyword in content_lower for keyword in ['medicine', 'drug', 'supplement', 'vitamin', 'pharmaceutical']):
            return 'Medicine'
        
        # Use HS code for more specific classification if available
        if self.hs_code:
            hs_code = str(self.hs_code).strip()
            if hs_code.startswith(('61', '62', '63')):  # Textiles/Clothing
                return 'Clothing'
            elif hs_code.startswith(('84', '85')):  # Electronics/Machinery
                return 'Electronics'
            elif hs_code.startswith(('71',)):  # Jewelry
                return 'Jewelry'
            elif hs_code.startswith(('30',)):  # Pharmaceuticals
                return 'Medicine'
        
        # Default to general merchandise
        return 'Merchandise'
    
    def calculate_shipment_date(self):
        """Calculate the best shipment date from available date fields"""
        from datetime import datetime
        
        # Priority: flight_date_1 > arrival_date > created_at
        date_candidates = [
            self.flight_date_1,
            self.arrival_date,
        ]
        
        for date_str in date_candidates:
            if date_str:
                try:
                    # Try various date formats
                    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']:
                        try:
                            return datetime.strptime(str(date_str).split()[0], fmt).date()
                        except ValueError:
                            continue
                except:
                    continue
        
        # Fallback to creation date
        return self.created_at.date() if self.created_at else None
    
    def auto_populate_tariff_fields(self):
        """Automatically populate tariff classification fields"""
        if not self.goods_category or self.goods_category == '*':
            self.goods_category = self.classify_goods_category()
        
        if not self.shipment_date:
            self.shipment_date = self.calculate_shipment_date()
        
        # postal_service defaults to '*' but could be derived from other fields in the future