"""
Data processing module for merging CNP raw data with IODA data
Based on the script_v4.ipynb workflow for complete data processing pipeline
Handles complete data processing from CNP raw data to CHINAPOST EXPORT and CBD EXPORT formats
"""

import pandas as pd
import numpy as np
import os
import re
from typing import Dict, Any, Tuple, Optional
from datetime import datetime, date


class DataProcessor:
    """
    Handles the data processing pipeline from raw CNP data to processed output
    Processes CNP raw data and merges with IODA reference data to create CHINAPOST and CBD exports
    """
    
    def __init__(self, ioda_file_path: str):
        """
        Initialize the data processor
        
        Args:
            ioda_file_path: Path to the master IODA data file (master_cardit_inner_event_df)
        """
        self.ioda_file_path = ioda_file_path
        self.master_cardit_inner_event_df = None
        self.cnp_data = None
        self.merged_data = None
        
        # Port code mapping for CBD export
        self.port_code_mapping = {
            'JFK': 4701,
            'ORD': 3901,
            'LAX': 2720
        }
    
    def load_ioda_data(self) -> bool:
        """
        Load the preprocessed IODA data (master_cardit_inner_event_df)
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Check if file exists first
            if not os.path.exists(self.ioda_file_path):
                print(f"IODA file not found at path: {self.ioda_file_path}")
                print("Please ensure the IODA data file exists in the correct location.")
                return False
                
            self.master_cardit_inner_event_df = pd.read_excel(self.ioda_file_path)
            print(f"Successfully loaded IODA data: {self.master_cardit_inner_event_df.shape}")
            print(f"IODA columns: {self.master_cardit_inner_event_df.columns.tolist()}")
            
            # Validate required columns
            required_cols = ['Receptacle']
            missing_cols = [col for col in required_cols if col not in self.master_cardit_inner_event_df.columns]
            if missing_cols:
                print(f"Missing required columns in IODA data: {missing_cols}")
                return False
                
            return True
        except Exception as e:
            print(f"Error loading IODA data from {self.ioda_file_path}: {str(e)}")
            print("Please check that the IODA file is accessible and in the correct Excel format.")
            return False
    
    def _parse_cnp_raw_data(self, cnp_df: pd.DataFrame) -> pd.DataFrame:
        """
        Parse CNP raw data with proper header handling
        CNP data has headers in row 4 (0-indexed)
        Data starts from row 5 (0-indexed)
        
        Args:
            cnp_df: Raw CNP data DataFrame (read with header=None)
            
        Returns:
            pd.DataFrame: Parsed CNP data with proper column names
        """
        try:
            print(f"Original CNP data shape: {cnp_df.shape}")
            print(f"First 8 rows preview:")
            print(cnp_df.head(8))
            
            # Set row 4 (0-indexed) as the column headers
            cnp_df.columns = cnp_df.iloc[4]
            
            # Drop rows 0 to 5 (inclusive) and reset index
            cnp_df = cnp_df.drop(index=range(0, 6)).reset_index(drop=True)
            
            # Remove empty rows
            cnp_df = cnp_df.dropna(how='all')
            
            # Store parsed CNP data
            self.cnp_data = cnp_df
            
            print(f"Parsed CNP data shape: {cnp_df.shape}")
            print(f"CNP columns: {cnp_df.columns.tolist()}")
            if not cnp_df.empty and 'Receptacle' in cnp_df.columns:
                print(f"Sample receptacle values: {cnp_df['Receptacle'].head().tolist()}")
            else:
                print("Warning: No 'Receptacle' column found in parsed data")
            
            return cnp_df
        except Exception as e:
            print(f"Error parsing CNP data: {str(e)}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame()

    def process_cnp_data(self, cnp_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Process CNP raw data and merge with IODA data to create outputs
        
        Args:
            cnp_df: Raw CNP data DataFrame (with header=None)
            
        Returns:
            Tuple[pd.DataFrame, pd.DataFrame]: (chinapost_export_df, cbd_export_df)
        """
        print("Starting CNP data processing...")
        
        # Parse CNP raw data
        cnp_parsed = self._parse_cnp_raw_data(cnp_df)
        if cnp_parsed.empty:
            raise ValueError("Failed to parse CNP data")
        
        # Load IODA data
        if not self.load_ioda_data():
            raise ValueError("Failed to load IODA data")
        
        # Merge CNP with IODA data
        merged_df = self._merge_cnp_with_ioda(cnp_parsed)
        
        # Create the two required outputs
        chinapost_export_df = self._create_chinapost_export(merged_df)
        cbd_export_df = self._create_cbd_export(chinapost_export_df)
        
        return chinapost_export_df, cbd_export_df
    
    def _merge_cnp_with_ioda(self, cnp_df: pd.DataFrame) -> pd.DataFrame:
        """
        Merge CNP data with IODA data based on Receptacle ID
        Following the script_v4.ipynb logic
        
        Args:
            cnp_df: Parsed CNP data
            
        Returns:
            pd.DataFrame: Merged data (cx_inner_cnp_df equivalent)
        """
        try:
            print("Merging CNP with IODA data...")
            
            # Inner join between IODA data and CNP data on 'Receptacle'
            cx_inner_cnp_df = pd.merge(
                self.master_cardit_inner_event_df, 
                cnp_df, 
                on='Receptacle', 
                how='inner'
            )
            
            print(f"Merged data shape: {cx_inner_cnp_df.shape}")
            
            # Add required columns for CHINAPOST export
            # Number of Packets under same receptacle
            cx_inner_cnp_df['Number of Packet under same receptacle'] = (
                cx_inner_cnp_df.groupby('Receptacle')['Receptacle'].transform('count')
            )
            
            # Enhanced tariff calculation using configured rates
            cx_inner_cnp_df['Customs Declared Value'] = pd.to_numeric(
                cx_inner_cnp_df['Customs Declared Value'], 
                errors='coerce'
            )
            
            # Calculate tariffs using enhanced system
            tariff_results = self._calculate_tariffs_for_shipments(cx_inner_cnp_df)
            cx_inner_cnp_df['Tariff amount'] = tariff_results['tariff_amounts']
            cx_inner_cnp_df['Declared content category'] = tariff_results['categories']
            cx_inner_cnp_df['Postal service type'] = tariff_results['services']
            cx_inner_cnp_df['Tariff rate used'] = tariff_results['rates_used']
            cx_inner_cnp_df['Tariff calculation method'] = tariff_results['methods']
            cx_inner_cnp_df['Shipment date'] = tariff_results['shipment_dates']
            
            # First column increasing number (unnamed column)
            cx_inner_cnp_df[''] = range(1, len(cx_inner_cnp_df) + 1)
            
            # Rename fields to match CHINAPOST template
            cx_inner_cnp_df = cx_inner_cnp_df.rename(columns={
                'Receptacle Weight': 'Bag weight',
                'Content': 'Declared content',
                'HS code': 'HS Code',
                'Customs Declared Value': 'Declared Value'
            })
            
            self.merged_data = cx_inner_cnp_df
            return cx_inner_cnp_df
            
        except Exception as e:
            print(f"Error merging data: {str(e)}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame()
    
    def _create_chinapost_export(self, merged_df: pd.DataFrame) -> pd.DataFrame:
        """
        Create CHINAPOST EXPORT format from merged data
        Following script_v4.ipynb output_1_df logic
        
        Args:
            merged_df: Merged CNP + IODA data
            
        Returns:
            pd.DataFrame: CHINAPOST export format
        """
        try:
            print("Creating CHINAPOST export...")
            
            # Convert all column names to strings
            merged_df.columns = merged_df.columns.map(str)
            
            # Define column order for CHINAPOST export
            start_cols = ['', 'PAWB', 'CARDIT', 'Host Origin Station', 'Host Destination Station']
            
            # Add dynamic flight-related columns (can have any number of legs)
            flight_cols = [col for col in merged_df.columns if any(
                str(col).startswith(prefix) for prefix in [
                    'Flight Carrier', 'Flight Number', 'Flight Date'
                ]
            )]
            
            end_cols = [
                'Arrival Date', 'Arrival ULD number', 
                'Receptacle', 'Bag weight', 'Bag Number',
                'Tracking Number', 'Declared content', 'HS Code',
                'Declared Value', 'Currency', 'Number of Packet under same receptacle', 'Tariff amount'
            ]
            
            # Combine and reorder columns
            new_order = start_cols + flight_cols + end_cols
            
            # Select only columns that exist in the dataframe
            available_cols = [col for col in new_order if col in merged_df.columns]
            chinapost_df = merged_df[available_cols].copy()
            
            print(f"CHINAPOST export shape: {chinapost_df.shape}")
            return chinapost_df
            
        except Exception as e:
            print(f"Error creating CHINAPOST export: {str(e)}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame()
    
    def _create_cbd_export(self, chinapost_df: pd.DataFrame) -> pd.DataFrame:
        """
        Create CBD EXPORT format from CHINAPOST export
        Following script_v4.ipynb cbp_df logic
        
        Args:
            chinapost_df: CHINAPOST export DataFrame
            
        Returns:
            pd.DataFrame: CBD export format
        """
        try:
            print("Creating CBD export...")
            
            df = chinapost_df.copy()
            df.columns = df.columns.map(str)
            
            # Map Host Destination Station to Arrival Port Code
            df['Arrival Port Code'] = df['Host Destination Station'].map(
                self.port_code_mapping
            ).fillna(0).astype(int)
            
            # Identify all flight leg numbers from column names
            flight_leg_nums = sorted(set(
                int(re.search(r'\d+$', col).group())
                for col in df.columns
                if re.search(r'\d+$', col) and (
                    col.startswith('Flight Carrier') or col.startswith('Flight Number')
                )
            ))
            
            # Function to get the highest available flight leg per row
            def get_highest_leg_value(row, prefix):
                for leg in reversed(flight_leg_nums):
                    col_name = f"{prefix} {leg}"
                    if col_name in row and pd.notnull(row[col_name]):
                        return row[col_name]
                return None
            
            # Apply function to get Carrier Code and Flight Number
            df['Carrier Code'] = df.apply(
                lambda row: get_highest_leg_value(row, 'Flight Carrier'), axis=1
            )
            df['Flight/Trip Number'] = df.apply(
                lambda row: get_highest_leg_value(row, 'Flight Number'), axis=1
            )
            
            # Format Arrival Date and Declared Value
            df['Arrival Date'] = pd.to_datetime(
                df['Arrival Date'], errors='coerce'
            ).dt.strftime('%d/%m/%Y')
            
            df['Declared Value (USD)'] = df['Declared Value'].apply(
                lambda x: f"${x:.2f}" if pd.notnull(x) else ""
            )
            
            # Create the final CBD export dataframe
            cbd_df = df[[
                'Carrier Code', 'Flight/Trip Number', 'Tracking Number', 
                'Arrival Port Code', 'Arrival Date', 'Declared Value (USD)'
            ]].copy()
            
            print(f"CBD export shape: {cbd_df.shape}")
            return cbd_df
            
        except Exception as e:
            print(f"Error creating CBD export: {str(e)}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame()
    
    def get_processed_data(self) -> Optional[pd.DataFrame]:
        """
        Get the merged processed data
        
        Returns:
            pd.DataFrame: Merged data or None if not processed yet
        """
        return self.merged_data
    
    def export_to_excel(self, chinapost_df: pd.DataFrame, cbd_df: pd.DataFrame, 
                       output_dir: str = ".") -> Tuple[str, str]:
        """
        Export processed data to Excel files
        
        Args:
            chinapost_df: CHINAPOST export DataFrame
            cbd_df: CBD export DataFrame
            output_dir: Output directory path
            
        Returns:
            Tuple[str, str]: (chinapost_file_path, cbd_file_path)
        """
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            chinapost_path = os.path.join(output_dir, f"CHINAPOST_EXPORT_{timestamp}.xlsx")
            cbd_path = os.path.join(output_dir, f"CBD_EXPORT_{timestamp}.xlsx")
            
            chinapost_df.to_excel(chinapost_path, index=False)
            cbd_df.to_excel(cbd_path, index=False)
            
            return chinapost_path, cbd_path
            
        except Exception as e:
            print(f"Error exporting to Excel: {str(e)}")
            return "", ""
    
    def _calculate_tariffs_for_shipments(self, merged_df: pd.DataFrame) -> dict:
        """
        Calculate tariffs for all shipments using enhanced tariff system
        
        Args:
            merged_df: Merged CNP + IODA data
            
        Returns:
            dict: Contains lists for tariff_amounts, categories, services, rates_used, methods
        """
        try:
            print("Calculating tariffs using enhanced tariff system...")
            
            # Import here to avoid circular imports
            from models import TariffRate
            from datetime import datetime, date
            
            results = {
                'tariff_amounts': [],
                'categories': [],
                'services': [],
                'rates_used': [],
                'methods': [],
                'shipment_dates': []
            }
            
            for _, row in merged_df.iterrows():
                # Extract shipment details
                origin = row.get('Host Origin Station', '')
                destination = row.get('Host Destination Station', '')
                declared_value = row.get('Customs Declared Value', 0)
                bag_weight = row.get('Receptacle Weight', 0)
                
                # Convert values to float
                try:
                    declared_value = float(declared_value) if pd.notnull(declared_value) else 0
                except (ValueError, TypeError):
                    declared_value = 0
                    
                try:
                    bag_weight = float(bag_weight) if pd.notnull(bag_weight) else 0
                except (ValueError, TypeError):
                    bag_weight = 0
                
                # Derive goods category from declared content
                category = self._derive_goods_category(row.get('Content', ''))
                
                # Derive postal service (for now, use default or try to extract from data)
                service = self._derive_postal_service(row)
                
                # Use arrival date or current date for tariff calculation
                ship_date = self._parse_shipment_date(row.get('Arrival Date', ''))
                
                # Calculate tariff using enhanced system with weight
                if declared_value > 0 and origin and destination:
                    tariff_result = TariffRate.calculate_tariff_for_shipment(
                        origin, destination, declared_value, category, service, ship_date, bag_weight
                    )
                    
                    results['tariff_amounts'].append(round(tariff_result['tariff_amount'], 2))
                    results['categories'].append(category)
                    results['services'].append(service)
                    # Import here to avoid circular imports
                    from models import SystemConfig
                    fallback_rate = SystemConfig.get_fallback_rate()
                    results['rates_used'].append(
                        tariff_result['rate_used'].tariff_rate if tariff_result['rate_used'] else fallback_rate
                    )
                    results['methods'].append(
                        'configured' if not tariff_result['fallback_used'] else 'fallback'
                    )
                    results['shipment_dates'].append(ship_date)
                else:
                    # No valid data for calculation
                    results['tariff_amounts'].append(0)
                    results['categories'].append('Unknown')
                    results['services'].append('All')
                    results['rates_used'].append(0)
                    results['methods'].append('no_data')
                    results['shipment_dates'].append(ship_date)
            
            print(f"Completed tariff calculation for {len(results['tariff_amounts'])} shipments")
            configured_count = sum(1 for method in results['methods'] if method == 'configured')
            fallback_count = sum(1 for method in results['methods'] if method == 'fallback')
            print(f"Used configured rates: {configured_count}, Used fallback: {fallback_count}")
            
            return results
            
        except Exception as e:
            print(f"Error calculating tariffs: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return default values in case of error
            row_count = len(merged_df)
            from models import SystemConfig
            return {
                'tariff_amounts': [0] * row_count,
                'categories': ['Unknown'] * row_count,
                'services': ['All'] * row_count,
                'rates_used': [SystemConfig.get_fallback_rate()] * row_count,
                'methods': ['error'] * row_count,
                'shipment_dates': [date.today()] * row_count
            }
    
    def _derive_goods_category(self, declared_content: str) -> str:
        """
        Derive goods category from declared content using enhanced keyword mapping
        
        Args:
            declared_content: The declared content description
            
        Returns:
            str: Derived category
        """
        if not declared_content:
            return 'All'
        
        content_lower = str(declared_content).lower().strip()
        
        # Use configurable category mappings
        from classification_config import get_category_mappings
        category_mappings = get_category_mappings()
        
        # Check each category for keyword matches
        for category, keywords in category_mappings.items():
            if any(keyword in content_lower for keyword in keywords):
                return category
        
        # Default to General Merchandise if no specific match found
        return 'General Merchandise'
    
    def _derive_postal_service(self, row: pd.Series) -> str:
        """
        Derive postal service type from shipment data using enhanced pattern matching
        
        Args:
            row: Shipment data row
            
        Returns:
            str: Derived service type
        """
        # Enhanced service derivation from multiple data sources
        tracking = str(row.get('Tracking Number', '')).upper()
        content = str(row.get('Content', '')).lower()
        declared_value = row.get('Customs Declared Value', 0)
        
        try:
            declared_value = float(declared_value) if pd.notnull(declared_value) else 0
        except (ValueError, TypeError):
            declared_value = 0
        
        # Use configurable service patterns
        from classification_config import get_service_patterns
        service_patterns = get_service_patterns()
        
        # Check tracking number patterns
        for service, patterns in service_patterns.items():
            if any(pattern(tracking) for pattern in patterns):
                return service
        
        # Check content-based service hints
        if any(word in content for word in ['express', 'urgent', 'fast', 'quick']):
            return 'EMS'
        elif any(word in content for word in ['registered', 'insured', 'secure']):
            return 'Registered Mail'
        elif any(word in content for word in ['air mail', 'airmail']):
            return 'Air Mail'
        elif any(word in content for word in ['surface', 'sea', 'economy']):
            return 'Surface Mail'
        
        # Value-based service inference (higher value items often use premium services)
        if declared_value > 100:
            return 'EMS'  # High-value items typically use EMS
        elif declared_value > 20:
            return 'Registered Mail'  # Medium-value items often registered
        
        # Default to wildcard if no pattern matches
        return 'All'
    
    def _parse_shipment_date(self, date_str: str) -> date:
        """
        Parse shipment date from various formats with enhanced error handling
        
        Args:
            date_str: Date string from shipment data
            
        Returns:
            date: Parsed date or today's date if parsing fails
        """
        from data_converter import parse_date_flexible
        
        parsed_date = parse_date_flexible(date_str)
        if parsed_date:
            return parsed_date
        
        # If all parsing fails, return today's date
        return date.today()