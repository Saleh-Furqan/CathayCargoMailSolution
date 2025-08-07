import pandas as pd

file_path = 'Sample Data.xlsx'

print('=' * 120)
print('DETAILED ANALYSIS OF SAMPLE DATA.XLSX')
print('=' * 120)

# Sheet 1: Raw data provided by CNP
print('\n1. RAW DATA PROVIDED BY CNP (Input Sheet)')
print('-' * 60)
df1_raw = pd.read_excel(file_path, sheet_name='Raw data provided by CNP', header=None)
# The English headers are in row 3 (0-indexed)
english_headers = df1_raw.iloc[3, :].tolist()
# The Chinese headers are in row 4 (0-indexed)  
chinese_headers = df1_raw.iloc[4, :].tolist()
# Data starts from row 5
df1 = pd.read_excel(file_path, sheet_name='Raw data provided by CNP', skiprows=5, header=None)
df1.columns = english_headers

# Remove rows that are all NaN
df1 = df1.dropna(how='all')
print(f'Data Shape: {df1.shape}')
print(f'\nColumn Structure (English | Chinese):')
for i, (eng, chi) in enumerate(zip(english_headers[:15], chinese_headers[:15])):  # First 15 columns
    if pd.notna(eng) and pd.notna(chi):
        print(f'{i:2d}. {eng:<25} | {chi}')

print(f'\nSample Data (first 3 rows):')
key_cols = ['Bag Number', 'Receptacle', 'Tracking Number', 'Content', 'HS code', 'Customs Declared Value', 'Currency']
available_cols = [col for col in key_cols if col in df1.columns]
print(df1[available_cols].head(3).to_string(index=False))

print('\n' + '=' * 120)
print('\n2. OUTPUT 1 (INTERNAL USE) - Processed Sheet')
print('-' * 60)
df2_raw = pd.read_excel(file_path, sheet_name='Output 1 (Internal use)', header=None)
# Headers are in row 1 (0-indexed)
headers_row1 = df2_raw.iloc[1, :].tolist()
print('Column Structure:')
key_headers = ['PAWB', 'CARDIT', 'Host Origin Station', 'Host Destination Station', 
               'Flight Carrier 1', 'Flight Number 1', 'Flight Date \\n1', 
               'Receptacle', 'Tracking Number', 'Declared content', 'HS Code', 'Declared Value']
for i, header in enumerate(headers_row1[:15]):
    if pd.notna(header):
        print(f'{i:2d}. {header}')

# Data starts from row 2
df2 = pd.read_excel(file_path, sheet_name='Output 1 (Internal use)', skiprows=2, header=None)
df2.columns = headers_row1
df2 = df2.dropna(how='all')
df2 = df2[df2.iloc[:, 0].notna()]  # Remove rows where first column (Remarks) is NaN

print(f'\nData Shape: {df2.shape}')
print(f'\nSample Data (first 3 rows):')
key_cols_2 = ['PAWB', 'CARDIT', 'Receptacle', 'Tracking Number', 'Declared content', 'Declared Value']
available_cols_2 = [col for col in key_cols_2 if col in df2.columns]
print(df2[available_cols_2].head(3).to_string(index=False))

print('\n' + '=' * 120)
print('\n3. OUTPUT 2 (TO CBP) - Final Export Sheet')
print('-' * 60)
df3 = pd.read_excel(file_path, sheet_name='Output 2 (to CBP)', skiprows=1)
# Clean column names
df3.columns = ['Empty', 'Carrier Code', 'Flight/Trip Number', 'Tracking Number', 
               'Arrival Port Code', 'Arrival Date', 'Declared Value (USD)', 
               'Col7', 'Col8', 'Col9', 'Arrival Port Code2', 'Port']
df3 = df3[df3['Carrier Code'].notna()]
df3 = df3[df3['Carrier Code'] != 'Carrier Code']  # Remove header row

print(f'Data Shape: {df3.shape}')
print(f'\nColumn Structure:')
cbp_cols = ['Carrier Code', 'Flight/Trip Number', 'Tracking Number', 'Arrival Port Code', 'Arrival Date', 'Declared Value (USD)']
for i, col in enumerate(cbp_cols):
    print(f'{i+1}. {col}')

print(f'\nSample Data (first 10 rows):')
print(df3[cbp_cols].head(10).to_string(index=False))

print('\n' + '=' * 120)
print('\n4. DATA MAPPING ANALYSIS')
print('-' * 60)
print('INPUT -> OUTPUT 1 -> OUTPUT 2 TRANSFORMATION:')
print()
print('Raw Data Fields -> Internal Use -> CBP Output')
print('─' * 80)
print('Tracking Number  -> Tracking Number  -> Tracking Number')
print('Content         -> Declared content -> (not included)')
print('HS code         -> HS Code          -> (not included)')
print('Customs Declared Value -> Declared Value -> Declared Value (USD)')
print('Currency        -> Currency         -> (converted to USD)')
print('Receptacle      -> Receptacle       -> (not included)')
print('Bag Number      -> Bag Number       -> (not included)')
print()
print('NEW FIELDS GENERATED IN OUTPUT 1:')
print('- PAWB (Pre-Alert Waybill)')
print('- CARDIT')
print('- Host Origin/Destination Stations')
print('- Flight information (Carrier, Number, Date)')
print('- ULD information')
print('- Tariff calculations')
print()
print('NEW FIELDS IN OUTPUT 2 (CBP):')
print('- Arrival Port Code (derived from destination)')
print('- Flight/Trip Number (simplified from flight info)')
print('- All values converted to USD')

print('\n' + '=' * 120)