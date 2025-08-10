from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_migrate import Migrate
import pandas as pd
import io
import os
from datetime import datetime, date
from models import db, ProcessedShipment, TariffRate, SystemConfig
from config import Config
from sqlalchemy import func, and_, or_
from data_processor import DataProcessor

def _safe_float(value):
    """Safely convert value to float, return None if invalid"""
    from data_converter import safe_float_conversion
    return safe_float_conversion(value)

def _safe_int(value):
    """Safely convert value to int, return None if invalid"""
    from data_converter import safe_int_conversion
    return safe_int_conversion(value)

app = Flask(__name__)
app.config.from_object(Config)

# Initialize the database
db.init_app(app)
migrate = Migrate(app, db)
CORS(app)

# Create database tables
with app.app_context():
    db.create_all()

# IODA data file path (the preprocessed master data)
import os
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IODA_DATA_FILE = os.path.join(PROJECT_ROOT, "data processing", "master_cardit_inner_event_df(IODA DATA).xlsx")

def save_chinapost_data_to_database(chinapost_df: pd.DataFrame, cbd_df: pd.DataFrame) -> tuple:
    """Save CHINAPOST export data to database with CBD export fields"""
    new_entries = 0
    skipped_entries = 0
    
    # Create a mapping of CBD data for easy lookup
    cbd_dict = {}
    if not cbd_df.empty:
        for _, cbd_row in cbd_df.iterrows():
            tracking_num = cbd_row.get('Tracking Number', '')
            cbd_dict[tracking_num] = {
                'carrier_code': cbd_row.get('Carrier Code', ''),
                'flight_trip_number': cbd_row.get('Flight/Trip Number', ''),
                'arrival_port_code': cbd_row.get('Arrival Port Code', ''),
                'arrival_date_formatted': cbd_row.get('Arrival Date', ''),
                'declared_value_usd': cbd_row.get('Declared Value (USD)', '')
            }
    
    for _, row in chinapost_df.iterrows():
        # Check if entry already exists
        tracking_number = str(row.get('Tracking Number', ''))
        receptacle_id = str(row.get('Receptacle', ''))
        pawb = str(row.get('PAWB', ''))
        
        existing_entry = ProcessedShipment.query.filter_by(
            tracking_number=tracking_number,
            receptacle_id=receptacle_id,
            pawb=pawb
        ).first()
        
        if existing_entry:
            skipped_entries += 1
            continue  # Skip duplicate entry
        
        # Get CBD data for this tracking number
        cbd_data = cbd_dict.get(tracking_number, {})
        
        # Create new processed shipment entry
        entry = ProcessedShipment(
            # Core identification
            sequence_number=str(row.get('', '')),
            pawb=pawb,
            cardit=str(row.get('CARDIT', '')),
            tracking_number=tracking_number,
            receptacle_id=receptacle_id,
            
            # Flight and routing information
            host_origin_station=str(row.get('Host Origin Station', '')),
            host_destination_station=str(row.get('Host Destination Station', '')),
            flight_carrier_1=str(row.get('Flight Carrier 1', '')),
            flight_number_1=str(row.get('Flight Number 1', '')),
            flight_date_1=str(row.get('Flight Date 1', '')),
            flight_carrier_2=str(row.get('Flight Carrier 2', '')),
            flight_number_2=str(row.get('Flight Number 2', '')),
            flight_date_2=str(row.get('Flight Date 2', '')),
            flight_carrier_3=str(row.get('Flight Carrier 3', '')),
            flight_number_3=str(row.get('Flight Number 3', '')),
            flight_date_3=str(row.get('Flight Date 3', '')),
            
            # Arrival and ULD information
            arrival_date=str(row.get('Arrival Date', '')),
            arrival_uld_number=str(row.get('Arrival ULD number', '')),
            
            # Package and content details
            bag_weight=_safe_float(row.get('Bag weight')),
            bag_number=str(row.get('Bag Number', '')),
            declared_content=str(row.get('Declared content', '')),
            hs_code=str(row.get('HS Code', '')),
            declared_value=_safe_float(row.get('Declared Value')),
            currency=str(row.get('Currency', '')),
            number_of_packets=_safe_int(row.get('Number of Packet under same receptacle')),
            tariff_amount=_safe_float(row.get('Tariff amount')),
            
            # Enhanced tariff fields
            goods_category=str(row.get('Declared content category', '')),
            postal_service=str(row.get('Postal service type', '')),
            tariff_rate_used=row.get('Tariff rate used') if pd.notnull(row.get('Tariff rate used')) else None,
            tariff_calculation_method=str(row.get('Tariff calculation method', '')),
            shipment_date=row.get('Shipment date') if pd.notnull(row.get('Shipment date')) else None,
            
            # CBD export derived fields
            carrier_code=cbd_data.get('carrier_code', ''),
            flight_trip_number=cbd_data.get('flight_trip_number', ''),
            arrival_port_code=cbd_data.get('arrival_port_code', ''),
            arrival_date_formatted=cbd_data.get('arrival_date_formatted', ''),
            declared_value_usd=cbd_data.get('declared_value_usd', '')
        )
        
        db.session.add(entry)
        new_entries += 1
    
    return new_entries, skipped_entries

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    record_count = ProcessedShipment.query.count()
    return jsonify({
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "database_records": record_count
    })

