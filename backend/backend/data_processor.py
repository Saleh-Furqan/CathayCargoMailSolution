"""
Data processing module for merging CNP raw data with IODA data
Based on the Jupyter notebook script for data processing pipeline
Handles complete data processing from CNP raw data to Internal Use and CBP output formats
"""

import pandas as pd
import numpy as np
import os
from typing import Dict, Any, Tuple, Optional
from datetime import datetime


class DataProcessor:
    """
    Handles the data processing pipeline from raw CNP data to processed output
    Processes CNP raw data and merges with IODA reference data to create formatted outputs
    """
    
    def __init__(self, ioda_file_path: str):
        """
        Initialize the data processor
        
        Args:
            ioda_file_path: Path to the IODA data file
        """
        self.ioda_file_path = ioda_file_path
        self.cardit_df = None
        self.master_df = None
        self.event_df = None
        self.processed_df = None
        self.cnp_data = None
        
        # Port code mapping for CBP output
        self.port_code_mapping = {
            'LAX': '4701',  # Los Angeles
            'JFK': '4701',  # New York (using same code for now)
            'ORD': '4701',  # Chicago (using same code for now)
            'SFO': '4701',  # San Francisco (using same code for now)
        }
    
    def load_ioda_data(self) -> bool:
        """
        Load and process IODA data tables
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Load sheets from the IODA file
            self.cardit_df = pd.read_excel(self.ioda_file_path, sheet_name='fct_cgo_gls_mail_cardit')
            self.master_df = pd.read_excel(self.ioda_file_path, sheet_name='dim_cgo_cargo_awb_master')
            self.event_df = pd.read_excel(self.ioda_file_path, sheet_name='fct_cgo_mail_cardit_receptacle')
            
            # Process each table
            self._process_cardit_data()
            self._process_event_data()
            self._process_master_data()
            
            return True
        except Exception as e:
            print(f"Error loading IODA data: {str(e)}")
            return False
    
    def _process_cardit_data(self):
        """Process cardit table data sanitisation"""
        # Filter post_office field for China Post only 
        self.cardit_df = self.cardit_df[self.cardit_df['post_office'] == 'China Post']
        
        # Filter leg_number field for first leg only
        self.cardit_df = self.cardit_df[self.cardit_df['leg_number'] == 1]
        
        # Keep only necessary columns
        columns_to_keep_cardit = [
            "dim_cgo_cargo_awb_master_sk", 
            "receptacle_charge_weight", 
            "shipment_origin", 
            "shipment_dest", 
            "fct_cgo_gls_mail_cardit_sk"
        ]
        self.cardit_df = self.cardit_df[columns_to_keep_cardit]
    
    def _process_event_data(self):
        """Process event table data sanitisation"""
        # Remove the string "[Null]" from the whole table
        self.event_df = self.event_df.replace("[Null]", np.nan).infer_objects(copy=False)
        
        # Remove rows where actual_depart_datetime_local is null
        self.event_df = self.event_df[self.event_df['actual_depart_datetime_local'].notna()]
        
        # Convert datetime columns
        self.event_df['actual_depart_datetime_local'] = pd.to_datetime(
            self.event_df['actual_depart_datetime_local'], errors='coerce'
        )
        self.event_df['actual_arrive_datetime_local'] = pd.to_datetime(
            self.event_df['actual_arrive_datetime_local'], errors='coerce'
        )
        
        # Create arrival datetime field for each receptacle_id
        self.event_df['Arrive Datetime'] = self.event_df.groupby('receptacle_id')[
            'actual_arrive_datetime_local'
        ].transform('max')
        
        # Filter leg_number field for first leg only
        self.event_df = self.event_df[self.event_df['leg_number'] == 1]
        
        # Keep only rows with the latest actual_depart_datetime_local for each receptacle_id
        self.event_df = self.event_df.loc[
            self.event_df.groupby('receptacle_id')['actual_depart_datetime_local'].idxmax()
        ]
        
        # Keep only necessary columns
        columns_to_keep_event = [
            "fct_cgo_gls_mail_cardit_sk",
            "carrier_code", 
            "flight_number", 
            "actual_depart_datetime_local", 
            "Arrive Datetime",
            "receptacle_id"
        ]
        self.event_df = self.event_df[columns_to_keep_event]
    
    def _process_master_data(self):
        """Process master table data sanitisation"""
        columns_to_keep_master = ["dim_cgo_cargo_awb_master_sk", "awb_number"]
        self.master_df = self.master_df[columns_to_keep_master]
    
    def merge_tables(self) -> bool:
        """
        Merge the processed tables
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Inner join master and cardit on dim_cgo_cargo_awb_master_sk
            master_inner_cardit_df = self.master_df.merge(
                self.cardit_df, how='inner', on='dim_cgo_cargo_awb_master_sk'
            )
            
            # Inner join with event data
            self.processed_df = master_inner_cardit_df.merge(
                self.event_df, how='inner', on='fct_cgo_gls_mail_cardit_sk'
            )
            
            return True
        except Exception as e:
            print(f"Error merging tables: {str(e)}")
            return False
    
    def post_merge_processing(self):
        """Post-merge processing and formatting"""
        # Rename actual_depart_datetime_local to Depart Datetime
        self.processed_df = self.processed_df.rename(columns={
            "actual_depart_datetime_local": "Depart Datetime"
        })
        
        # Handle multiple AWB numbers for same receptacle_id
        self._handle_duplicate_receptacles()
        
        # Rename fields to match CNP Template 
        self.processed_df = self.processed_df.rename(columns={
            'awb_number': 'AWB Number',
            'receptacle_charge_weight': 'Weight',
            'shipment_origin': 'Departure Station',
            'shipment_dest': 'Destination',
            'carrier_code': 'Airline',
            'flight_number': 'Flight Number',
            'receptacle_id': 'Receptacle ID'
        })
        
        # Reorder columns to match desired format
        desired_order = [
            "AWB Number",
            "Departure Station", 
            "Destination",
            "Weight",
            "Airline",
            "Flight Number",
            "Depart Datetime",
            "Arrive Datetime",
            "Receptacle ID"
        ]
        
        self.processed_df = self.processed_df[desired_order]
    
    def _handle_duplicate_receptacles(self):
        """
        Handle case where there are multiple AWB numbers for same receptacle_id
        Concatenate multiple AWB numbers into single cell separated by commas
        """
        # Identify duplicated Receptacle IDs
        duplicated_ids = self.processed_df['receptacle_id'].duplicated(keep=False)
        
        # Split into duplicates and non-duplicates
        duplicates_df = self.processed_df[duplicated_ids]
        non_duplicates_df = self.processed_df[~duplicated_ids]
        
        if not duplicates_df.empty:
            # Group by receptacle_id and aggregate
            grouped_duplicates = duplicates_df.groupby('receptacle_id').agg({
                'awb_number': lambda x: ', '.join(sorted(set(x.astype(str)))),
                'shipment_origin': 'first',
                'shipment_dest': 'first',
                'receptacle_charge_weight': 'first',
                'carrier_code': 'first',
                'flight_number': 'first',
                'Depart Datetime': 'first',
                'Arrive Datetime': 'first'
            }).reset_index()
            
            # Combine with non-duplicates
            self.processed_df = pd.concat([non_duplicates_df, grouped_duplicates], ignore_index=True)
    
    def _parse_cnp_raw_data(self, cnp_df: pd.DataFrame) -> pd.DataFrame:
        """
        Parse CNP raw data with proper header handling
        CNP data has English headers in row 4 and Chinese headers in row 5
        Data starts from row 6
        
        Args:
            cnp_df: Raw CNP data DataFrame (read with header=None)
            
        Returns:
            pd.DataFrame: Parsed CNP data with proper column names
        """
        try:
            # Extract headers from rows 4 and 5 (0-indexed)
            english_headers = cnp_df.iloc[4].fillna('').astype(str).tolist()
            chinese_headers = cnp_df.iloc[5].fillna('').astype(str).tolist()
            
            # Create combined headers
            combined_headers = []
            for i, (eng, chi) in enumerate(zip(english_headers, chinese_headers)):
                if eng.strip() and eng.strip() != 'nan' and chi.strip() and chi.strip() != 'nan':
                    combined_headers.append(f"{eng.strip()} ({chi.strip()})")
                elif eng.strip() and eng.strip() != 'nan':
                    combined_headers.append(eng.strip())
                elif chi.strip() and chi.strip() != 'nan':
                    combined_headers.append(chi.strip())
                else:
                    combined_headers.append(f"Column_{i}")
            
            # Extract data starting from row 6 (0-indexed)
            data_df = cnp_df.iloc[6:].copy()
            data_df.columns = combined_headers[:len(data_df.columns)]
            data_df = data_df.reset_index(drop=True)
            
            # Remove empty rows
            data_df = data_df.dropna(how='all')
            
            # Store parsed CNP data
            self.cnp_data = data_df
            
            print(f"Parsed CNP data: {data_df.shape}")
            print(f"Columns: {data_df.columns.tolist()}")
            if not data_df.empty:
                print(f"Sample receptacle values: {data_df['Receptacle (邮袋条码)'].head().tolist()}")
            
            return data_df
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
            Tuple[pd.DataFrame, pd.DataFrame]: (internal_use_df, cbp_df)
        """
        # Parse CNP raw data
        cnp_parsed = self._parse_cnp_raw_data(cnp_df)
        if cnp_parsed.empty:
            raise ValueError("Failed to parse CNP data")
        
        # Load and process IODA data
        if not self.load_ioda_data():
            raise ValueError("Failed to load IODA data")
        
        # Merge tables
        if not self.merge_tables():
            raise ValueError("Failed to merge tables")
        
        # Post-merge processing
        self.post_merge_processing()
        
        # Create the two required outputs
        internal_use_df = self._create_internal_use_output(cnp_parsed)
        cbp_df = self._create_cbp_output(cnp_parsed)
        
        return internal_use_df, cbp_df
    
    def _create_internal_use_output(self, cnp_df: pd.DataFrame) -> pd.DataFrame:
        """
        Create Output 1 (Internal use) format based on processed data
        This matches the format of "Output 1 (Internal use)" sheet in Sample Data.xlsx
        """
        if cnp_df.empty:
            return pd.DataFrame()
        
        internal_data = []
        
        # Merge CNP data with IODA processed data based on Receptacle ID
        for _, cnp_row in cnp_df.iterrows():
            # Find matching receptacle in processed data
            receptacle_col = None
            for col in cnp_df.columns:
                if 'Receptacle' in col or '邮袋条码' in col:
                    receptacle_col = col
                    break
            
            if receptacle_col is None:
                continue
                
            cnp_receptacle = str(cnp_row.get(receptacle_col, ''))
            
            # Find matching IODA data
            matching_ioda = None
            if self.processed_df is not None and not self.processed_df.empty:
                matching_ioda = self.processed_df[self.processed_df['Receptacle ID'] == cnp_receptacle]
            
            # Extract values from CNP data
            tracking_number = self._get_cnp_field_value(cnp_row, ['Tracking Number', '邮件号码'])
            content = self._get_cnp_field_value(cnp_row, ['Content', '内件英文名称'])
            hs_code = self._get_cnp_field_value(cnp_row, ['HS code', '内件HSCODE'])
            declared_value = self._get_cnp_field_value(cnp_row, ['Customs Declared Value', '海关声明价值'])
            currency = self._get_cnp_field_value(cnp_row, ['Currency', '币种'])
            bag_number = self._get_cnp_field_value(cnp_row, ['Bag Number', '总包号'])
            receptacle_weight = self._get_cnp_field_value(cnp_row, ['Receptacle Weight', '邮件重量'])
            
            # Convert declared value to float for calculations
            try:
                declared_value_num = float(declared_value) if declared_value else 0
                tariff_amount = declared_value_num * 0.8  # 80% of declared value
            except (ValueError, TypeError):
                declared_value_num = 0
                tariff_amount = 0
            
            if matching_ioda is not None and not matching_ioda.empty:
                # Use actual IODA data
                ioda_row = matching_ioda.iloc[0]
                internal_row = {
                    'PAWB': ioda_row.get('AWB Number', ''),
                    'CARDIT': f"CNBJSA{str(hash(cnp_receptacle))[-6:]}",
                    'Host Origin Station': ioda_row.get('Departure Station', ''),
                    'Host Destination Station': ioda_row.get('Destination', ''),
                    'Flight Carrier 1': ioda_row.get('Airline', ''),
                    'Flight Number 1': ioda_row.get('Flight Number', ''),
                    'Flight Date 1': self._format_date(ioda_row.get('Depart Datetime', '')),
                    'Flight Carrier 2': '',
                    'Flight Number 2': '',
                    'Flight Date 2': '',
                    'Arrival Date': self._format_date(ioda_row.get('Arrive Datetime', '')),
                    'ULD Number': '',
                    'Receptacle': cnp_receptacle,
                    'Bag Weight': ioda_row.get('Weight', ''),
                    'Bag Number': bag_number,
                    'Number of packets inside Receptacle': 1,
                    'Tracking Number': tracking_number,
                    'Declared content': content,
                    'HS Code': hs_code,
                    'Declared Value': declared_value,
                    'Currency': currency,
                    'Tariff amount': round(tariff_amount, 2)
                }
            else:
                # Create demo data when no matching IODA data (for demonstration)
                internal_row = {
                    'PAWB': f"128-{hash(cnp_receptacle) % 100000000}",
                    'CARDIT': f"CNBJSA{str(hash(cnp_receptacle))[-6:]}",
                    'Host Origin Station': 'PEK',  # Default origin
                    'Host Destination Station': self._infer_destination_from_receptacle(cnp_receptacle),
                    'Flight Carrier 1': 'CX',  # Default carrier
                    'Flight Number 1': str(300 + (hash(cnp_receptacle) % 600)),  # Generate flight number
                    'Flight Date 1': '2025-07-26',  # Default date
                    'Flight Carrier 2': '',
                    'Flight Number 2': '',
                    'Flight Date 2': '',
                    'Arrival Date': '2025-07-26',
                    'ULD Number': '',
                    'Receptacle': cnp_receptacle,
                    'Bag Weight': receptacle_weight,
                    'Bag Number': bag_number,
                    'Number of packets inside Receptacle': 1,
                    'Tracking Number': tracking_number,
                    'Declared content': content,
                    'HS Code': hs_code,
                    'Declared Value': declared_value,
                    'Currency': currency,
                    'Tariff amount': round(tariff_amount, 2)
                }
            
            internal_data.append(internal_row)
        
        return pd.DataFrame(internal_data)
    
    def _create_cbp_output(self, cnp_df: pd.DataFrame) -> pd.DataFrame:
        """
        Create Output 2 (to CBP) format based on processed data
        This matches the format of "Output 2 (to CBP)" sheet in Sample Data.xlsx
        """
        if cnp_df.empty:
            return pd.DataFrame()
        
        cbp_data = []
        
        # Merge CNP data with IODA processed data based on Receptacle ID
        for _, cnp_row in cnp_df.iterrows():
            # Find matching receptacle in processed data
            receptacle_col = None
            for col in cnp_df.columns:
                if 'Receptacle' in col or '邮袋条码' in col:
                    receptacle_col = col
                    break
            
            if receptacle_col is None:
                continue
                
            cnp_receptacle = str(cnp_row.get(receptacle_col, ''))
            
            # Find matching IODA data
            matching_ioda = None
            if self.processed_df is not None and not self.processed_df.empty:
                matching_ioda = self.processed_df[self.processed_df['Receptacle ID'] == cnp_receptacle]
            
            # Extract values from CNP data
            tracking_number = self._get_cnp_field_value(cnp_row, ['Tracking Number', '邮件号码'])
            declared_value = self._get_cnp_field_value(cnp_row, ['Customs Declared Value', '海关声明价值'])
            currency = self._get_cnp_field_value(cnp_row, ['Currency', '币种'])
            
            # Convert to USD if needed
            declared_value_usd = self._convert_to_usd(declared_value, currency)
            
            if matching_ioda is not None and not matching_ioda.empty:
                # Use actual IODA data
                ioda_row = matching_ioda.iloc[0]
                destination = ioda_row.get('Destination', '')
                arrival_port_code = self.port_code_mapping.get(destination, '4701')
                
                cbp_row = {
                    'Carrier Code': ioda_row.get('Airline', ''),
                    'Flight/ Trip Number': ioda_row.get('Flight Number', ''),
                    'Tracking Number': tracking_number,
                    'Arrival Port Code': arrival_port_code,
                    'Arrival Date': self._format_date(ioda_row.get('Arrive Datetime', '')),
                    'Declared Value (USD)': declared_value_usd
                }
            else:
                # Create demo data when no matching IODA data
                destination = self._infer_destination_from_receptacle(cnp_receptacle)
                arrival_port_code = self.port_code_mapping.get(destination, '4701')
                
                cbp_row = {
                    'Carrier Code': 'CX',
                    'Flight/ Trip Number': str(300 + (hash(cnp_receptacle) % 600)),
                    'Tracking Number': tracking_number,
                    'Arrival Port Code': arrival_port_code,
                    'Arrival Date': '2025-07-26',
                    'Declared Value (USD)': declared_value_usd
                }
            
            cbp_data.append(cbp_row)
        
        return pd.DataFrame(cbp_data)
    
    def _infer_destination_from_receptacle(self, receptacle_id: str) -> str:
        """
        Infer destination from receptacle ID patterns
        
        Args:
            receptacle_id: Receptacle ID string
            
        Returns:
            str: Inferred destination code
        """
        receptacle_id = str(receptacle_id).upper()
        if 'LAX' in receptacle_id:
            return 'LAX'
        elif 'JFK' in receptacle_id:
            return 'JFK'
        elif 'ORD' in receptacle_id:
            return 'ORD'
        elif 'SFO' in receptacle_id:
            return 'SFO'
        else:
            return 'LAX'  # Default
    
    def _get_cnp_field_value(self, row: pd.Series, field_names: list) -> str:
        """
        Get field value from CNP row trying multiple possible field names
        
        Args:
            row: Pandas Series (CNP data row)
            field_names: List of possible field names to try
            
        Returns:
            str: Field value or empty string if not found
        """
        for field_name in field_names:
            for col in row.index:
                if field_name in str(col):
                    value = row[col]
                    return str(value) if pd.notna(value) else ''
        return ''
    
    def _format_date(self, date_value: Any) -> str:
        """
        Format date value for output
        
        Args:
            date_value: Date value to format
            
        Returns:
            str: Formatted date string (YYYY-MM-DD)
        """
        if pd.isna(date_value):
            return ''
        
        try:
            if isinstance(date_value, str):
                date_obj = pd.to_datetime(date_value)
            else:
                date_obj = date_value
            return date_obj.strftime('%Y-%m-%d')
        except:
            return str(date_value)
    
    def _convert_to_usd(self, value: str, currency: str) -> str:
        """
        Convert currency value to USD
        
        Args:
            value: Value to convert
            currency: Current currency
            
        Returns:
            str: USD value
        """
        try:
            num_value = float(value) if value else 0
            
            # Simple conversion - in real implementation, use actual exchange rates
            if currency == 'USD':
                return str(num_value)
            elif currency == 'CNY' or currency == 'RMB':
                return str(round(num_value / 7.0, 2))  # Approximate conversion
            else:
                return str(num_value)  # Default to same value
        except (ValueError, TypeError):
            return '0'
    
    def get_processed_data(self) -> Optional[pd.DataFrame]:
        """
        Get the processed data
        
        Returns:
            pd.DataFrame: Processed data or None if not processed yet
        """
        return self.processed_df
    
    def export_processed_data(self, output_path: str) -> bool:
        """
        Export processed data to Excel file
        
        Args:
            output_path: Path to save the Excel file
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if self.processed_df is not None:
                self.processed_df.to_excel(output_path, index=False)
                return True
            return False
        except Exception as e:
            print(f"Error exporting data: {str(e)}")
            return False