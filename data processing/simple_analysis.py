import pandas as pd

file_path = 'Sample Data.xlsx'

print('SAMPLE DATA.XLSX STRUCTURE ANALYSIS')
print('=' * 100)

# SHEET 1: Raw Data
print('\n1. RAW DATA PROVIDED BY CNP')
print('-' * 50)
df1 = pd.read_excel(file_path, sheet_name='Raw data provided by CNP')
print(f'Shape: {df1.shape}')

# Check rows 3-6 for headers
raw_data = pd.read_excel(file_path, sheet_name='Raw data provided by CNP', header=None)
print('\nHeader identification:')
print(f'Row 3: {[str(x)[:20] for x in raw_data.iloc[3, :8].tolist() if pd.notna(x)]}')
print(f'Row 4: {[str(x)[:20] for x in raw_data.iloc[4, :8].tolist() if pd.notna(x)]}')

# Use the correct header row
df1_clean = pd.read_excel(file_path, sheet_name='Raw data provided by CNP', skiprows=4)
df1_clean = df1_clean.dropna(how='all')
print(f'\nActual data shape: {df1_clean.shape}')
print(f'Columns (first 10): {df1_clean.columns.tolist()[:10]}')

print(f'\nSample data (first 3 rows):')
if len(df1_clean) > 0:
    key_cols = ['总包号', '邮袋条码', '邮件号码', '内件英文名称', '内件HSCODE', '海关声明价值', '币种']
    available = [col for col in key_cols if col in df1_clean.columns]
    if available:
        print(df1_clean[available].head(3).to_string(index=False))

print('\n' + '=' * 100)
print('\n2. OUTPUT 1 (INTERNAL USE)')
print('-' * 50)
df2 = pd.read_excel(file_path, sheet_name='Output 1 (Internal use)', skiprows=1)
df2 = df2.dropna(how='all')
print(f'Shape: {df2.shape}')
print(f'Columns (first 10): {df2.columns.tolist()[:10]}')

# Get numeric rows only (actual data)
df2_data = df2[pd.to_numeric(df2.iloc[:, 0], errors='coerce').notna()]
print(f'Data rows: {df2_data.shape[0]}')

print(f'\nSample data (first 3 rows):')
key_cols2 = ['PAWB', 'CARDIT', 'Receptacle', 'Tracking Number', 'Declared content', 'Declared Value']
available2 = [col for col in key_cols2 if col in df2_data.columns]
if available2:
    print(df2_data[available2].head(3).to_string(index=False))

print('\n' + '=' * 100)
print('\n3. OUTPUT 2 (CBP)')
print('-' * 50)
df3 = pd.read_excel(file_path, sheet_name='Output 2 (to CBP)', skiprows=1)
df3 = df3.dropna(how='all')
df3_data = df3[df3.iloc[:, 1].notna() & (df3.iloc[:, 1] != 'Carrier Code')]
print(f'Shape: {df3_data.shape}')

print(f'\nSample CBP data (first 5 rows):')
# Use positional indexing for CBP data
cbp_cols = ['Carrier', 'Flight', 'Tracking', 'Port', 'Date', 'Value']
cbp_data = df3_data.iloc[:, 1:7]  # Columns 1-6
cbp_data.columns = cbp_cols
print(cbp_data.head(5).to_string(index=False))

print('\n' + '=' * 100)
print('\n4. FIELD MAPPING SUMMARY')
print('-' * 50)
print('KEY TRANSFORMATIONS:')
print()
print('RAW CNP DATA          INTERNAL USE         CBP OUTPUT')
print('─' * 70)
print('邮件号码               Tracking Number      Tracking Number')
print('内件英文名称            Declared content     (not included)')
print('内件HSCODE            HS Code              (not included)')
print('海关声明价值            Declared Value       Declared Value')
print('币种                  Currency             (USD only)')
print('邮袋条码               Receptacle           (not included)')
print('总包号                Bag Number           (not included)')
print()
print('GENERATED FIELDS:')
print('- PAWB, CARDIT (air waybill references)')
print('- Flight information (carrier, number, date)')
print('- Host origin/destination stations')
print('- Arrival port codes for CBP')
print('- Currency conversion to USD')

print('\n' + '=' * 100)