from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, Alignment, Border, Side
import io
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Template file paths
CP_TEMPLATE = "templates/China Post data source file template.xlsx"
CBP_TEMPLATE = "templates/CBP transported package worksheet file template.xlsx"

# Column mappings from original code
CP_COLUMNS = [
    "*运单号 (AWB Number)",
    "*始发站（Departure station）",
    "*目的站（Destination）",
    "*件数(Pieces)",
    "*重量 (Weight)",
    "航司(Airline)",
    "航班号 (Flight Number)",
    "航班日期 (Flight Date)",
    "一个航班的邮件item总数 (Total mail items per flight)",
    "一个航班的邮件总重量 (Total mail weight per flight)",
    "*运价类型 (Rate Type)",
    "*费率 (Rate)",
    "*航空运费 (Air Freight)",
    "代理人的其他费用 (Agent's Other Charges)",
    "承运人的其他费用 (Carrier's Other Charges)",
    "*总运费 (Total Charges)"
]

CBP_COLUMNS = [
    "Carrier Code",
    "Flight/ Trip Number",
    "Tracking Number",
    "Arrival Port Code",
    "Arrival Date",
    "Declared Value (USD)"
]

# CBP header mapping
CBP_HEADER_LOOKUP = {
    "Carrier Code": "Carrier Code",
    "Flight/ Trip Number": "Flight/ Trip Number", 
    "Tracking Number": "Tracking Number",
    "Arrival Port Code": "Arrival Port Code",
    "Arrival Date": "Arrival Date",
    "Declared Value (USD)": "Declared Value (USD)"
}

def build_header_map(ws, header_rows):
    """Helper function to map template headers to column indices"""
    mapping = {}
    for row in header_rows:
        for cell in row:
            if cell.value and isinstance(cell.value, str):
                mapping[cell.value.strip()] = cell.column
    return mapping

def filter_cp_data(df):
    """Filter out instruction/sample rows from China Post data"""
    instruction_keywords = [
        "此行开始填具体某个邮件的信息",
        "Below shows sample data for individual mail items",
        "航司提供",
        "To be completed by airline",
        "根据启运口岸提供固定地址",
        "Fixed sender address in English",
        "根据目的口岸提供固定地址", 
        "Fixed recipient address in English",
        "CP将要求所有美国路向的邮件收寄时必须按照美元申报",
        "CP will require all US-bound mail to declare value in USD"
    ]
    
    mask = df["*运单号 (AWB Number)"].astype(str).apply(
        lambda x: not any(keyword in str(x) for keyword in instruction_keywords)
    )
    return df[mask].reset_index(drop=True)

def create_china_post_output(df):
    """Create China Post output Excel file"""
    # Filter data
    cp_df = df[CP_COLUMNS].copy()
    cp_df = filter_cp_data(cp_df)
    
    # Load template to extract headers
    wb_cp_template = load_workbook(CP_TEMPLATE)
    ws_cp_template = wb_cp_template.active
    
    # Create new workbook
    wb_cp = Workbook()
    ws_cp = wb_cp.active
    
    # Copy header rows (1-2) from template
    for row_num in [1, 2]:
        for col_num in range(1, ws_cp_template.max_column + 1):
            template_cell = ws_cp_template.cell(row=row_num, column=col_num)
            new_cell = ws_cp.cell(row=row_num, column=col_num)
            new_cell.value = template_cell.value
            # Copy header formatting
            if template_cell.font:
                new_cell.font = Font(name=template_cell.font.name, size=template_cell.font.size, bold=template_cell.font.bold)
            if template_cell.alignment:
                new_cell.alignment = Alignment(horizontal=template_cell.alignment.horizontal, vertical=template_cell.alignment.vertical, wrap_text=template_cell.alignment.wrap_text)
    
    # Set header row heights
    ws_cp.row_dimensions[1].height = 51.0
    ws_cp.row_dimensions[2].height = 81.0
    
    # Build header mapping
    header_map_cp = build_header_map(ws_cp, ws_cp.iter_rows(min_row=1, max_row=2))
    
    # Column header lookup
    cp_header_lookup = {
        "*运单号 (AWB Number)": "*运单号 \n(AWB Number)",
        "*始发站（Departure station）": "*始发站\n（Departure station）",
        "*目的站（Destination）": "*目的站\n（Destination）",
        "*件数(Pieces)": "*件数(Pieces)",
        "*重量 (Weight)": "*重量 \n(Weight) ",
        "航司(Airline)": "航司(Airline)",
        "航班号 (Flight Number)": "航班号\n(Flight Number)",
        "航班日期 (Flight Date)": "航班日期\n(Flight Date)",
        "一个航班的邮件item总数 (Total mail items per flight)": "一个航班的邮件item总数\n (Total mail items per flight)",
        "一个航班的邮件总重量 (Total mail weight per flight)": "一个航班的邮件总重量\n(Total mail weight per flight)",
        "*运价类型 (Rate Type)": "*运价类型\n (Rate Type)",
        "*费率 (Rate)": "*费率\n (Rate)",
        "*航空运费 (Air Freight)": "*航空运费\n(Air Freight)",
        "代理人的其他费用 (Agent's Other Charges)": "代理人的其他费用\n(Agent's Other Charges)",
        "承运人的其他费用 (Carrier's Other Charges)": "承运人的其他费用\n (Carrier's Other Charges)",
        "*总运费 (Total Charges)": "*总运费\n (Total Charges)"
    }
    
    # Insert data starting from row 3
    start_row_cp = 3
    standard_height = 15
    default_font = Font(name="Calibri", size=11)
    default_alignment = Alignment(horizontal="left", vertical="center")
    
    for i, row in cp_df.iterrows():
        excel_row = start_row_cp + i
        for df_col, template_header in cp_header_lookup.items():
            col_idx = header_map_cp.get(template_header)
            if col_idx:
                cell = ws_cp.cell(row=excel_row, column=col_idx, value=row[df_col])
                cell.font = default_font
                cell.alignment = default_alignment
        
        ws_cp.row_dimensions[excel_row].height = standard_height
    
    # Save to BytesIO
    output = io.BytesIO()
    wb_cp.save(output)
    output.seek(0)
    
    return output

