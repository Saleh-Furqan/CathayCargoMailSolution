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
            'min_weight',
            'max_weight',
            name='uix_tariff_route_weight_extended'
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
    
    # Weight-based tariff fields
    min_weight = db.Column(db.Float, default=0.0)  # Minimum weight for this rate
    max_weight = db.Column(db.Float, default=999999.0)  # Maximum weight for this rate
    
    # Tariff configuration
    tariff_rate = db.Column(db.Float, default=0.8)  # Base tariff rate (e.g., 0.8 = 80%)
    category_surcharge = db.Column(db.Float, default=0.0)  # Category-specific surcharge (e.g., 0.1 = +10%)
    minimum_tariff = db.Column(db.Float, default=0.0)  # Minimum tariff amount
    maximum_tariff = db.Column(db.Float, default=None)  # Maximum tariff amount (optional)
    
    # Additional metadata
    currency = db.Column(db.String(10), default='USD')
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text)
    
    def validate_dates(self):
        """Validate date ranges"""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("Start date cannot be after end date")
    
    @classmethod
    def check_overlapping_rates(cls, origin_country, destination_country, goods_category, 
                               postal_service, start_date, end_date, exclude_id=None):
        """Check for overlapping rate periods for the same route/category/service"""
        query = cls.query.filter(
            cls.origin_country == origin_country,
            cls.destination_country == destination_country,
            cls.goods_category == goods_category,
            cls.postal_service == postal_service,
            cls.is_active == True,
            # Check for date overlap: new range overlaps if:
            # new_start <= existing_end AND new_end >= existing_start
            cls.start_date <= end_date,
            cls.end_date >= start_date
        )
        
        if exclude_id:
            query = query.filter(cls.id != exclude_id)
            
        return query.all()
    
    @classmethod
    def check_weight_range_overlap(cls, origin_country, destination_country, goods_category, 
                                  postal_service, start_date, end_date, min_weight, max_weight, exclude_id=None):
        """Check for overlapping weight ranges for the same route/category/service/date combination"""
        # Check for rates that have overlapping date and weight ranges
        query = cls.query.filter(
            cls.origin_country == origin_country,
            cls.destination_country == destination_country,
            cls.goods_category == goods_category,
            cls.postal_service == postal_service,
            cls.is_active == True,
            # Check for date overlap
            cls.start_date <= end_date,
            cls.end_date >= start_date,
            # Check for weight range overlap: new range overlaps if:
            # new_min <= existing_max AND new_max >= existing_min
            cls.min_weight <= max_weight,
            cls.max_weight >= min_weight
        )
        
        if exclude_id:
            query = query.filter(cls.id != exclude_id)
            
        return query.all()
    
    def validate_weight_range(self):
        """Validate weight range"""
        if self.min_weight is not None and self.max_weight is not None:
            if self.min_weight < 0:
                raise ValueError("Minimum weight cannot be negative")
            if self.max_weight < 0:
                raise ValueError("Maximum weight cannot be negative")
            if self.min_weight > self.max_weight:
                raise ValueError("Minimum weight cannot be greater than maximum weight")
    
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
            'min_weight': self.min_weight,
            'max_weight': self.max_weight,
            'tariff_rate': self.tariff_rate,
            'category_surcharge': self.category_surcharge,
            'minimum_tariff': self.minimum_tariff,
            'maximum_tariff': self.maximum_tariff,
            'currency': self.currency,
            'is_active': self.is_active,
            'notes': self.notes or ''
        }
    
    def calculate_tariff(self, declared_value):
        """Calculate tariff amount for a given declared value using base rate + category surcharge"""
        if not self.is_active or declared_value <= 0:
            return 0.0
        
        # Calculate using combined rate (base + surcharge)
        combined_rate = self.tariff_rate + (self.category_surcharge or 0.0)
        tariff_amount = declared_value * combined_rate
        
        # Apply minimum tariff
        if tariff_amount < self.minimum_tariff:
            tariff_amount = self.minimum_tariff
        
        # Apply maximum tariff if set
        if self.maximum_tariff and tariff_amount > self.maximum_tariff:
            tariff_amount = self.maximum_tariff
        
        return round(tariff_amount, 2)
    
    def get_effective_rate(self):
        """Get the effective tariff rate (base + surcharge)"""
        return self.tariff_rate + (self.category_surcharge or 0.0)
    
    def is_base_rate(self):
        """Check if this is a base rate (no category surcharge)"""
        return (self.category_surcharge or 0.0) == 0.0 and self.goods_category == '*'
    
    def is_surcharge_rate(self):
        """Check if this is a surcharge rate (has category surcharge)"""
        return (self.category_surcharge or 0.0) > 0.0
    
    @staticmethod
    def find_base_rate(origin, destination, postal_service=None, ship_date=None, weight=None):
        """
        Find the base tariff rate for a route (goods_category = '*')
        
        Args:
            origin: Origin country/station
            destination: Destination country/station
            postal_service: Postal service (optional, defaults to '*')
            ship_date: Shipment date (optional, defaults to today)
            weight: Package weight (optional, used for weight-based filtering)
        
        Returns:
            TariffRate: Base rate for the route or None
        """
        from datetime import date
        
        if ship_date is None:
            ship_date = date.today()
        if postal_service is None:
            postal_service = '*'
        
        # Query base rates (goods_category = '*' or 'All')
        base_query = TariffRate.query.filter(
            TariffRate.origin_country == origin,
            TariffRate.destination_country == destination,
            TariffRate.goods_category.in_(['*', 'All']),
            TariffRate.is_active == True,
            TariffRate.start_date <= ship_date,
            TariffRate.end_date >= ship_date
        )
        
        # Filter by postal service
        base_rates = [r for r in base_query.all() 
                     if r.postal_service in (postal_service, '*')]
        
        if not base_rates:
            return None
        
        # Filter by weight if provided
        if weight is not None:
            weight_matches = [r for r in base_rates 
                            if r.min_weight <= weight <= r.max_weight]
            if weight_matches:
                base_rates = weight_matches
        
        # Sort by specificity (most specific postal service first)
        def specificity_score(rate):
            return 1 if rate.postal_service != '*' else 0
        
        base_rates.sort(key=specificity_score, reverse=True)
        return base_rates[0]
    
    @staticmethod
    def find_surcharge_rate(origin, destination, goods_category, postal_service=None, ship_date=None, weight=None):
        """
        Find category-specific surcharge rate for a route
        
        Args:
            origin: Origin country/station
            destination: Destination country/station
            goods_category: Specific goods category (not '*')
            postal_service: Postal service (optional, defaults to '*')
            ship_date: Shipment date (optional, defaults to today)
            weight: Package weight (optional, used for weight-based filtering)
        
        Returns:
            TariffRate: Category surcharge rate or None
        """
        from datetime import date
        
        if ship_date is None:
            ship_date = date.today()
        if postal_service is None:
            postal_service = '*'
        if goods_category in ('*', 'All'):
            return None  # No surcharge for wildcard categories
        
        # Query surcharge rates (specific goods_category and category_surcharge > 0)
        surcharge_query = TariffRate.query.filter(
            TariffRate.origin_country == origin,
            TariffRate.destination_country == destination,
            TariffRate.goods_category == goods_category,
            TariffRate.category_surcharge > 0,
            TariffRate.is_active == True,
            TariffRate.start_date <= ship_date,
            TariffRate.end_date >= ship_date
        )
        
        # Filter by postal service
        surcharge_rates = [r for r in surcharge_query.all() 
                          if r.postal_service in (postal_service, '*')]
        
        if not surcharge_rates:
            return None
        
        # Filter by weight if provided
        if weight is not None:
            weight_matches = [r for r in surcharge_rates 
                            if r.min_weight <= weight <= r.max_weight]
            if weight_matches:
                surcharge_rates = weight_matches
        
        # Sort by specificity (most specific postal service first)
        def specificity_score(rate):
            return 1 if rate.postal_service != '*' else 0
        
        surcharge_rates.sort(key=specificity_score, reverse=True)
        return surcharge_rates[0]
    
    @staticmethod
    def calculate_tariff_for_shipment(origin, destination, declared_value, 
                                    goods_category=None, postal_service=None, ship_date=None, weight=None):
        """
        Calculate tariff for a shipment using base rate + category surcharge system
        
        Returns:
            dict: {
                'tariff_amount': float,
                'base_rate': TariffRate or None,
                'surcharge_rate': TariffRate or None,
                'combined_rate': float,
                'base_rate_percentage': float,
                'surcharge_percentage': float,
                'calculation_method': str,
                'fallback_used': bool
            }
        """
        from datetime import date
        
        if goods_category is None:
            goods_category = '*'
        if postal_service is None:
            postal_service = '*'
        if ship_date is None:
            ship_date = date.today()
        
        # Step 1: Find base rate for the route
        base_rate = TariffRate.find_base_rate(origin, destination, postal_service, ship_date, weight)
        
        # Step 2: Find category surcharge if goods_category is specific
        surcharge_rate = None
        if goods_category not in ('*', 'All'):
            surcharge_rate = TariffRate.find_surcharge_rate(origin, destination, goods_category, postal_service, ship_date, weight)
        
        if base_rate:
            # Calculate combined rate
            base_percentage = base_rate.tariff_rate
            surcharge_percentage = surcharge_rate.category_surcharge if surcharge_rate else 0.0
            combined_rate = base_percentage + surcharge_percentage
            
            # Calculate tariff amount
            tariff_amount = declared_value * combined_rate
            
            # Apply minimum/maximum limits from base rate
            if tariff_amount < base_rate.minimum_tariff:
                tariff_amount = base_rate.minimum_tariff
            if base_rate.maximum_tariff and tariff_amount > base_rate.maximum_tariff:
                tariff_amount = base_rate.maximum_tariff
            
            calculation_method = 'configured_with_surcharge' if surcharge_rate else 'configured_no_surcharge'
            
            return {
                'tariff_amount': round(tariff_amount, 2),
                'base_rate': base_rate,
                'surcharge_rate': surcharge_rate,
                'combined_rate': combined_rate,
                'base_rate_percentage': base_percentage,
                'surcharge_percentage': surcharge_percentage,
                'calculation_method': calculation_method,
                'fallback_used': False
            }
        else:
            # Fallback: use dynamic fallback rate
            fallback_rate = SystemConfig.get_fallback_rate()
            tariff_amount = declared_value * fallback_rate
            
            return {
                'tariff_amount': round(tariff_amount, 2),
                'base_rate': None,
                'surcharge_rate': None,
                'combined_rate': fallback_rate,
                'base_rate_percentage': fallback_rate,
                'surcharge_percentage': 0.0,
                'calculation_method': 'fallback',
                'fallback_used': True,
                'fallback_rate': fallback_rate
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
    bag_weight = db.Column(db.Float)  # Bag weight (numeric for calculations)
    bag_number = db.Column(db.String(50))  # Bag Number
    declared_content = db.Column(db.Text)  # Declared content
    hs_code = db.Column(db.String(100))  # HS Code
    declared_value = db.Column(db.Float)  # Declared Value (numeric for calculations)
    currency = db.Column(db.String(10))  # Currency
    number_of_packets = db.Column(db.Integer)  # Number of Packet under same receptacle
    tariff_amount = db.Column(db.Float)  # Tariff amount (calculated from rates)
    
    # Enhanced tariff classification fields (for automatic tariff calculation)
    goods_category = db.Column(db.String(100), default='*')  # Derived goods category
    postal_service = db.Column(db.String(100), default='*')  # Detected postal service
    shipment_date = db.Column(db.Date)  # Date for tariff calculation
    
    # Tariff calculation metadata
    tariff_rate_used = db.Column(db.Float)  # Actual base rate applied (0.8 = 80%)
    tariff_surcharge_used = db.Column(db.Float, default=0.0)  # Actual surcharge applied (0.1 = +10%)
    base_rate_id = db.Column(db.Integer)  # ID of base rate used
    surcharge_rate_id = db.Column(db.Integer)  # ID of surcharge rate used (if any)
    tariff_calculation_method = db.Column(db.String(30), default='fallback')  # 'configured_with_surcharge', 'configured_no_surcharge', or 'fallback'
    
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
            'bag_weight': self.bag_weight if self.bag_weight is not None else 0.0,
            'bag_number': self._clean_value(self.bag_number),
            'declared_content': self._clean_value(self.declared_content),
            'hs_code': self._clean_value(self.hs_code),
            'declared_value': self.declared_value if self.declared_value is not None else 0.0,
            'currency': self._clean_value(self.currency),
            'number_of_packets': self.number_of_packets if self.number_of_packets is not None else 0,
            'tariff_amount': self.tariff_amount if self.tariff_amount is not None else 0.0,
            'goods_category': self._clean_value(self.goods_category),
            'postal_service': self._clean_value(self.postal_service),
            'shipment_date': self.shipment_date.isoformat() if self.shipment_date else '',
            'tariff_rate_used': self.tariff_rate_used,
            'tariff_surcharge_used': self.tariff_surcharge_used or 0.0,
            'base_rate_id': self.base_rate_id,
            'surcharge_rate_id': self.surcharge_rate_id,
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


class SystemConfig(db.Model):
    """Model for storing system configuration settings"""
    __tablename__ = 'system_config'
    
    id = db.Column(db.Integer, primary_key=True)
    config_key = db.Column(db.String(100), unique=True, nullable=False)
    config_value = db.Column(db.String(500), nullable=False)
    config_type = db.Column(db.String(20), default='string')  # 'string', 'float', 'int', 'boolean'
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @classmethod
    def get_fallback_rate(cls):
        """Get the dynamic fallback tariff rate"""
        config = cls.query.filter_by(config_key='fallback_tariff_rate').first()
        if config:
            try:
                return float(config.config_value)
            except (ValueError, TypeError):
                pass
        
        # If no config found or invalid value, calculate from historical average
        from sqlalchemy import func
        avg_rate = db.session.query(func.avg(TariffRate.tariff_rate)).filter(
            TariffRate.is_active == True
        ).scalar()
        
        if avg_rate and avg_rate > 0:
            # Store the calculated rate for future use
            cls.set_config('fallback_tariff_rate', str(avg_rate), 'float', 
                          'Dynamic fallback rate calculated from historical averages')
            return float(avg_rate)
        else:
            # Final fallback to 0.8 (80%)
            return 0.8
    
    @classmethod
    def set_config(cls, key, value, config_type='string', description=None):
        """Set a configuration value"""
        config = cls.query.filter_by(config_key=key).first()
        if config:
            config.config_value = str(value)
            config.config_type = config_type
            config.description = description or config.description
            config.updated_at = datetime.utcnow()
        else:
            config = cls(
                config_key=key,
                config_value=str(value),
                config_type=config_type,
                description=description
            )
            db.session.add(config)
        
        db.session.commit()
        return config
    
    @classmethod
    def get_config(cls, key, default=None, config_type='string'):
        """Get a configuration value with type conversion"""
        config = cls.query.filter_by(config_key=key).first()
        if not config:
            return default
        
        try:
            if config_type == 'float':
                return float(config.config_value)
            elif config_type == 'int':
                return int(config.config_value)
            elif config_type == 'boolean':
                return config.config_value.lower() in ('true', '1', 'yes')
            else:
                return config.config_value
        except (ValueError, TypeError):
            return default