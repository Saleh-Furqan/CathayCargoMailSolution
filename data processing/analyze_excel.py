import pandas as pd

file_path = 'Sample Data.xlsx'

print('=== SHEET 1: Raw data provided by CNP ===')
print('Reading raw sheet to find correct header row...')
raw_df1 = pd.read_excel(file_path, sheet_name='Raw data provided by CNP', header=None)
print('First 6 rows to identify header:')
for i in range(min(6, len(raw_df1))):
    print(f'Row {i}: {raw_df1.iloc[i, 0:5].tolist()}')

print('\n' + '='*80)
print('Reading with row 3 as header (English headers):')
df1 = pd.read_excel(file_path, sheet_name='Raw data provided by CNP', header=3)
# Drop empty columns
df1 = df1.dropna(axis=1, how='all')
print(f'Shape: {df1.shape}')
print(f'Columns: {list(df1.columns)}')
print('\nFirst 5 data rows (non-NaN):')
df1_data = df1.dropna(how='all')
print(df1_data.head().to_string())

print('\n' + '='*100)
print('=== SHEET 2: Output 1 (Internal use) ===')
raw_df2 = pd.read_excel(file_path, sheet_name='Output 1 (Internal use)', header=None)
print('First 3 rows to identify header:')
for i in range(min(3, len(raw_df2))):
    print(f'Row {i}: {raw_df2.iloc[i, 0:10].tolist()}')

df2 = pd.read_excel(file_path, sheet_name='Output 1 (Internal use)', header=0)
# Clean the data
df2_clean = df2.dropna(how='all')
df2_clean = df2_clean[df2_clean['Renarks'].notna()]  # Keep only rows with remark numbers
print(f'Shape: {df2_clean.shape}')
print(f'Key columns: PAWB, CARDIT, Receptacle, Tracking Number, Declared content, HS Code, Declared Value')
print('\nFirst 5 data rows:')
print(df2_clean[['Renarks', 'Unnamed: 1', 'Unnamed: 2', 'Key', 'Provided by CNP', 'Provided by CNP.3', 'Provided by CNP.4', 'Provided by CNP.5']].head().to_string())

print('\n' + '='*100)
print('=== SHEET 3: Output 2 (to CBP) ===')
df3 = pd.read_excel(file_path, sheet_name='Output 2 (to CBP)', header=1)
# Clean the data 
df3_clean = df3.dropna(subset=[df3.columns[1]])  # Keep rows with carrier code
df3_clean = df3_clean[df3_clean[df3_clean.columns[1]] != 'Carrier Code']  # Remove header row
print(f'Shape: {df3_clean.shape}')
print(f'CBP Output columns: Carrier Code, Flight/Trip Number, Tracking Number, Arrival Port Code, Arrival Date, Declared Value')
print('\nFirst 10 data rows:')
print(df3_clean[[df3_clean.columns[1], df3_clean.columns[2], df3_clean.columns[3], df3_clean.columns[4], df3_clean.columns[5], df3_clean.columns[6]]].head(10).to_string())