def create_cbp_output(df):
    """Create CBP output Excel file"""
    # Extract CBP data
    cbp_df = df[CBP_COLUMNS].copy()
    
    # Load CBP template
    wb_cbp_template = load_workbook(CBP_TEMPLATE)
    ws_cbp_template = wb_cbp_template.active
    
    # Create new CBP workbook
    wb_cbp = Workbook()
    ws_cbp = wb_cbp.active
    
    # Copy header rows (1-3) from template
    for row_num in [1, 2, 3]:
        for col_num in range(1, ws_cbp_template.max_column + 1):
            template_cell = ws_cbp_template.cell(row=row_num, column=col_num)
            new_cell = ws_cbp.cell(row=row_num, column=col_num)
            new_cell.value = template_cell.value
            # Copy header formatting
            if template_cell.font:
                new_cell.font = Font(name=template_cell.font.name, size=template_cell.font.size, bold=template_cell.font.bold)
            if template_cell.alignment:
                new_cell.alignment = Alignment(horizontal=template_cell.alignment.horizontal, vertical=template_cell.alignment.vertical, wrap_text=template_cell.alignment.wrap_text)
    
    # Set header row heights
    ws_cbp.row_dimensions[1].height = 15.4
    ws_cbp.row_dimensions[2].height = 15.4
    ws_cbp.row_dimensions[3].height = 15.75
    
    # Build header mapping
    header_map_cbp = build_header_map(ws_cbp, [ws_cbp[3]])
    
    # Insert data starting from row 4
    start_row_cbp = 4
    standard_height = 15
    default_font = Font(name="Calibri", size=11)
    default_alignment = Alignment(horizontal="left", vertical="center")
    
    for i, row in cbp_df.iterrows():
        excel_row = start_row_cbp + i
        for col_name in CBP_COLUMNS:
            template_header = CBP_HEADER_LOOKUP.get(col_name, col_name)
            col_idx = header_map_cbp.get(template_header)
            if col_idx:
                cell = ws_cbp.cell(row=excel_row, column=col_idx, value=row[col_name])
                cell.font = default_font
                cell.alignment = default_alignment
        
        ws_cbp.row_dimensions[excel_row].height = standard_height
    
    # Save to BytesIO
    output = io.BytesIO()
    wb_cbp.save(output)
    output.seek(0)
    
    return output

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/process-data', methods=['POST'])
def process_data():
    """Process input data and generate both output files"""
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Validate required columns exist
        missing_cp_cols = [col for col in CP_COLUMNS if col not in df.columns]
        missing_cbp_cols = [col for col in CBP_COLUMNS if col not in df.columns]
        
        if missing_cp_cols and missing_cbp_cols:
            return jsonify({
                "error": "Missing required columns",
                "missing_cp_columns": missing_cp_cols,
                "missing_cbp_columns": missing_cbp_cols
            }), 400
        
        # Generate both files
        results = {}
        
        if not missing_cp_cols:
            cp_output = create_china_post_output(df)
            results["china_post"] = {
                "available": True,
                "records_processed": len(df[CP_COLUMNS])
            }
        else:
            results["china_post"] = {
                "available": False,
                "missing_columns": missing_cp_cols
            }
        
        if not missing_cbp_cols:
            cbp_output = create_cbp_output(df)
            results["cbp"] = {
                "available": True,
                "records_processed": len(df[CBP_COLUMNS])
            }
        else:
            results["cbp"] = {
                "available": False,
                "missing_columns": missing_cbp_cols
            }
        
        return jsonify({
            "success": True,
            "message": "Data processed successfully",
            "results": results,
            "total_records": len(df)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-china-post', methods=['POST'])
def generate_china_post():
    """Generate China Post output file"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        df = pd.DataFrame(data)
        
        # Check for required columns
        missing_cols = [col for col in CP_COLUMNS if col not in df.columns]
        if missing_cols:
            return jsonify({
                "error": "Missing required columns for China Post output",
                "missing_columns": missing_cols
            }), 400
        
        # Generate file
        output = create_china_post_output(df)
        
        return send_file(
            output,
            as_attachment=True,
            download_name=f"china_post_output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-cbp', methods=['POST'])
def generate_cbp():
    """Generate CBP output file"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        df = pd.DataFrame(data)
        
        # Check for required columns
        missing_cols = [col for col in CBP_COLUMNS if col not in df.columns]
        if missing_cols:
            return jsonify({
                "error": "Missing required columns for CBP output",
                "missing_columns": missing_cols
            }), 400
        
        # Generate file
        output = create_cbp_output(df)
        
        return send_file(
            output,
            as_attachment=True,
            download_name=f"cbp_output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/columns', methods=['GET'])
def get_columns():
    """Get the required column definitions"""
    return jsonify({
        "china_post_columns": CP_COLUMNS,
        "cbp_columns": CBP_COLUMNS,
        "total_unique_columns": list(set(CP_COLUMNS + CBP_COLUMNS))
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)