@app.route('/upload-cnp-file', methods=['POST'])
def upload_cnp_file():
    """Upload and process raw CNP Excel file using the correct workflow"""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Check file extension
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            return jsonify({"error": "Invalid file format. Please upload an Excel file."}), 400
        
        # Save uploaded file temporarily
        temp_path = f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        file.save(temp_path)
        
        try:
            # Read the raw CNP data from the first sheet (header=None for custom parsing)
            cnp_df = pd.read_excel(temp_path, sheet_name='Raw data provided by CNP', header=None)
            
            # Check if IODA file exists before processing
            if not os.path.exists(IODA_DATA_FILE):
                return jsonify({
                    "error": f"IODA data file not found at {IODA_DATA_FILE}. Please ensure the master IODA data file is available.",
                    "details": "The IODA (master_cardit_inner_event_df) file is required for data processing but cannot be found."
                }), 500
            
            # Initialize data processor with correct IODA file
            processor = DataProcessor(IODA_DATA_FILE)
            
            # Process the data to get both CHINAPOST and CBD formats
            chinapost_df, cbd_df = processor.process_cnp_data(cnp_df)
            
            if chinapost_df is not None and not chinapost_df.empty:
                # Save processed data to database
                new_entries, skipped_entries = save_chinapost_data_to_database(chinapost_df, cbd_df)
                db.session.commit()
                print(f"Saved to database: {new_entries} new entries, {skipped_entries} duplicates skipped")
                
                # Calculate tariff method statistics
                configured_count = 0
                fallback_count = 0
                if 'Tariff calculation method' in chinapost_df.columns:
                    method_counts = chinapost_df['Tariff calculation method'].value_counts()
                    configured_count = method_counts.get('configured', 0)
                    fallback_count = method_counts.get('fallback', 0)
                
            else:
                new_entries, skipped_entries = 0, 0
                configured_count, fallback_count = 0, 0
            
            return jsonify({
                "success": True,
                "message": "CNP file processed successfully using correct workflow",
                "results": {
                    "chinapost_export": {
                        "available": True,
                        "records_processed": len(chinapost_df) if not chinapost_df.empty else 0
                    },
                    "cbd_export": {
                        "available": True,
                        "records_processed": len(cbd_df) if not cbd_df.empty else 0
                    }
                },
                "total_records": len(chinapost_df) if chinapost_df is not None else 0,
                "new_entries": new_entries,
                "skipped_duplicates": skipped_entries,
                "tariff_method_stats": {
                    "configured_rates": configured_count,
                    "fallback_rates": fallback_count,
                    "configured_percentage": round((configured_count / (configured_count + fallback_count) * 100), 2) if (configured_count + fallback_count) > 0 else 0,
                    "fallback_percentage": round((fallback_count / (configured_count + fallback_count) * 100), 2) if (configured_count + fallback_count) > 0 else 0
                }
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        # Clean up temporary file in case of error
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500

@app.route('/historical-data', methods=['POST'])
def get_historical_data():
    """Get historical processed shipment data with enhanced filtering - NO FRONTEND PROCESSING"""
    try:
        data = request.json
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        goods_category = data.get('goodsCategory')
        postal_service = data.get('postalService')
        calculation_method = data.get('calculationMethod')

        # Query the database
        query = ProcessedShipment.query

        if start_date and end_date:
            # Filter by arrival_date field (converted to date)
            query = query.filter(
                and_(
                    ProcessedShipment.arrival_date.isnot(None),
                    ProcessedShipment.arrival_date != '',
                    func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) >= start_date,
                    func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) <= end_date
                )
            )
        
        # Enhanced filtering by goods category
        if goods_category and goods_category != '*':
            query = query.filter(ProcessedShipment.goods_category == goods_category)
        
        # Enhanced filtering by postal service
        if postal_service and postal_service != '*':
            query = query.filter(ProcessedShipment.postal_service == postal_service)
        
        # Enhanced filtering by calculation method
        if calculation_method and calculation_method != 'all':
            query = query.filter(ProcessedShipment.tariff_calculation_method == calculation_method)

        # Execute query and return RAW database records
        entries = query.all()
        
        # Return cleaned database data with NaN/null filtering
        results = []
        for entry in entries:
            # Get base dictionary and clean up NaN/null values
            record_dict = entry.to_dict()
            
            # Clean up common fields that may contain invalid values
            for field in ['declared_value', 'tariff_amount', 'bag_weight', 'currency']:
                if field in record_dict and record_dict[field]:
                    val_str = str(record_dict[field]).lower().strip()
                    if val_str in ['nan', 'null', 'none', 'n/a', 'na']:
                        record_dict[field] = ''
            
            results.append(record_dict)

        return jsonify({
            'data': results,
            'total_records': len(results),
            'results': {
                'chinapost_export': {
                    'available': True,
                    'records_processed': len(results)
                },
                'cbd_export': {
                    'available': True,
                    'records_processed': len(results)
                }
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate-chinapost', methods=['POST'])
def generate_chinapost():
    """Generate CHINAPOST export file - NO FRONTEND DATA NEEDED"""
    try:
        # Get data directly from database
        entries = ProcessedShipment.query.all()
        
        if not entries:
            return jsonify({"error": "No processed data available"}), 400
        
        # Convert database records to CHINAPOST format
        chinapost_data = []
        for entry in entries:
            chinapost_data.append(entry.to_chinapost_format())
        
        # Create DataFrame and Excel output
        df = pd.DataFrame(chinapost_data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='CHINAPOST Export', index=False)
        output.seek(0)
        
        return send_file(
            output,
            as_attachment=True,
            download_name=f"CHINAPOST_EXPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-cbd', methods=['POST'])
def generate_cbd():
    """Generate CBD export file - NO FRONTEND DATA NEEDED"""
    try:
        # Get data directly from database
        entries = ProcessedShipment.query.all()
        
        if not entries:
            return jsonify({"error": "No processed data available"}), 400
        
        # Convert database records to CBD format
        cbd_data = []
        for entry in entries:
            cbd_data.append(entry.to_cbd_format())
        
        # Create DataFrame and Excel output
        df = pd.DataFrame(cbd_data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='CBD Export', index=False)
        output.seek(0)
        
        return send_file(
            output,
            as_attachment=True,
            download_name=f"CBD_EXPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get-analytics-data', methods=['GET', 'POST'])
def get_analytics_data():
    """Get analytics data for dashboard with enhanced filtering - BACKEND PROCESSED ONLY"""
    try:
        # Get query parameters for date filtering
        query = ProcessedShipment.query
        
        if request.method == 'POST':
            data = request.json or {}
            start_date = data.get('startDate')
            end_date = data.get('endDate')
            goods_category = data.get('goodsCategory')
            postal_service = data.get('postalService')
            calculation_method = data.get('calculationMethod')  # 'configured', 'fallback', or 'all'
            
            if start_date and end_date:
                # Filter by arrival_date field (same logic as historical-data endpoint)
                query = query.filter(
                    and_(
                        ProcessedShipment.arrival_date.isnot(None),
                        ProcessedShipment.arrival_date != '',
                        func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) >= start_date,
                        func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) <= end_date
                    )
                )
            
            # Enhanced filtering by goods category
            if goods_category and goods_category != '*':
                query = query.filter(ProcessedShipment.goods_category == goods_category)
            
            # Enhanced filtering by postal service
            if postal_service and postal_service != '*':
                query = query.filter(ProcessedShipment.postal_service == postal_service)
            
            # Enhanced filtering by calculation method
            if calculation_method and calculation_method != 'all':
                query = query.filter(ProcessedShipment.tariff_calculation_method == calculation_method)
        
        # Execute query
        entries = query.all()
        
        if not entries:
            return jsonify({
                "analytics": {
                    "total_shipments": 0,
                    "total_weight": 0,
                    "total_declared_value": 0,
                    "total_tariff": 0,
                    "unique_destinations": 0,
                    "unique_carriers": 0,
                    "unique_receptacles": 0
                },
                "breakdown": {
                    "by_destination": [],
                    "by_carrier": [],
                    "by_currency": []
                }
            })
        
        # Calculate analytics in backend
        total_weight = 0
        total_declared_value = 0
        total_tariff = 0
        destinations = set()
        carriers = set()
        receptacles = set()
        currencies = {}
        destination_breakdown = {}
        carrier_breakdown = {}
        category_breakdown = {}
        service_breakdown = {}
        calculation_method_breakdown = {}
        
        for entry in entries:
            # Weight calculation - handle all forms of invalid values
            weight = 0
            try:
                if entry.bag_weight:
                    val_str = str(entry.bag_weight).lower().strip()
                    if val_str not in ['nan', 'null', 'none', '', 'n/a', 'na']:
                        weight = float(entry.bag_weight)
                        if not pd.isna(weight) and weight >= 0:
                            total_weight += weight
            except (ValueError, TypeError, AttributeError):
                weight = 0
            
            # Declared value calculation - handle all forms of invalid values
            declared_val = 0
            try:
                if entry.declared_value:
                    val_str = str(entry.declared_value).lower().strip()
                    if val_str not in ['nan', 'null', 'none', '', 'n/a', 'na']:
                        declared_val = float(entry.declared_value)
                        if not pd.isna(declared_val) and declared_val > 0:
                            total_declared_value += declared_val
            except (ValueError, TypeError, AttributeError):
                declared_val = 0
            
            # Tariff calculation - handle all forms of invalid values
            tariff = 0
            try:
                if entry.tariff_amount:
                    val_str = str(entry.tariff_amount).lower().strip()
                    if val_str not in ['nan', 'null', 'none', '', 'n/a', 'na']:
                        tariff = float(entry.tariff_amount)
                        if not pd.isna(tariff) and tariff >= 0:
                            total_tariff += tariff
            except (ValueError, TypeError, AttributeError):
                tariff = 0
            
            # Unique counts
            if entry.host_destination_station:
                destinations.add(entry.host_destination_station)
                # Destination breakdown
                dest = entry.host_destination_station
                if dest not in destination_breakdown:
                    destination_breakdown[dest] = {"count": 0, "weight": 0, "value": 0}
                destination_breakdown[dest]["count"] += 1
                destination_breakdown[dest]["weight"] += weight
                if declared_val > 0:
                    destination_breakdown[dest]["value"] += declared_val
            
            if entry.flight_carrier_1:
                carriers.add(entry.flight_carrier_1)
                # Carrier breakdown
                carrier = entry.flight_carrier_1
                if carrier not in carrier_breakdown:
                    carrier_breakdown[carrier] = {"count": 0, "weight": 0, "value": 0}
                carrier_breakdown[carrier]["count"] += 1
                carrier_breakdown[carrier]["weight"] += weight
                if declared_val > 0:
                    carrier_breakdown[carrier]["value"] += declared_val
            
            if entry.receptacle_id:
                receptacles.add(entry.receptacle_id)
            
            # Currency breakdown - filter out invalid currency values
            if entry.currency:
                curr_str = str(entry.currency).lower().strip()
                if curr_str not in ['nan', 'null', 'none', '', 'n/a', 'na'] and len(curr_str) <= 10:
                    if entry.currency not in currencies:
                        currencies[entry.currency] = 0
                    currencies[entry.currency] += 1
            
            # Category breakdown
            if entry.goods_category:
                category = entry.goods_category
                if category not in category_breakdown:
                    category_breakdown[category] = {"count": 0, "weight": 0, "value": 0, "tariff": 0}
                category_breakdown[category]["count"] += 1
                category_breakdown[category]["weight"] += weight
                if declared_val > 0:
                    category_breakdown[category]["value"] += declared_val
                category_breakdown[category]["tariff"] += tariff
            
            # Service breakdown
            if entry.postal_service:
                service = entry.postal_service
                if service not in service_breakdown:
                    service_breakdown[service] = {"count": 0, "weight": 0, "value": 0, "tariff": 0}
                service_breakdown[service]["count"] += 1
                service_breakdown[service]["weight"] += weight
                if declared_val > 0:
                    service_breakdown[service]["value"] += declared_val
                service_breakdown[service]["tariff"] += tariff
            
            # Calculation method breakdown
            if entry.tariff_calculation_method:
                method = entry.tariff_calculation_method
                if method not in calculation_method_breakdown:
                    calculation_method_breakdown[method] = {"count": 0, "value": 0, "tariff": 0}
                calculation_method_breakdown[method]["count"] += 1
                if declared_val > 0:
                    calculation_method_breakdown[method]["value"] += declared_val
                calculation_method_breakdown[method]["tariff"] += tariff
        
        # Format breakdown data
        dest_data = [{"name": k, "count": v["count"], "weight": round(v["weight"], 2), 
                     "value": round(v["value"], 2)} for k, v in destination_breakdown.items()]
        carrier_data = [{"name": k, "count": v["count"], "weight": round(v["weight"], 2), 
                        "value": round(v["value"], 2)} for k, v in carrier_breakdown.items()]
        currency_data = [{"name": k, "count": v} for k, v in currencies.items()]
        category_data = [{"name": k, "count": v["count"], "weight": round(v["weight"], 2), 
                         "value": round(v["value"], 2), "tariff": round(v["tariff"], 2)} 
                         for k, v in category_breakdown.items()]
        service_data = [{"name": k, "count": v["count"], "weight": round(v["weight"], 2), 
                        "value": round(v["value"], 2), "tariff": round(v["tariff"], 2)} 
                        for k, v in service_breakdown.items()]
        method_data = [{"name": k, "count": v["count"], "value": round(v["value"], 2), 
                       "tariff": round(v["tariff"], 2)} 
                       for k, v in calculation_method_breakdown.items()]
        
        return jsonify({
            "analytics": {
                "total_shipments": len(entries),
                "total_weight": round(total_weight, 2),
                "total_declared_value": round(total_declared_value, 2),
                "total_tariff": round(total_tariff, 2),
                "unique_destinations": len(destinations),
                "unique_carriers": len(carriers),
                "unique_receptacles": len(receptacles),
                "unique_categories": len(category_breakdown),
                "unique_services": len(service_breakdown)
            },
            "breakdown": {
                "by_destination": dest_data,
                "by_carrier": carrier_data,
                "by_currency": currency_data,
                "by_category": category_data,
                "by_service": service_data,
                "by_calculation_method": method_data
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/delete-records', methods=['DELETE'])
def delete_records():
    """Delete multiple shipment records by IDs"""
    try:
        data = request.json
        record_ids = data.get('ids', [])
        
        if not record_ids:
            return jsonify({"error": "No record IDs provided"}), 400
        
        # Delete records
        deleted_count = 0
        for record_id in record_ids:
            entry = ProcessedShipment.query.get(record_id)
            if entry:
                db.session.delete(entry)
                deleted_count += 1
        
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully deleted {deleted_count} records",
            "deleted_count": deleted_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/clear-database', methods=['POST'])
def clear_database():
    """Clear all records from database"""
    try:
        deleted_count = ProcessedShipment.query.count()
        ProcessedShipment.query.delete()
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully cleared database",
            "deleted_count": deleted_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ==================== TARIFF MANAGEMENT ENDPOINTS ====================

@app.route('/tariff-routes', methods=['GET'])
def get_tariff_routes():
    """Get all unique routes from shipment data and their current tariff rates"""
    try:
        # Get all unique origin-destination pairs from processed shipments
        routes_query = db.session.query(
            ProcessedShipment.host_origin_station,
            ProcessedShipment.host_destination_station,
            func.count(ProcessedShipment.id).label('shipment_count'),
            func.sum(func.cast(ProcessedShipment.declared_value, db.Float)).label('total_declared_value'),
            func.sum(func.cast(ProcessedShipment.tariff_amount, db.Float)).label('total_tariff_amount')
        ).filter(
            and_(
                ProcessedShipment.host_origin_station.isnot(None),
                ProcessedShipment.host_destination_station.isnot(None),
                ProcessedShipment.host_origin_station != '',
                ProcessedShipment.host_destination_station != ''
            )
        ).group_by(
            ProcessedShipment.host_origin_station,
            ProcessedShipment.host_destination_station
        ).all()
        
        routes = []
        for route in routes_query:
            origin = route.host_origin_station
            destination = route.host_destination_station
            
            # Check if we have a configured tariff rate for this route
            tariff_rate_config = TariffRate.query.filter_by(
                origin_country=origin,
                destination_country=destination
            ).first()
            
            # Calculate effective rate from historical data
            historical_rate = 0.0
            if route.total_declared_value and route.total_declared_value > 0:
                historical_rate = (route.total_tariff_amount or 0) / route.total_declared_value
            
            routes.append({
                'origin': origin,
                'destination': destination,
                'route': f"{origin} → {destination}",
                'shipment_count': route.shipment_count,
                'total_declared_value': round(route.total_declared_value or 0, 2),
                'total_tariff_amount': round(route.total_tariff_amount or 0, 2),
                'historical_rate': round(historical_rate, 4),
                'configured_rate': tariff_rate_config.to_dict() if tariff_rate_config else None,
                'has_configured_rate': tariff_rate_config is not None
            })
        
        return jsonify({
            'routes': routes,
            'total_routes': len(routes)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/tariff-rates', methods=['GET'])
def get_tariff_rates():
    """Get all configured tariff rates"""
    try:
        tariff_rates = TariffRate.query.filter_by(is_active=True).all()
        
        return jsonify({
            'tariff_rates': [rate.to_dict() for rate in tariff_rates],
            'total_rates': len(tariff_rates)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/tariff-rates', methods=['POST'])
def create_tariff_rate():
    """Create or update a tariff rate for a route"""
    try:
        data = request.json
        origin = data.get('origin_country')
        destination = data.get('destination_country')
        goods_category = data.get('goods_category', '*')
        postal_service = data.get('postal_service', '*')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not origin or not destination:
            return jsonify({'error': 'Origin and destination countries are required'}), 400
        
        # Parse dates
        from datetime import datetime, date
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            start_date = date.today()
        
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        else:
            end_date = date(2099, 12, 31)
        
        if start_date >= end_date:
            return jsonify({'error': 'Start date must be before end date'}), 400
        
        # Get weight range
        min_weight = data.get('min_weight', 0.0)
        max_weight = data.get('max_weight', 999999.0)
        
        # Validate weight range
        if min_weight < 0 or max_weight < 0:
            return jsonify({'error': 'Weight values cannot be negative'}), 400
        if min_weight > max_weight:
            return jsonify({'error': 'Minimum weight cannot be greater than maximum weight'}), 400
        
        # Check for overlapping weight ranges
        overlapping_weight_rates = TariffRate.check_weight_range_overlap(
            origin, destination, goods_category, postal_service, start_date, end_date, min_weight, max_weight
        )
        
        if overlapping_weight_rates:
            overlapping_info = []
            for rate in overlapping_weight_rates:
                overlapping_info.append({
                    'id': rate.id,
                    'start_date': rate.start_date.isoformat(),
                    'end_date': rate.end_date.isoformat(),
                    'min_weight': rate.min_weight,
                    'max_weight': rate.max_weight,
                    'rate': rate.tariff_rate
                })
            return jsonify({
                'error': 'Weight range overlaps with existing rates for the same date and route',
                'overlapping_rates': overlapping_info
            }), 400
        
        # Check for overlapping rates (legacy check for backward compatibility)
        overlapping_rates = TariffRate.check_overlapping_rates(
            origin, destination, goods_category, postal_service, start_date, end_date
        )
        
        if overlapping_rates:
            overlapping_info = []
            for rate in overlapping_rates:
                overlapping_info.append({
                    'id': rate.id,
                    'start_date': rate.start_date.isoformat(),
                    'end_date': rate.end_date.isoformat(),
                    'rate': rate.tariff_rate
                })
            return jsonify({
                'error': 'Date range overlaps with existing rates',
                'overlapping_rates': overlapping_info
            }), 400
        
        # Check if rate already exists for this specific combination (including weight range)
        existing_rate = TariffRate.query.filter_by(
            origin_country=origin,
            destination_country=destination,
            goods_category=goods_category,
            postal_service=postal_service,
            start_date=start_date,
            end_date=end_date,
            min_weight=min_weight,
            max_weight=max_weight
        ).first()
        
        if existing_rate:
            # Update existing rate
            existing_rate.tariff_rate = data.get('tariff_rate', existing_rate.tariff_rate)
            existing_rate.minimum_tariff = data.get('minimum_tariff', existing_rate.minimum_tariff)
            existing_rate.maximum_tariff = data.get('maximum_tariff', existing_rate.maximum_tariff)
            existing_rate.min_weight = data.get('min_weight', existing_rate.min_weight)
            existing_rate.max_weight = data.get('max_weight', existing_rate.max_weight)
            existing_rate.currency = data.get('currency', existing_rate.currency)
            existing_rate.is_active = data.get('is_active', existing_rate.is_active)
            existing_rate.notes = data.get('notes', existing_rate.notes)
            existing_rate.updated_at = datetime.now()
            
            db.session.commit()
            
            return jsonify({
                'message': 'Tariff rate updated successfully',
                'tariff_rate': existing_rate.to_dict()
            })
        else:
            # Validate required fields
            tariff_rate = data.get('tariff_rate')
            if tariff_rate is None:
                return jsonify({'error': 'tariff_rate is required'}), 400
                
            # Create new rate
            new_rate = TariffRate(
                origin_country=origin,
                destination_country=destination,
                goods_category=goods_category,
                postal_service=postal_service,
                start_date=start_date,
                end_date=end_date,
                min_weight=min_weight,
                max_weight=max_weight,
                tariff_rate=tariff_rate,
                minimum_tariff=data.get('minimum_tariff', 0.0),
                maximum_tariff=data.get('maximum_tariff'),
                currency=data.get('currency', 'USD'),
                is_active=data.get('is_active', True),
                notes=data.get('notes', '')
            )
            
            db.session.add(new_rate)
            db.session.commit()
            
            return jsonify({
                'message': 'Tariff rate created successfully',
                'tariff_rate': new_rate.to_dict()
            }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/tariff-rates/<int:rate_id>', methods=['PUT'])
def update_tariff_rate(rate_id):
    """Update a specific tariff rate"""
    try:
        tariff_rate = TariffRate.query.get(rate_id)
        if not tariff_rate:
            return jsonify({'error': 'Tariff rate not found'}), 404
        
        data = request.json
        
        # Check if classification fields are being updated
        origin = data.get('origin_country', tariff_rate.origin_country)
        destination = data.get('destination_country', tariff_rate.destination_country)
        goods_category = data.get('goods_category', tariff_rate.goods_category)
        postal_service = data.get('postal_service', tariff_rate.postal_service)
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        # Parse dates if provided
        from datetime import datetime as dt, date
        if start_date:
            try:
                start_date = dt.strptime(start_date, '%Y-%m-%d').date()
            except:
                start_date = tariff_rate.start_date
        else:
            start_date = tariff_rate.start_date
            
        if end_date:
            try:
                end_date = dt.strptime(end_date, '%Y-%m-%d').date()
            except:
                end_date = tariff_rate.end_date
        else:
            end_date = tariff_rate.end_date
        
        # Validate dates
        if start_date >= end_date:
            return jsonify({'error': 'Start date must be before end date'}), 400
        
        # Get weight range values
        min_weight = data.get('min_weight', tariff_rate.min_weight)
        max_weight = data.get('max_weight', tariff_rate.max_weight)
        
        # Validate weight range
        if min_weight < 0 or max_weight < 0:
            return jsonify({'error': 'Weight values cannot be negative'}), 400
        if min_weight > max_weight:
            return jsonify({'error': 'Minimum weight cannot be greater than maximum weight'}), 400
        
        # Check for overlapping weight ranges (excluding this rate)
        overlapping_weight_rates = TariffRate.check_weight_range_overlap(
            origin, destination, goods_category, postal_service, start_date, end_date, 
            min_weight, max_weight, exclude_id=rate_id
        )
        
        if overlapping_weight_rates:
            overlapping_info = []
            for rate in overlapping_weight_rates:
                overlapping_info.append({
                    'id': rate.id,
                    'start_date': rate.start_date.isoformat(),
                    'end_date': rate.end_date.isoformat(),
                    'min_weight': rate.min_weight,
                    'max_weight': rate.max_weight,
                    'tariff_rate': rate.tariff_rate
                })
            return jsonify({
                'error': 'Updated weight and date ranges would overlap with existing rates',
                'overlapping_rates': overlapping_info,
                'message': 'Please adjust the weight range or date range to avoid conflicts with existing rates.'
            }), 400
        
        # Update all fields
        tariff_rate.origin_country = origin
        tariff_rate.destination_country = destination
        tariff_rate.goods_category = goods_category
        tariff_rate.postal_service = postal_service
        tariff_rate.start_date = start_date
        tariff_rate.end_date = end_date
        tariff_rate.min_weight = min_weight
        tariff_rate.max_weight = max_weight
        tariff_rate.tariff_rate = data.get('tariff_rate', tariff_rate.tariff_rate)
        tariff_rate.minimum_tariff = data.get('minimum_tariff', tariff_rate.minimum_tariff)
        tariff_rate.maximum_tariff = data.get('maximum_tariff', tariff_rate.maximum_tariff)
        tariff_rate.currency = data.get('currency', tariff_rate.currency)
        tariff_rate.is_active = data.get('is_active', tariff_rate.is_active)
        tariff_rate.notes = data.get('notes', tariff_rate.notes)
        tariff_rate.updated_at = datetime.now()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Tariff rate updated successfully',
            'tariff_rate': tariff_rate.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/tariff-rates/<int:rate_id>', methods=['DELETE'])
def delete_tariff_rate(rate_id):
    """Delete a tariff rate (soft delete by setting is_active=False)"""
    try:
        tariff_rate = TariffRate.query.get(rate_id)
        if not tariff_rate:
            return jsonify({'error': 'Tariff rate not found'}), 404
        
        tariff_rate.is_active = False
        tariff_rate.updated_at = datetime.now()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Tariff rate deactivated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/tariff-system-defaults', methods=['GET'])
def get_tariff_system_defaults():
    """Get system defaults for tariff management"""
    try:
        # Calculate system-wide average rate from all processed shipments
        totals_query = db.session.query(
            func.sum(func.cast(ProcessedShipment.declared_value, db.Float)).label('total_declared_value'),
            func.sum(func.cast(ProcessedShipment.tariff_amount, db.Float)).label('total_tariff_amount'),
            func.count(ProcessedShipment.id).label('total_shipments')
        ).first()
        
        system_average_rate = 0.0
        if (totals_query.total_declared_value and 
            totals_query.total_declared_value > 0 and 
            totals_query.total_tariff_amount):
            system_average_rate = totals_query.total_tariff_amount / totals_query.total_declared_value
        
        # Get common ranges from existing data
        min_tariff_query = db.session.query(func.min(func.cast(ProcessedShipment.tariff_amount, db.Float))).scalar() or 0.0
        max_tariff_query = db.session.query(func.max(func.cast(ProcessedShipment.tariff_amount, db.Float))).scalar() or 100.0
        
        return jsonify({
            'system_defaults': {
                'default_tariff_rate': round(system_average_rate, 4) if system_average_rate > 0 else SystemConfig.get_fallback_rate(),
                'default_minimum_tariff': max(0.0, round(min_tariff_query, 2)),
                'suggested_maximum_tariff': round(max_tariff_query * 1.2, 2),  # 20% buffer above highest historical
                'default_currency': 'USD'
            },
            'system_stats': {
                'total_shipments': totals_query.total_shipments or 0,
                'total_declared_value': round(totals_query.total_declared_value or 0, 2),
                'total_tariff_amount': round(totals_query.total_tariff_amount or 0, 2),
                'average_rate': round(system_average_rate, 4) if system_average_rate > 0 else 0.0
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/calculate-tariff', methods=['POST'])
def calculate_tariff():
    """Calculate tariff for a given route and declared value with enhanced parameters"""
    try:
        data = request.json
        origin = data.get('origin_country')
        destination = data.get('destination_country')
        declared_value = float(data.get('declared_value', 0))
        weight = float(data.get('weight', 0))
        goods_category = data.get('goods_category', '*')
        postal_service = data.get('postal_service', '*')
        ship_date = data.get('ship_date')
        
        if not origin or not destination or declared_value <= 0:
            return jsonify({'error': 'Valid origin, destination, and declared value are required'}), 400
        
        # Parse ship_date if provided
        from datetime import datetime, date
        if ship_date:
            try:
                ship_date = datetime.strptime(ship_date, '%Y-%m-%d').date()
            except:
                ship_date = date.today()
        else:
            ship_date = date.today()
        
        # Use the enhanced tariff calculation with weight filtering
        result = TariffRate.calculate_tariff_for_shipment(
            origin, destination, declared_value, goods_category, postal_service, ship_date, weight
        )
        
        # Store weight in result for reference
        result['weight'] = weight
        
        if result['rate_used']:
            rate = result['rate_used']
            return jsonify({
                'origin_country': origin,
                'destination_country': destination,
                'goods_category': goods_category,
                'postal_service': postal_service,
                'ship_date': ship_date.isoformat(),
                'declared_value': declared_value,
                'tariff_rate': rate.tariff_rate,
                'minimum_tariff': rate.minimum_tariff,
                'maximum_tariff': rate.maximum_tariff,
                'calculated_tariff': result['tariff_amount'],
                'currency': rate.currency,
                'rate_details': rate.to_dict(),
                'calculation_method': 'configured'
            })
        else:
            # No configured rate found, used fallback
            # Calculate suggested rate from historical data if available
            historical_query = db.session.query(
                func.sum(func.cast(ProcessedShipment.declared_value, db.Float)).label('total_declared_value'),
                func.sum(func.cast(ProcessedShipment.tariff_amount, db.Float)).label('total_tariff_amount')
            ).filter(
                and_(
                    ProcessedShipment.host_origin_station == origin,
                    ProcessedShipment.host_destination_station == destination
                )
            ).first()
            
            suggested_rate = 0.0
            if (historical_query.total_declared_value and 
                historical_query.total_declared_value > 0 and 
                historical_query.total_tariff_amount):
                suggested_rate = historical_query.total_tariff_amount / historical_query.total_declared_value
            
            return jsonify({
                'origin_country': origin,
                'destination_country': destination,
                'goods_category': goods_category,
                'postal_service': postal_service,
                'ship_date': ship_date.isoformat(),
                'declared_value': declared_value,
                'calculated_tariff': result['tariff_amount'],
                'calculation_method': 'fallback',
                'fallback_rate': SystemConfig.get_fallback_rate(),
                'historical_rate': round(suggested_rate, 4) if suggested_rate > 0 else None,
                'message': 'No configured rate found, used fallback calculation (80%)',
                'suggestion': 'Configure a specific tariff rate for this route/category/service combination'
            })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/tariff-categories', methods=['GET'])
def get_tariff_categories():
    """Get all available goods categories from configured rates and processed shipments"""
    try:
        # Get categories from configured rates
        rate_categories = db.session.query(TariffRate.goods_category).filter(
            TariffRate.is_active == True,
            TariffRate.goods_category != '*'
        ).distinct().all()
        
        # Get categories from processed shipments
        shipment_categories = db.session.query(ProcessedShipment.goods_category).filter(
            ProcessedShipment.goods_category.isnot(None),
            ProcessedShipment.goods_category != ''
        ).distinct().all()
        
        categories = set(['*'])  # Always include wildcard
        categories.update([c[0] for c in rate_categories if c[0]])
        categories.update([c[0] for c in shipment_categories if c[0]])
        
        return jsonify({
            'categories': sorted(list(categories)),
            'total_categories': len(categories)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/tariff-services', methods=['GET'])
def get_tariff_services():
    """Get all available postal services from configured rates and processed shipments"""
    try:
        # Get services from configured rates
        rate_services = db.session.query(TariffRate.postal_service).filter(
            TariffRate.is_active == True,
            TariffRate.postal_service != '*'
        ).distinct().all()
        
        # Get services from processed shipments
        shipment_services = db.session.query(ProcessedShipment.postal_service).filter(
            ProcessedShipment.postal_service.isnot(None),
            ProcessedShipment.postal_service != ''
        ).distinct().all()
        
        services = set(['*'])  # Always include wildcard
        services.update([s[0] for s in rate_services if s[0]])
        services.update([s[0] for s in shipment_services if s[0]])
        
        return jsonify({
            'services': sorted(list(services)),
            'total_services': len(services)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/test-enhanced-filters', methods=['POST'])
def test_enhanced_filters():
    """Test endpoint for enhanced filtering capabilities"""
    try:
        data = request.json or {}
        
        # Build query with all possible filters
        query = ProcessedShipment.query
        filters_applied = []
        
        # Date filtering
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        if start_date and end_date:
            query = query.filter(
                and_(
                    ProcessedShipment.arrival_date.isnot(None),
                    ProcessedShipment.arrival_date != '',
                    func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) >= start_date,
                    func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) <= end_date
                )
            )
            filters_applied.append(f"Date: {start_date} to {end_date}")
        
        # Category filtering
        goods_category = data.get('goodsCategory')
        if goods_category and goods_category != '*':
            query = query.filter(ProcessedShipment.goods_category == goods_category)
            filters_applied.append(f"Category: {goods_category}")
        
        # Service filtering
        postal_service = data.get('postalService')
        if postal_service and postal_service != '*':
            query = query.filter(ProcessedShipment.postal_service == postal_service)
            filters_applied.append(f"Service: {postal_service}")
        
        # Method filtering
        calculation_method = data.get('calculationMethod')
        if calculation_method and calculation_method != 'all':
            query = query.filter(ProcessedShipment.tariff_calculation_method == calculation_method)
            filters_applied.append(f"Method: {calculation_method}")
        
        # Execute query
        results = query.all()
        
        return jsonify({
            'success': True,
            'filters_applied': filters_applied,
            'total_results': len(results),
            'message': f'Enhanced filtering test completed. Applied {len(filters_applied)} filters, found {len(results)} matching records.',
            'sample_data': [result.to_dict() for result in results[:3]] if results else []
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/cbp-analytics', methods=['GET', 'POST'])
def get_cbp_analytics():
    """Get CBP-specific analytics - BACKEND PROCESSED ONLY"""
    try:
        # Get query parameters for date filtering (same logic as get_analytics_data)
        query = ProcessedShipment.query
        
        if request.method == 'POST':
            data = request.json or {}
            start_date = data.get('startDate')
            end_date = data.get('endDate')
            
            if start_date and end_date:
                query = query.filter(
                    and_(
                        ProcessedShipment.arrival_date.isnot(None),
                        ProcessedShipment.arrival_date != '',
                        func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) >= start_date,
                        func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) <= end_date
                    )
                )
        
        entries = query.all()
        
        if not entries:
            return jsonify({
                'total_value': 0,
                'total_records': 0,
                'unique_carriers': 0,
                'unique_ports': 0,
                'average_value': 0
            })
        
        # Calculate CBP-specific analytics in backend
        total_value = 0
        carriers = set()
        ports = set()
        
        for entry in entries:
            # Declared value calculation - handle 'nan' string values properly
            try:
                if entry.declared_value and str(entry.declared_value).lower() not in ['nan', 'null', 'none', '']:
                    # Try to convert to float, skip if it's actually the string 'nan'
                    if str(entry.declared_value).lower() != 'nan':
                        declared_val = float(entry.declared_value)
                        total_value += declared_val
            except (ValueError, TypeError):
                pass
            
            # Unique carriers and ports
            if entry.carrier_code:
                carriers.add(entry.carrier_code)
            if entry.arrival_port_code:
                ports.add(entry.arrival_port_code)
        
        return jsonify({
            'total_value': round(total_value, 2),
            'total_records': len(entries),
            'unique_carriers': len(carriers),
            'unique_ports': len(ports),
            'average_value': round(total_value / len(entries), 2) if len(entries) > 0 else 0
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/chinapost-analytics', methods=['GET', 'POST'])
def get_chinapost_analytics():
    """Get China Post-specific analytics - BACKEND PROCESSED ONLY"""
    try:
        # Get query parameters for date filtering (same logic as get_analytics_data)
        query = ProcessedShipment.query
        
        if request.method == 'POST':
            data = request.json or {}
            start_date = data.get('startDate')
            end_date = data.get('endDate')
            
            if start_date and end_date:
                query = query.filter(
                    and_(
                        ProcessedShipment.arrival_date.isnot(None),
                        ProcessedShipment.arrival_date != '',
                        func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) >= start_date,
                        func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) <= end_date
                    )
                )
        
        entries = query.all()
        
        if not entries:
            return jsonify({
                'total_weight': 0,
                'total_declared_value': 0,
                'total_records': 0,
                'total_tariff': 0,
                'unique_carriers': 0,
                'unique_destinations': 0,
                'unique_flights': 0,
                'average_weight': 0,
                'average_value': 0,
                'currency_breakdown': {}
            })
        
        # Calculate China Post analytics in backend
        total_weight = 0
        total_declared_value = 0
        total_tariff = 0
        carriers = set()
        destinations = set()
        flights = set()
        currencies = {}
        
        for entry in entries:
            # Weight calculation - handle all forms of invalid values
            weight = 0
            try:
                if entry.bag_weight:
                    val_str = str(entry.bag_weight).lower().strip()
                    if val_str not in ['nan', 'null', 'none', '', 'n/a', 'na']:
                        weight = float(entry.bag_weight)
                        if not pd.isna(weight) and weight >= 0:
                            total_weight += weight
            except (ValueError, TypeError, AttributeError):
                weight = 0
            
            # Declared value calculation - handle all forms of invalid values
            declared_val = 0
            try:
                if entry.declared_value:
                    val_str = str(entry.declared_value).lower().strip()
                    if val_str not in ['nan', 'null', 'none', '', 'n/a', 'na']:
                        declared_val = float(entry.declared_value)
                        if not pd.isna(declared_val) and declared_val > 0:
                            total_declared_value += declared_val
            except (ValueError, TypeError, AttributeError):
                declared_val = 0
            
            # Tariff calculation - handle 'nan' string values properly
            try:
                if entry.tariff_amount and str(entry.tariff_amount).lower() not in ['nan', 'null', 'none', '']:
                    # Try to convert to float, skip if it's actually the string 'nan'
                    if str(entry.tariff_amount).lower() != 'nan':
                        tariff = float(entry.tariff_amount)
                        total_tariff += tariff
            except (ValueError, TypeError):
                pass
            
            # Unique counts
            if entry.flight_carrier_1:
                carriers.add(entry.flight_carrier_1)
            if entry.host_destination_station:
                destinations.add(entry.host_destination_station)
            if entry.flight_number_1:
                flights.add(entry.flight_number_1)
            
            # Currency breakdown - filter out invalid currency values
            if entry.currency:
                curr_str = str(entry.currency).lower().strip()
                if curr_str not in ['nan', 'null', 'none', '', 'n/a', 'na'] and len(curr_str) <= 10:
                    currency = entry.currency
                    if currency not in currencies:
                        currencies[currency] = {'count': 0, 'totalValue': 0}
                    currencies[currency]['count'] += 1
                    if declared_val > 0:
                        currencies[currency]['totalValue'] += declared_val
        
        return jsonify({
            'total_weight': round(total_weight, 2),
            'total_declared_value': round(total_declared_value, 2),
            'total_records': len(entries),
            'total_tariff': round(total_tariff, 2),
            'unique_carriers': len(carriers),
            'unique_destinations': len(destinations),
            'unique_flights': len(flights),
            'average_weight': round(total_weight / len(entries), 2) if len(entries) > 0 else 0,
            'average_value': round(total_declared_value / len(entries), 2) if len(entries) > 0 else 0,
            'currency_breakdown': currencies
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/batch-recalculate-tariffs', methods=['POST'])
def batch_recalculate_tariffs():
    """Recalculate tariffs for all or filtered processed shipments"""
    try:
        data = request.json or {}
        
        # Build query based on optional filters
        query = ProcessedShipment.query
        
        # Date range filter
        if data.get('start_date') and data.get('end_date'):
            query = query.filter(
                and_(
                    ProcessedShipment.arrival_date.isnot(None),
                    ProcessedShipment.arrival_date != '',
                    func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) >= data['start_date'],
                    func.date(func.substr(ProcessedShipment.arrival_date, 1, 10)) <= data['end_date']
                )
            )
        
        # Route filter
        if data.get('routes'):
            route_filters = []
            for route in data['routes']:
                if ' → ' in route:
                    origin, destination = route.split(' → ')
                    route_filters.append(
                        and_(
                            ProcessedShipment.host_origin_station == origin.strip(),
                            ProcessedShipment.host_destination_station == destination.strip()
                        )
                    )
            if route_filters:
                query = query.filter(or_(*route_filters))
        
        # Get shipments to recalculate
        shipments = query.all()
        
        if not shipments:
            return jsonify({
                'success': True,
                'message': 'No shipments found matching the specified filters',
                'updated_count': 0
            })
        
        updated_count = 0
        
        for shipment in shipments:
            try:
                # Get shipment details for tariff calculation
                origin = shipment.host_origin_station
                destination = shipment.host_destination_station
                declared_value = _safe_float(shipment.declared_value) or 0
                bag_weight = _safe_float(shipment.bag_weight) or 0
                
                # Retroactively re-derive classification from raw data
                from data_processor import DataProcessor
                processor = DataProcessor()
                
                # Re-derive goods category from declared content
                if shipment.declared_content:
                    goods_category = processor._derive_goods_category(shipment.declared_content)
                else:
                    goods_category = shipment.goods_category or '*'
                
                # Re-derive postal service from tracking number
                if shipment.tracking_number:
                    # Create a mock row for postal service derivation
                    mock_row = {
                        'Tracking Number': shipment.tracking_number,
                        'Sender Name': getattr(shipment, 'sender_name', ''),
                        'Receiver Name': getattr(shipment, 'receiver_name', ''),
                        'Content': shipment.declared_content or ''
                    }
                    postal_service = processor._derive_postal_service(mock_row)
                else:
                    postal_service = shipment.postal_service or '*'
                
                # Parse ship date
                ship_date = None
                if shipment.arrival_date:
                    try:
                        ship_date = datetime.strptime(shipment.arrival_date[:10], '%Y-%m-%d').date()
                    except:
                        ship_date = date.today()
                else:
                    ship_date = date.today()
                
                # Calculate new tariff using enhanced system
                if declared_value > 0 and origin and destination:
                    tariff_result = TariffRate.calculate_tariff_for_shipment(
                        origin, destination, declared_value, goods_category, postal_service, ship_date, bag_weight
                    )
                    
                    # Update shipment with new tariff calculation and classifications
                    shipment.tariff_amount = round(tariff_result['tariff_amount'], 2)
                    shipment.tariff_calculation_method = 'configured' if not tariff_result['fallback_used'] else 'fallback'
                    
                    # Update retroactively derived classifications
                    shipment.goods_category = goods_category
                    shipment.postal_service = postal_service
                    shipment.shipment_date = ship_date
                    
                    # Update rate used
                    if tariff_result['rate_used']:
                        shipment.tariff_rate_used = tariff_result['rate_used'].tariff_rate
                    else:
                        shipment.tariff_rate_used = SystemConfig.get_fallback_rate()  # dynamic fallback rate
                    
                    updated_count += 1
                
            except Exception as e:
                print(f"Error recalculating tariff for shipment {shipment.id}: {str(e)}")
                continue
        
        # Commit all updates
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully recalculated tariffs for {updated_count} shipments',
            'total_shipments': len(shipments),
            'updated_count': updated_count,
            'skipped_count': len(shipments) - updated_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Batch recalculation failed: {str(e)}'
        }), 500

@app.route('/classification-config', methods=['GET'])
def get_classification_config():
    """Get current classification configuration"""
    try:
        from classification_config import get_category_mappings, get_service_patterns
        
        # Convert lambda functions to readable descriptions
        service_pattern_descriptions = {
            'EMS': [
                'Tracking starts with "E" and contains "CN"',
                'Contains "EMS" in tracking number',
                'Starts with "EE" or "EP"',
                'Starts with "CX" and has 13 characters (China EMS format)'
            ],
            'Registered Mail': [
                'Tracking starts with "R" and contains "CN"',
                'Tracking starts with "L" and contains "CN"',
                'Contains "REG" in tracking number',
                'Starts with "RR" or "RL"'
            ],
            'Air Mail': [
                'Tracking starts with "C" and contains "CN"',
                'Contains "AIR" in tracking number',
                'Starts with "CP" or "CA"'
            ],
            'E-packet': [
                'Tracking starts with "L" and has 13 characters',
                'Contains "PACKET" in tracking number',
                'Starts with "LP" or "LK"'
            ],
            'Surface Mail': [
                'Tracking starts with "N" and contains "CN"',
                'Contains "SURFACE" or "SEA" in tracking number',
                'Starts with "NS" or "NM"'
            ]
        }
        
        return jsonify({
            'success': True,
            'category_mappings': get_category_mappings(),
            'service_patterns': service_pattern_descriptions
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classification-categories', methods=['GET'])
def get_classification_categories():
    """Get list of all available categories"""
    try:
        from classification_config import get_category_mappings
        categories = list(get_category_mappings().keys())
        
        return jsonify({
            'success': True,
            'categories': categories
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classification-categories/<category>', methods=['GET'])
def get_category_keywords(category):
    """Get keywords for a specific category"""
    try:
        from classification_config import get_category_mappings
        mappings = get_category_mappings()
        
        if category not in mappings:
            return jsonify({
                'success': False,
                'error': f'Category "{category}" not found'
            }), 404
        
        return jsonify({
            'success': True,
            'category': category,
            'keywords': mappings[category]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classification-categories/<category>/keywords', methods=['POST'])
def add_category_keywords(category):
    """Add keywords to a category"""
    try:
        data = request.json
        new_keywords = data.get('keywords', [])
        
        if not isinstance(new_keywords, list):
            return jsonify({
                'success': False,
                'error': 'Keywords must be provided as a list'
            }), 400
        
        # Store the updated mapping in SystemConfig
        from classification_config import get_category_mappings
        current_mappings = get_category_mappings()
        
        if category not in current_mappings:
            current_mappings[category] = []
        
        # Add new keywords (avoid duplicates)
        for keyword in new_keywords:
            if keyword and keyword not in current_mappings[category]:
                current_mappings[category].append(keyword.lower().strip())
        
        # Save updated mappings to database
        import json
        SystemConfig.set_config(
            'custom_category_mappings', 
            json.dumps(current_mappings),
            'string',
            'Custom category mappings for goods classification'
        )
        
        return jsonify({
            'success': True,
            'category': category,
            'updated_keywords': current_mappings[category],
            'message': f'Added {len(new_keywords)} keywords to category "{category}"'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classification-categories/<category>/keywords', methods=['DELETE'])
def remove_category_keywords(category):
    """Remove keywords from a category"""
    try:
        data = request.json
        keywords_to_remove = data.get('keywords', [])
        
        if not isinstance(keywords_to_remove, list):
            return jsonify({
                'success': False,
                'error': 'Keywords must be provided as a list'
            }), 400
        
        from classification_config import get_category_mappings
        current_mappings = get_category_mappings()
        
        if category not in current_mappings:
            return jsonify({
                'success': False,
                'error': f'Category "{category}" not found'
            }), 404
        
        # Remove keywords
        for keyword in keywords_to_remove:
            if keyword in current_mappings[category]:
                current_mappings[category].remove(keyword)
        
        # Save updated mappings
        import json
        SystemConfig.set_config(
            'custom_category_mappings',
            json.dumps(current_mappings),
            'string',
            'Custom category mappings for goods classification'
        )
        
        return jsonify({
            'success': True,
            'category': category,
            'updated_keywords': current_mappings[category],
            'message': f'Removed keywords from category "{category}"'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classification-test', methods=['POST'])
def test_classification():
    """Test classification for a given content description"""
    try:
        data = request.json
        content = data.get('content', '')
        
        if not content:
            return jsonify({
                'success': False,
                'error': 'Content description is required'
            }), 400
        
        # Use the data processor to derive category
        processor = DataProcessor()
        derived_category = processor._derive_goods_category(content)
        
        # Also test service derivation if tracking number provided
        service_result = None
        if 'tracking_number' in data:
            mock_row = {
                'Tracking Number': data['tracking_number'],
                'Content': content,
                'Sender Name': data.get('sender_name', ''),
                'Receiver Name': data.get('receiver_name', '')
            }
            service_result = processor._derive_postal_service(mock_row)
        
        result = {
            'success': True,
            'content': content,
            'derived_category': derived_category,
        }
        
        if service_result:
            result['derived_service'] = service_result
            result['tracking_number'] = data['tracking_number']
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classification-services', methods=['GET'])
def get_classification_services():
    """Get list of all available postal services"""
    try:
        from classification_config import get_service_patterns
        services = list(get_service_patterns().keys())
        
        return jsonify({
            'success': True,
            'services': services
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classification-services/<service>', methods=['GET'])
def get_service_patterns_api(service):
    """Get patterns for a specific postal service"""
    try:
        from classification_config import get_service_patterns
        patterns = get_service_patterns()
        
        if service not in patterns:
            return jsonify({
                'success': False,
                'error': f'Service "{service}" not found'
            }), 404
        
        # Convert functions to string representations for display
        pattern_descriptions = []
        for pattern in patterns[service]:
            if callable(pattern):
                pattern_descriptions.append(f"Custom function: {pattern.__name__}")
            else:
                pattern_descriptions.append(str(pattern))
        
        return jsonify({
            'success': True,
            'service': service,
            'patterns': pattern_descriptions
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classification-services/<service>/patterns', methods=['POST'])
def add_service_patterns(service):
    """Add patterns to a postal service"""
    try:
        data = request.json
        new_patterns = data.get('patterns', [])
        
        if not isinstance(new_patterns, list):
            return jsonify({
                'success': False,
                'error': 'Patterns must be provided as a list of strings'
            }), 400
        
        # Store the updated patterns in SystemConfig
        from classification_config import get_service_patterns
        import json
        
        current_patterns = get_service_patterns()
        
        # Convert patterns to storable format (strings only for now)
        if service not in current_patterns:
            current_patterns[service] = []
        
        # Add new string patterns
        for pattern in new_patterns:
            if isinstance(pattern, str) and pattern not in current_patterns[service]:
                current_patterns[service].append(pattern)
        
        # Save updated patterns to database
        # Note: We can only store simple string patterns, not lambda functions
        storable_patterns = {}
        for svc, patterns in current_patterns.items():
            storable_patterns[svc] = [p for p in patterns if isinstance(p, str)]
        
        SystemConfig.set_config(
            'custom_service_patterns', 
            json.dumps(storable_patterns),
            'string',
            'Custom service patterns for postal service detection'
        )
        
        return jsonify({
            'success': True,
            'service': service,
            'updated_patterns': [p for p in current_patterns[service] if isinstance(p, str)],
            'message': f'Added patterns to service "{service}". Note: Only string patterns are supported via API.'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/tariff-rates/inactive', methods=['GET'])
def get_inactive_rates():
    """Get all inactive tariff rates"""
    try:
        inactive_rates = TariffRate.query.filter_by(is_active=False).all()
        
        return jsonify({
            'success': True,
            'inactive_rates': [rate.to_dict() for rate in inactive_rates],
            'count': len(inactive_rates)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/tariff-rates/<int:rate_id>/deactivate', methods=['POST'])
def deactivate_rate(rate_id):
    """Deactivate a tariff rate"""
    try:
        rate = TariffRate.query.get(rate_id)
        if not rate:
            return jsonify({
                'success': False,
                'error': 'Tariff rate not found'
            }), 404
        
        data = request.json or {}
        deactivation_reason = data.get('reason', 'Manual deactivation')
        
        rate.is_active = False
        rate.notes = f"{rate.notes or ''}\n[DEACTIVATED] {deactivation_reason}".strip()
        rate.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Tariff rate {rate_id} has been deactivated',
            'rate': rate.to_dict()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/tariff-rates/<int:rate_id>/reactivate', methods=['POST'])
def reactivate_rate(rate_id):
    """Reactivate a tariff rate"""
    try:
        rate = TariffRate.query.get(rate_id)
        if not rate:
            return jsonify({
                'success': False,
                'error': 'Tariff rate not found'
            }), 404
        
        data = request.json or {}
        reactivation_reason = data.get('reason', 'Manual reactivation')
        
        # Check for overlaps before reactivating
        overlapping_rates = TariffRate.check_weight_range_overlap(
            rate.origin_country, rate.destination_country, 
            rate.goods_category, rate.postal_service,
            rate.start_date, rate.end_date,
            rate.min_weight, rate.max_weight,
            exclude_id=rate.id
        )
        
        if overlapping_rates:
            return jsonify({
                'success': False,
                'error': 'Cannot reactivate: would overlap with existing active rates',
                'overlapping_rates': [r.to_dict() for r in overlapping_rates]
            }), 400
        
        rate.is_active = True
        rate.notes = f"{rate.notes or ''}\n[REACTIVATED] {reactivation_reason}".strip()
        rate.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Tariff rate {rate_id} has been reactivated',
            'rate': rate.to_dict()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/tariff-rates/<int:rate_id>/archive', methods=['DELETE'])
def archive_rate(rate_id):
    """Permanently archive (delete) a tariff rate"""
    try:
        rate = TariffRate.query.get(rate_id)
        if not rate:
            return jsonify({
                'success': False,
                'error': 'Tariff rate not found'
            }), 404
        
        data = request.json or {}
        archive_reason = data.get('reason', 'Manual archival')
        
        # Store some info before deletion for response
        rate_info = rate.to_dict()
        
        # Check if rate is being used in processed shipments
        usage_count = ProcessedShipment.query.filter_by(tariff_rate_used=rate.tariff_rate).count()
        
        if usage_count > 0:
            return jsonify({
                'success': False,
                'error': f'Cannot archive: rate is referenced by {usage_count} processed shipments. Consider deactivating instead.',
                'usage_count': usage_count
            }), 400
        
        db.session.delete(rate)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Tariff rate {rate_id} has been permanently archived',
            'archived_rate': rate_info,
            'reason': archive_reason
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/tariff-rates/bulk-deactivate', methods=['POST'])
def bulk_deactivate_rates():
    """Bulk deactivate multiple tariff rates"""
    try:
        data = request.json
        rate_ids = data.get('rate_ids', [])
        reason = data.get('reason', 'Bulk deactivation')
        
        if not isinstance(rate_ids, list) or not rate_ids:
            return jsonify({
                'success': False,
                'error': 'rate_ids must be provided as a non-empty list'
            }), 400
        
        rates = TariffRate.query.filter(TariffRate.id.in_(rate_ids)).all()
        
        if len(rates) != len(rate_ids):
            return jsonify({
                'success': False,
                'error': 'Some rate IDs were not found'
            }), 404
        
        updated_count = 0
        for rate in rates:
            if rate.is_active:
                rate.is_active = False
                rate.notes = f"{rate.notes or ''}\n[BULK DEACTIVATED] {reason}".strip()
                rate.updated_at = datetime.utcnow()
                updated_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Bulk deactivated {updated_count} tariff rates',
            'updated_count': updated_count,
            'total_processed': len(rates)
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)