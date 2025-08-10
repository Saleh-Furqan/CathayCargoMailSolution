"""
Enhanced Tariff Calculation Engine for Cathay Cargo Mail Solution
Implements comprehensive tariff lookup and calculation logic based on workflow requirements
"""

from datetime import datetime, date
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import and_, or_
from models import db, TariffRate, ProcessedShipment
import pandas as pd


class TariffCalculator:
    """
    Advanced tariff calculation engine that implements the workflow requirements:
    - Multi-criteria rate lookup (origin, destination, goods category, postal service, date range)
    - Specificity-based rate selection (exact matches prioritized over wildcards)
    - Historical fallback when no configured rate exists
    - Batch processing capabilities for large datasets
    """
    
    def __init__(self):
        self.default_rate = 0.8  # 80% fallback rate
        self.rate_cache = {}  # Simple cache for frequently accessed rates
    
    def find_applicable_rate(
        self, 
        origin: str, 
        destination: str, 
        goods_category: str = '*',
        postal_service: str = '*',
        ship_date: Optional[date] = None,
        weight: Optional[float] = None
    ) -> Optional[TariffRate]:
        """
        Find the most applicable tariff rate based on specificity and date validity.
        
        Args:
            origin: Origin country/station code
            destination: Destination country/station code  
            goods_category: Goods category (e.g., 'Documents', 'Electronics', '*')
            postal_service: Postal service type (e.g., 'EMS', 'E-packet', '*')
            ship_date: Shipment date for rate validity check
            weight: Package weight for weight bracket filtering
            
        Returns:
            Most specific applicable TariffRate or None if no rate found
        """
        # Create cache key for rate lookup
        cache_key = f"{origin}|{destination}|{goods_category}|{postal_service}|{ship_date}|{weight}"
        if cache_key in self.rate_cache:
            return self.rate_cache[cache_key]
        
        # Query all active rates for the route
        query = TariffRate.query.filter_by(
            origin_country=origin,
            destination_country=destination,
            is_active=True
        )
        
        all_rates = query.all()
        if not all_rates:
            return None
        
        # Filter rates based on criteria
        applicable_rates = []
        
        for rate in all_rates:
            # Check goods category match (exact or wildcard)
            if not rate.matches_criteria(goods_category, postal_service):
                continue
            
            # Check date validity
            if ship_date and not rate.is_applicable_for_date(ship_date):
                continue
            
            # Check weight brackets if specified
            if weight is not None:
                if rate.min_weight is not None and weight < rate.min_weight:
                    continue
                if rate.max_weight is not None and weight > rate.max_weight:
                    continue
            
            applicable_rates.append(rate)
        
        if not applicable_rates:
            self.rate_cache[cache_key] = None
            return None
        
        # Sort by specificity (most specific first)
        applicable_rates.sort(key=lambda r: r.specificity_score(), reverse=True)
        
        selected_rate = applicable_rates[0]
        self.rate_cache[cache_key] = selected_rate
        return selected_rate
    
    def calculate_tariff_for_shipment(self, shipment: ProcessedShipment) -> Tuple[float, Optional[TariffRate]]:
        """
        Calculate tariff amount for a ProcessedShipment record.
        
        Args:
            shipment: ProcessedShipment instance with all required data
            
        Returns:
            Tuple of (calculated_tariff_amount, applied_rate)
        """
        # Auto-populate tariff classification fields if needed
        shipment.auto_populate_tariff_fields()
        
        # Get numeric values safely
        try:
            declared_value = float(shipment.declared_value) if shipment.declared_value else 0.0
            weight = float(shipment.bag_weight) if shipment.bag_weight else None
        except (ValueError, TypeError):
            declared_value = 0.0
            weight = None
        
        if declared_value <= 0:
            return 0.0, None
        
        # Find applicable rate
        rate = self.find_applicable_rate(
            origin=shipment.host_origin_station or '',
            destination=shipment.host_destination_station or '',
            goods_category=shipment.goods_category or '*',
            postal_service=shipment.postal_service or '*',
            ship_date=shipment.shipment_date,
            weight=weight
        )
        
        if rate:
            tariff_amount = rate.calculate_tariff(declared_value, weight)
            return tariff_amount, rate
        else:
            # Fallback to historical average or default rate
            fallback_tariff = self.calculate_fallback_tariff(
                shipment.host_origin_station,
                shipment.host_destination_station,
                declared_value
            )
            return fallback_tariff, None
    
    def calculate_fallback_tariff(
        self, 
        origin: str, 
        destination: str, 
        declared_value: float
    ) -> float:
        """
        Calculate fallback tariff using historical data when no rate is configured.
        
        Args:
            origin: Origin station
            destination: Destination station  
            declared_value: Package declared value
            
        Returns:
            Fallback tariff amount
        """
        try:
            # Query historical shipments for this route
            historical_query = db.session.query(
                db.func.sum(db.func.cast(ProcessedShipment.declared_value, db.Float)).label('total_declared_value'),
                db.func.sum(db.func.cast(ProcessedShipment.tariff_amount, db.Float)).label('total_tariff_amount')
            ).filter(
                and_(
                    ProcessedShipment.host_origin_station == origin,
                    ProcessedShipment.host_destination_station == destination,
                    ProcessedShipment.declared_value.isnot(None),
                    ProcessedShipment.tariff_amount.isnot(None)
                )
            ).first()
            
            if (historical_query and 
                historical_query.total_declared_value and 
                historical_query.total_declared_value > 0 and
                historical_query.total_tariff_amount):
                
                historical_rate = historical_query.total_tariff_amount / historical_query.total_declared_value
                return round(declared_value * historical_rate, 2)
            else:
                # Use default rate
                return round(declared_value * self.default_rate, 2)
                
        except Exception as e:
            print(f"Error calculating fallback tariff: {str(e)}")
            return round(declared_value * self.default_rate, 2)
    
    def process_batch_tariffs(self, shipment_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        Process tariffs for a batch of shipments (used during data processing).
        
        Args:
            shipment_ids: Optional list of specific shipment IDs to process
            
        Returns:
            Processing statistics
        """
        if shipment_ids:
            shipments = ProcessedShipment.query.filter(ProcessedShipment.id.in_(shipment_ids)).all()
        else:
            # Process all shipments without calculated tariffs
            shipments = ProcessedShipment.query.filter(
                or_(
                    ProcessedShipment.tariff_amount.is_(None),
                    ProcessedShipment.tariff_amount == '',
                    ProcessedShipment.tariff_amount == '0'
                )
            ).all()
        
        stats = {
            'total_processed': 0,
            'rates_applied': 0,
            'fallback_used': 0,
            'errors': 0,
            'total_tariff': 0.0
        }
        
        for shipment in shipments:
            try:
                tariff_amount, applied_rate = self.calculate_tariff_for_shipment(shipment)
                
                # Update shipment record
                shipment.tariff_amount = str(tariff_amount)
                
                # Update statistics
                stats['total_processed'] += 1
                stats['total_tariff'] += tariff_amount
                
                if applied_rate:
                    stats['rates_applied'] += 1
                else:
                    stats['fallback_used'] += 1
                    
            except Exception as e:
                print(f"Error processing tariff for shipment {shipment.id}: {str(e)}")
                stats['errors'] += 1
        
        # Commit all changes
        try:
            db.session.commit()
            print(f"Batch tariff processing completed: {stats}")
        except Exception as e:
            db.session.rollback()
            print(f"Error committing tariff calculations: {str(e)}")
            stats['errors'] += stats['total_processed']
            stats['total_processed'] = 0
        
        return stats
    
    def get_rate_coverage_report(self) -> Dict[str, Any]:
        """
        Generate a report showing tariff rate coverage across routes and categories.
        
        Returns:
            Coverage statistics and gaps
        """
        try:
            # Get all unique routes from shipments
            routes_query = db.session.query(
                ProcessedShipment.host_origin_station,
                ProcessedShipment.host_destination_station,
                db.func.count(ProcessedShipment.id).label('shipment_count')
            ).filter(
                and_(
                    ProcessedShipment.host_origin_station.isnot(None),
                    ProcessedShipment.host_destination_station.isnot(None)
                )
            ).group_by(
                ProcessedShipment.host_origin_station,
                ProcessedShipment.host_destination_station
            ).all()
            
            # Get all configured rates
            configured_rates = TariffRate.query.filter_by(is_active=True).all()
            rate_routes = set((rate.origin_country, rate.destination_country) for rate in configured_rates)
            
            coverage_stats = {
                'total_routes': len(routes_query),
                'covered_routes': 0,
                'uncovered_routes': [],
                'total_configured_rates': len(configured_rates),
                'rate_categories': {},
                'recommendations': []
            }
            
            for route in routes_query:
                origin, destination = route.host_origin_station, route.host_destination_station
                route_key = (origin, destination)
                
                if route_key in rate_routes:
                    coverage_stats['covered_routes'] += 1
                else:
                    coverage_stats['uncovered_routes'].append({
                        'origin': origin,
                        'destination': destination,
                        'shipment_count': route.shipment_count
                    })
            
            # Analyze rate categories
            for rate in configured_rates:
                category_key = f"{rate.goods_category}|{rate.postal_service}"
                if category_key not in coverage_stats['rate_categories']:
                    coverage_stats['rate_categories'][category_key] = 0
                coverage_stats['rate_categories'][category_key] += 1
            
            # Generate recommendations
            if coverage_stats['uncovered_routes']:
                coverage_stats['recommendations'].append(
                    f"Consider adding rates for {len(coverage_stats['uncovered_routes'])} uncovered routes"
                )
            
            coverage_percentage = (coverage_stats['covered_routes'] / coverage_stats['total_routes'] * 100) if coverage_stats['total_routes'] > 0 else 0
            coverage_stats['coverage_percentage'] = round(coverage_percentage, 1)
            
            return coverage_stats
            
        except Exception as e:
            print(f"Error generating rate coverage report: {str(e)}")
            return {'error': str(e)}
    
    def validate_rate_conflicts(self, rate_data: dict) -> List[str]:
        """
        Validate a new tariff rate for conflicts with existing rates.
        
        Args:
            rate_data: Dictionary with rate fields
            
        Returns:
            List of validation errors
        """
        errors = []
        
        # Check required fields
        required_fields = ['origin_country', 'destination_country', 'start_date', 'end_date']
        for field in required_fields:
            if not rate_data.get(field):
                errors.append(f"Missing required field: {field}")
        
        if errors:
            return errors
        
        try:
            start_date = datetime.strptime(rate_data['start_date'], '%Y-%m-%d').date()
            end_date = datetime.strptime(rate_data['end_date'], '%Y-%m-%d').date()
            
            if start_date >= end_date:
                errors.append("Start date must be before end date")
                
        except ValueError as e:
            errors.append(f"Invalid date format: {str(e)}")
            return errors
        
        # Check for overlapping rates
        overlapping_rates = TariffRate.query.filter(
            and_(
                TariffRate.origin_country == rate_data['origin_country'],
                TariffRate.destination_country == rate_data['destination_country'],
                TariffRate.goods_category == rate_data.get('goods_category', '*'),
                TariffRate.postal_service == rate_data.get('postal_service', '*'),
                TariffRate.is_active == True,
                or_(
                    and_(TariffRate.start_date <= start_date, TariffRate.end_date >= start_date),
                    and_(TariffRate.start_date <= end_date, TariffRate.end_date >= end_date),
                    and_(TariffRate.start_date >= start_date, TariffRate.end_date <= end_date)
                )
            )
        ).all()
        
        # Exclude the rate being updated (if editing)
        if rate_data.get('id'):
            overlapping_rates = [r for r in overlapping_rates if r.id != rate_data['id']]
        
        if overlapping_rates:
            overlap_details = []
            for rate in overlapping_rates:
                overlap_details.append(
                    f"Rate {rate.id} ({rate.start_date} to {rate.end_date})"
                )
            errors.append(f"Overlapping rates found: {', '.join(overlap_details)}")
        
        return errors


# Global instance for easy access
tariff_calculator = TariffCalculator()