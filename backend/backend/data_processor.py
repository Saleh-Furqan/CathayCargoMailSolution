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
from datetime import datetime


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
            self.master_cardit_inner_event_df = pd.read_excel(self.ioda_file_path)
            print(f"Loaded IODA data: {self.master_cardit_inner_event_df.shape}")
            print(f"IODA columns: {self.master_cardit_inner_event_df.columns.tolist()}")
            return True
        except Exception as e:
            print(f"Error loading IODA data: {str(e)}")
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
            
            # Tariff amount (80% of declared value)
            cx_inner_cnp_df['Customs Declared Value'] = pd.to_numeric(
                cx_inner_cnp_df['Customs Declared Value'], 
                errors='coerce'
            )
            cx_inner_cnp_df['Tariff amount'] = (
                cx_inner_cnp_df['Customs Declared Value'] * 0.8
            ).round(2)
            
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
                'Declared Value', 'Currency', 'Tariff amount', 'Number of Packet under same receptacle'
            ]
            
            # Combine and reorder columns
            new_order = start_cols + flight_cols + end_cols
            
            # Select only columns that exist in the dataframe
            available_cols = [col for col in new_order if col in merged_df.columns]
            chinapost_df = merged_df[available_cols].copy()
            
            print(f"CHINAPOST export shape: {chinapost_df.shape}")
            print(f"CHINAPOST columns: {chinapost_df.columns.tolist()}")
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