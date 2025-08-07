import pandas as pd

file_path = 'Sample Data.xlsx'

print('=' * 120)
print('COMPREHENSIVE ANALYSIS OF SAMPLE DATA.XLSX')
print('=' * 120)

# SHEET 1: Raw Data Analysis
print('\n1. RAW DATA PROVIDED BY CNP (Input Sheet)')
print('-' * 70)

# Read the raw sheet without any header processing
raw_sheet1 = pd.read_excel(file_path, sheet_name='Raw data provided by CNP', header=None)

# Find the actual header rows
print('Identifying header structure:')
print('Row 3 (English):', raw_sheet1.iloc[3, :10].tolist())
print('Row 4 (Chinese):', raw_sheet1.iloc[4, :10].tolist())

# Use row 3 as headers (English)
column_names = raw_sheet1.iloc[3, :].tolist()
print(f'\nAll English column names: {[name for name in column_names if pd.notna(name)][:15]}...')

# Read data starting from row 6 (after headers)
df1 = pd.read_excel(file_path, sheet_name='Raw data provided by CNP', skiprows=5)
df1.columns = column_names[:len(df1.columns)]
df1 = df1.dropna(how='all')

print(f'\nRaw Data Shape: {df1.shape}')
print('\nKey Input Columns:')
key_input_cols = ['Bag Number', 'Receptacle', 'Receptacle Weight', 'Tracking Number', 'Content', 'HS code', 'Customs Declared Value', 'Currency']
for col in key_input_cols:
    if col in df1.columns and df1[col].notna().any():
        sample_val = df1[col].dropna().iloc[0] if not df1[col].dropna().empty else 'N/A'
        print(f'  - {col}: {sample_val}')

print(f'\nSample Raw Data (first 3 records):')
display_cols = [col for col in key_input_cols if col in df1.columns]
if display_cols:
    print(df1[display_cols].head(3).to_string(index=False))

print('\n' + '=' * 120)
print('\n2. OUTPUT 1 (INTERNAL USE) - Processing Sheet')
print('-' * 70)

# Read Output 1 sheet
df2_raw = pd.read_excel(file_path, sheet_name='Output 1 (Internal use)', header=None)

# Get the actual header row (row 1)
headers_internal = df2_raw.iloc[1, :].tolist()
print('Internal Use Headers:', [h for h in headers_internal if pd.notna(h)][:15])

# Read the data starting from row 2
df2 = pd.read_excel(file_path, sheet_name='Output 1 (Internal use)', skiprows=2)
df2.columns = headers_internal[:len(df2.columns)]
df2 = df2.dropna(how='all')

# Filter to actual data rows (where first column has numeric values)
df2 = df2[pd.to_numeric(df2.iloc[:, 0], errors='coerce').notna()]

print(f'\nInternal Use Data Shape: {df2.shape}')
print('\nKey Internal Columns:')
key_internal_cols = ['PAWB', 'CARDIT', 'Host Origin Station', 'Host Destination Station', 
                     'Receptacle', 'Tracking Number', 'Declared content', 'HS Code', 'Declared Value', 'Currency']
for col in key_internal_cols:
    if col in df2.columns and df2[col].notna().any():
        sample_val = df2[col].dropna().iloc[0] if not df2[col].dropna().empty else 'N/A'
        print(f'  - {col}: {sample_val}')

print('\n' + '=' * 120)
print('\n3. OUTPUT 2 (CBP EXPORT) - Final Export Sheet')
print('-' * 70)

# Read CBP output sheet
df3 = pd.read_excel(file_path, sheet_name='Output 2 (to CBP)', skiprows=1)
# Get actual column names from the header row
cbp_headers = ['Empty', 'Carrier Code', 'Flight/Trip Number', 'Tracking Number', 
               'Arrival Port Code', 'Arrival Date', 'Declared Value (USD)', 
               'Col7', 'Col8', 'Col9', 'Port Code2', 'Port Name']
df3.columns = cbp_headers[:len(df3.columns)]
df3 = df3[df3['Carrier Code'].notna() & (df3['Carrier Code'] != 'Carrier Code')]

print(f'CBP Export Data Shape: {df3.shape}')
print('\nCBP Export Columns:')
cbp_output_cols = ['Carrier Code', 'Flight/Trip Number', 'Tracking Number', 'Arrival Port Code', 'Arrival Date', 'Declared Value (USD)']
for col in cbp_output_cols:
    if col in df3.columns and df3[col].notna().any():
        sample_val = df3[col].dropna().iloc[0] if not df3[col].dropna().empty else 'N/A'
        print(f'  - {col}: {sample_val}')

print(f'\nSample CBP Data (first 5 records):')
print(df3[cbp_output_cols].head(5).to_string(index=False))

print('\n' + '=' * 120)
print('\n4. DATA TRANSFORMATION MAPPING')
print('-' * 70)
print('FIELD TRANSFORMATIONS:')
print()
print('RAW INPUT ───────────────→ INTERNAL USE ─────────────→ CBP OUTPUT')
print('─' * 80)
print('Tracking Number           Tracking Number              Tracking Number')
print('Content                   Declared content             (removed)')
print('HS code                   HS Code                      (removed)')  
print('Customs Declared Value    Declared Value               Declared Value (USD)')
print('Currency                  Currency                     (converted to USD)')
print('Receptacle                Receptacle                   (removed)')
print('Bag Number                Bag Number                   (removed)')
print('(generated)               PAWB                         (removed)')
print('(generated)               CARDIT                       (removed)')
print('(generated)               Flight Carrier 1             Carrier Code')
print('(generated)               Flight Number 1              Flight/Trip Number')
print('(generated)               Flight Date                  (removed)')
print('(generated)               Host Destination Station     Arrival Port Code')
print('(generated)               Arrival Date                 Arrival Date')

print('\n\nDATA PROCESSING STEPS:')
print('1. Raw CNP data contains basic shipment information')
print('2. Internal processing adds flight routing and PAWB details')
print('3. CBP export simplifies to required customs fields only')
print('4. Currency conversion to USD applied in final step')
print('5. Port codes derived from destination station codes')

print('\n' + '=' * 120)