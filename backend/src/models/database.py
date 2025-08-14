from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class TariffRate(db.Model):
    """Model for storing tariff rates between countries/stations with goods category, postal service, and date ranges"""
    __tablename__ = 'tariff_rates'
    # Removed unique constraint to allow same category in different time periods
    
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
        """Calculate tariff amount for a given declared value using category-specific rate"""
        if not self.is_active or declared_value <= 0:
            return 0.0
        
        # Use the tariff_rate directly (no more base + surcharge concept)
        tariff_amount = declared_value * self.tariff_rate
        
        # Apply minimum tariff
        if tariff_amount < self.minimum_tariff:
            tariff_amount = self.minimum_tariff
        
        # Apply maximum tariff if set
        if self.maximum_tariff and tariff_amount > self.maximum_tariff:
            tariff_amount = self.maximum_tariff
        
        return round(tariff_amount, 2)
    
    def get_effective_rate(self):
        """Get the effective tariff rate (direct category rate)"""
        return self.tariff_rate
    
    def is_base_rate(self):
        """Check if this is a wildcard rate (goods_category = '*')"""
        return self.goods_category == '*'
    
    def is_surcharge_rate(self):
        """Check if this is a category-specific rate (goods_category != '*')"""
        return self.goods_category != '*'
    
    @staticmethod
    def find_category_rate(origin, destination, goods_category, postal_service=None, ship_date=None, weight=None):
        """
        Find the tariff rate for a specific category only (no wildcard fallback)
        
        Args:
            origin: Origin country/station
            destination: Destination country/station
            goods_category: Goods category (must be specific, not '*')
            postal_service: Postal service (optional, defaults to '*')
            ship_date: Shipment date (optional, defaults to today)
            weight: Package weight (optional, used for weight-based filtering)
        
        Returns:
            TariffRate: Category rate or None
        """
        from datetime import date
        
        if ship_date is None:
            ship_date = date.today()
        if postal_service is None:
            postal_service = '*'
        
        # Only look for specific category rates (no wildcard fallback)
        if not goods_category or goods_category == '*':
            return None
        
        specific_query = TariffRate.query.filter(
            TariffRate.origin_country == origin,
            TariffRate.destination_country == destination,
            TariffRate.goods_category == goods_category,
            TariffRate.is_active == True,
            TariffRate.start_date <= ship_date,
            TariffRate.end_date >= ship_date
        )
        
        # Filter by postal service
        specific_rates = [r for r in specific_query.all() 
                         if r.postal_service in (postal_service, '*')]
        
        # Filter by weight if provided
        if weight is not None and specific_rates:
            weight_matches = [r for r in specific_rates 
                            if r.min_weight <= weight <= r.max_weight]
            if weight_matches:
                specific_rates = weight_matches
        
        if specific_rates:
            # Sort by specificity (most specific postal service first)
            def specificity_score(rate):
                return 1 if rate.postal_service != '*' else 0
            
            specific_rates.sort(key=specificity_score, reverse=True)
            return specific_rates[0]
        
        return None
    
    @staticmethod
    def calculate_tariff_for_shipment(origin, destination, declared_value, 
                                    goods_category=None, postal_service=None, ship_date=None, weight=None):
        """
        Calculate tariff for a shipment using direct category-based rates only
        
        Returns:
            dict: {
                'tariff_amount': float,
                'rate_used': TariffRate or None,
                'rate_percentage': float,
                'calculation_method': str,
                'error': str (if no rate found)
            }
        """
        from datetime import date
        
        if postal_service is None:
            postal_service = '*'
        if ship_date is None:
            ship_date = date.today()
        
        # Require specific category (no wildcard)
        if not goods_category or goods_category == '*':
            return {
                'tariff_amount': 0,
                'rate_used': None,
                'rate_percentage': 0,
                'calculation_method': 'error',
                'error': 'Specific goods category required for tariff calculation'
            }
        
        # Find the appropriate rate for the category
        rate_used = TariffRate.find_category_rate(origin, destination, goods_category, postal_service, ship_date, weight)
        
        if rate_used:
            # Calculate tariff amount using the found rate
            tariff_amount = declared_value * rate_used.tariff_rate
            
            # Apply minimum/maximum limits
            if tariff_amount < rate_used.minimum_tariff:
                tariff_amount = rate_used.minimum_tariff
            if rate_used.maximum_tariff and tariff_amount > rate_used.maximum_tariff:
                tariff_amount = rate_used.maximum_tariff
            
            return {
                'tariff_amount': round(tariff_amount, 2),
                'rate_used': rate_used,
                'rate_percentage': rate_used.tariff_rate,
                'calculation_method': 'configured_category',
                'error': None
            }
        else:
            # No fallback - return error
            return {
                'tariff_amount': 0,
                'rate_used': None,
                'rate_percentage': 0,
                'calculation_method': 'error',
                'error': f'No tariff rate found for category "{goods_category}" from {origin} to {destination}'
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


class FileUploadHistory(db.Model):
    """Model for tracking file upload history and their associated exports"""
    __tablename__ = 'file_upload_history'
    
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Original file information
    original_filename = db.Column(db.String(255), nullable=False)
    file_size_bytes = db.Column(db.BigInteger)
    file_hash = db.Column(db.String(64))  # SHA256 hash for duplicate detection
    upload_timestamp = db.Column(db.DateTime, default=datetime.now)
    
    # File processing information
    processing_status = db.Column(db.String(50), default='pending')  # 'pending', 'processed', 'failed'
    processing_started_at = db.Column(db.DateTime)
    processing_completed_at = db.Column(db.DateTime)
    processing_error = db.Column(db.Text)
    
    # Processing results
    records_imported = db.Column(db.Integer, default=0)
    records_skipped = db.Column(db.Integer, default=0)
    chinapost_records = db.Column(db.Integer, default=0)
    cbd_records = db.Column(db.Integer, default=0)
    
    # File storage as binary data (BLOB)
    original_file_data = db.Column(db.LargeBinary)  # Original uploaded file
    chinapost_file_data = db.Column(db.LargeBinary)  # Generated CHINAPOST export
    cbd_file_data = db.Column(db.LargeBinary)  # Generated CBD export
    
    # MIME types for proper file serving
    original_mime_type = db.Column(db.String(100), default='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    chinapost_mime_type = db.Column(db.String(100), default='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    cbd_mime_type = db.Column(db.String(100), default='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    # User and context information
    uploaded_by = db.Column(db.String(100), default='system')
    upload_notes = db.Column(db.Text)
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat() if self.created_at else '',
            'original_filename': self.original_filename,
            'file_size_bytes': self.file_size_bytes,
            'file_size_mb': round(self.file_size_bytes / (1024*1024), 2) if self.file_size_bytes else 0,
            'upload_timestamp': self.upload_timestamp.isoformat() if self.upload_timestamp else '',
            'processing_status': self.processing_status,
            'processing_started_at': self.processing_started_at.isoformat() if self.processing_started_at else '',
            'processing_completed_at': self.processing_completed_at.isoformat() if self.processing_completed_at else '',
            'processing_error': self.processing_error,
            'processing_duration_seconds': self._calculate_processing_duration(),
            'records_imported': self.records_imported,
            'records_skipped': self.records_skipped,
            'chinapost_records': self.chinapost_records,
            'cbd_records': self.cbd_records,
            'has_original_file': bool(self.original_file_data),
            'has_chinapost_export': bool(self.chinapost_file_data),
            'has_cbd_export': bool(self.cbd_file_data),
            'uploaded_by': self.uploaded_by,
            'upload_notes': self.upload_notes or ''
        }
    
    def _calculate_processing_duration(self):
        """Calculate processing duration in seconds"""
        if self.processing_started_at and self.processing_completed_at:
            duration = self.processing_completed_at - self.processing_started_at
            return round(duration.total_seconds(), 2)
        return None
    
    @classmethod
    def create_from_upload(cls, filename, file_size, file_hash, upload_notes=None):
        """Create a new file upload history record"""
        upload_record = cls()
        upload_record.original_filename = filename
        upload_record.file_size_bytes = file_size
        upload_record.file_hash = file_hash
        upload_record.upload_notes = upload_notes
        upload_record.processing_status = 'pending'
        
        db.session.add(upload_record)
        db.session.commit()
        return upload_record
    
    def mark_processing_started(self):
        """Mark processing as started"""
        self.processing_status = 'processing'
        self.processing_started_at = datetime.now()
        db.session.commit()
    
    def mark_processing_completed(self, records_imported=0, records_skipped=0, 
                                 chinapost_records=0, cbd_records=0):
        """Mark processing as completed successfully"""
        self.processing_status = 'processed'
        self.processing_completed_at = datetime.now()
        self.records_imported = records_imported
        self.records_skipped = records_skipped
        self.chinapost_records = chinapost_records
        self.cbd_records = cbd_records
        db.session.commit()
    
    def mark_processing_failed(self, error_message):
        """Mark processing as failed"""
        self.processing_status = 'failed'
        self.processing_completed_at = datetime.now()
        self.processing_error = error_message
        db.session.commit()
    
    def set_file_data(self, original_data=None, chinapost_data=None, cbd_data=None):
        """Set the file binary data"""
        if original_data is not None:
            self.original_file_data = original_data
        if chinapost_data is not None:
            self.chinapost_file_data = chinapost_data
        if cbd_data is not None:
            self.cbd_file_data = cbd_data
        db.session.commit()
    
    def get_file_data(self, file_type):
        """Get binary data for a specific file type"""
        if file_type == 'original':
            return self.original_file_data
        elif file_type == 'chinapost':
            return self.chinapost_file_data
        elif file_type == 'cbd':
            return self.cbd_file_data
        else:
            return None
    
    def get_mime_type(self, file_type):
        """Get MIME type for a specific file type"""
        if file_type == 'original':
            return self.original_mime_type or 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif file_type == 'chinapost':
            return self.chinapost_mime_type or 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif file_type == 'cbd':
            return self.cbd_mime_type or 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            return 'application/octet-stream'


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
            config = cls()
            config.config_key = key
            config.config_value = str(value)
            config.config_type = config_type
            config.description = description
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