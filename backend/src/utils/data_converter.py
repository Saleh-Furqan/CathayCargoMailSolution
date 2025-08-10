"""
Data conversion utilities for improving data types and consistency
"""
from datetime import datetime, date
import re
from typing import Optional, Union


def parse_date_flexible(date_str: str) -> Optional[date]:
    """
    Parse date from various formats with improved error handling
    
    Args:
        date_str: Date string from shipment data
        
    Returns:
        date: Parsed date or None if parsing fails
    """
    if not date_str or str(date_str).strip() in ['', 'nan', 'null', 'None', 'N/A']:
        return None
    
    date_str = str(date_str).strip()
    
    # Common date formats to try
    formats = [
        '%Y-%m-%d',           # 2025-08-10
        '%Y-%m-%d %H:%M:%S',  # 2025-08-10 15:30:00
        '%d/%m/%Y',           # 10/08/2025
        '%m/%d/%Y',           # 08/10/2025
        '%d-%m-%Y',           # 10-08-2025
        '%Y/%m/%d',           # 2025/08/10
        '%d.%m.%Y',           # 10.08.2025
        '%Y%m%d',             # 20250810
    ]
    
    for fmt in formats:
        try:
            parsed_dt = datetime.strptime(date_str, fmt)
            return parsed_dt.date()
        except ValueError:
            continue
    
    # Try to extract date from longer strings using regex
    # Look for patterns like YYYY-MM-DD, DD/MM/YYYY, etc.
    date_patterns = [
        r'(\d{4}-\d{2}-\d{2})',           # YYYY-MM-DD
        r'(\d{2}/\d{2}/\d{4})',           # DD/MM/YYYY or MM/DD/YYYY
        r'(\d{4}/\d{2}/\d{2})',           # YYYY/MM/DD
        r'(\d{2}-\d{2}-\d{4})',           # DD-MM-YYYY
        r'(\d{8})',                       # YYYYMMDD
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, date_str)
        if match:
            extracted_date = match.group(1)
            for fmt in formats:
                try:
                    parsed_dt = datetime.strptime(extracted_date, fmt)
                    return parsed_dt.date()
                except ValueError:
                    continue
    
    return None


def safe_float_conversion(value: Union[str, int, float]) -> Optional[float]:
    """
    Safely convert value to float with better error handling
    
    Args:
        value: Value to convert
        
    Returns:
        float: Converted value or None if invalid
    """
    if value is None:
        return None
    
    if isinstance(value, (int, float)):
        return float(value)
    
    value_str = str(value).strip().lower()
    
    # Handle empty or null-like values
    if value_str in ['', 'nan', 'null', 'none', 'n/a', 'na', '-']:
        return None
    
    # Remove common currency symbols and separators
    cleaned = re.sub(r'[,$£€¥₽]', '', value_str)
    cleaned = cleaned.replace(',', '')  # Remove thousands separators
    
    try:
        return float(cleaned)
    except ValueError:
        # Try to extract numbers from strings like "123.45 USD" or "USD 123.45"
        number_match = re.search(r'(\d+\.?\d*)', cleaned)
        if number_match:
            try:
                return float(number_match.group(1))
            except ValueError:
                pass
    
    return None


def safe_int_conversion(value: Union[str, int, float]) -> Optional[int]:
    """
    Safely convert value to integer with better error handling
    
    Args:
        value: Value to convert
        
    Returns:
        int: Converted value or None if invalid
    """
    if value is None:
        return None
    
    if isinstance(value, int):
        return value
    
    if isinstance(value, float):
        if value.is_integer():
            return int(value)
        else:
            return None  # Don't convert non-integer floats
    
    value_str = str(value).strip().lower()
    
    # Handle empty or null-like values
    if value_str in ['', 'nan', 'null', 'none', 'n/a', 'na', '-']:
        return None
    
    try:
        # Try direct conversion
        return int(float(value_str))  # Use float first to handle "123.0"
    except ValueError:
        # Try to extract integer from strings
        number_match = re.search(r'(\d+)', value_str)
        if number_match:
            try:
                return int(number_match.group(1))
            except ValueError:
                pass
    
    return None


def clean_string_field(value: Union[str, int, float]) -> str:
    """
    Clean string field by removing NaN/null indicators and trimming
    
    Args:
        value: Value to clean
        
    Returns:
        str: Cleaned string value
    """
    if value is None:
        return ''
    
    value_str = str(value).strip()
    
    # Handle null-like values
    if value_str.lower() in ['nan', 'null', 'none', 'n/a', 'na']:
        return ''
    
    return value_str


def validate_and_convert_shipment_data(shipment_dict: dict) -> dict:
    """
    Validate and convert shipment data to proper types
    
    Args:
        shipment_dict: Raw shipment data dictionary
        
    Returns:
        dict: Cleaned and converted shipment data
    """
    converted = shipment_dict.copy()
    
    # Convert numeric fields
    numeric_fields = [
        'declared_value', 'bag_weight', 'tariff_amount', 
        'tariff_rate_used', 'receptacle_weight'
    ]
    
    for field in numeric_fields:
        if field in converted:
            converted[field] = safe_float_conversion(converted[field])
    
    # Convert integer fields
    int_fields = ['number_of_packets']
    for field in int_fields:
        if field in converted:
            converted[field] = safe_int_conversion(converted[field])
    
    # Convert date fields
    date_fields = ['arrival_date', 'flight_date_1', 'flight_date_2', 'flight_date_3']
    for field in date_fields:
        if field in converted:
            parsed_date = parse_date_flexible(converted[field])
            if parsed_date:
                # Keep original string but add parsed date
                converted[f'{field}_parsed'] = parsed_date
    
    # Clean string fields
    string_fields = [
        'tracking_number', 'pawb', 'cardit', 'bag_number',
        'flight_carrier_1', 'flight_number_1',
        'flight_carrier_2', 'flight_number_2', 
        'flight_carrier_3', 'flight_number_3',
        'host_origin_station', 'host_destination_station',
        'declared_content', 'hs_code', 'currency'
    ]
    
    for field in string_fields:
        if field in converted:
            converted[field] = clean_string_field(converted[field])
    
    return converted