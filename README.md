# Cathay Cargo Mail Solution

A web application for managing US tariff compliance for Cathay Pacific Cargo's international mail services. The system processes template data and generates China Post and CBP (Customs and Border Protection) compliant output files.

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **File Processing**: xlsx library
- **Routing**: React Router v6

### Backend
- **Framework**: Flask (Python)
- **Data Processing**: pandas, openpyxl
- **CORS**: flask-cors
- **File Generation**: Excel template processing

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.8+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Saleh-Furqan/CathayCargoMailSolution.git
cd CathayCargoMailSolution
```

2. **Backend Setup**
```bash
cd backend/backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

3. **Frontend Setup**
```bash
cd ../../frontend

# Install dependencies
npm install
```

### Running the Application

You need to run both backend and frontend servers:

#### Start Backend Server
```bash
cd backend/backend
source venv/bin/activate
python app.py
# Backend will run on http://localhost:5000
```

#### Start Frontend Server
```bash
cd frontend
npm run dev
# Frontend will run on http://localhost:3000
```

### Usage

1. **Access the Application**
   - Open http://localhost:3000 in your browser
   - The interface shows the template processing page

2. **Process Data**
   - Upload your template Excel file (similar to `full_template_mock_data.xlsx` format)
   - The system will automatically process the file and validate columns

3. **Generate Output Files**
   - After successful processing, you'll see generation buttons
   - Click "Generate China Post" to create China Post data source file
   - Click "Generate CBP" to create CBP transported package worksheet
   - Files will be automatically downloaded

### File Format Requirements

#### Input Data Format
Your input Excel file should contain these columns for full functionality:

**China Post Columns (16 required):**
- `*运单号 (AWB Number)`
- `*始发站（Departure station）`
- `*目的站（Destination）`
- `*件数(Pieces)`
- `*重量 (Weight)`
- `航司(Airline)`
- `航班号 (Flight Number)`
- `航班日期 (Flight Date)`
- And 8 more columns for rates, charges, and totals

**CBP Columns (6 required):**
- `Carrier Code`
- `Flight/ Trip Number`
- `Tracking Number`
- `Arrival Port Code`
- `Arrival Date`
- `Declared Value (USD)`

#### Output Files
- **China Post Output**: Formatted Excel file ready for China Post submission
- **CBP Output**: Formatted Excel file for CBP compliance reporting

### API Endpoints

The backend provides these REST API endpoints:

- `GET /health` - Health check
- `GET /columns` - Get required column definitions
- `POST /process-data` - Process input data and validate
- `POST /generate-china-post` - Generate China Post Excel file
- `POST /generate-cbp` - Generate CBP Excel file

### Development Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

#### Backend
- `python app.py` - Start Flask development server
- `source venv/bin/activate` - Activate virtual environment

### Project Structure

```
CathayCargoMailSolution/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   └── types/          # TypeScript type definitions
│   └── package.json
├── backend/backend/         # Flask backend application
│   ├── templates/          # Excel template files
│   ├── app.py             # Main Flask application
│   ├── requirements.txt   # Python dependencies
│   └── venv/              # Virtual environment
├── project/               # Reference implementation (temporary)
│   ├── code.py            # Original processing logic
│   ├── templates/         # Template Excel files
│   └── *.xlsx            # Sample data files
└── data processing/      # Jupyter Notebooks for processing CX & CNP data
    ├── ~$master_cardit_inner_event_df.xlsx      # Data output from script.ipynb
    ├── master_cardit_inner_event_df.xlsx      # Data output from script.ipynb
    ├── script.ipynb      # jupyter notebook workflow 
    └── Sample_Data_from_IODA_v2 (China Post).xlsx      # Sample IODA data

```

### Features

- **Data Upload**: Drag-and-drop Excel file processing
- **Real-time Processing**: Live status updates during file processing
- **Template Generation**: Automated creation of compliant output files
- **Error Handling**: Comprehensive validation and error reporting
- **Backend Integration**: RESTful API communication
- **Responsive Design**: Modern UI with Tailwind CSS

### Troubleshooting

1. **Backend Connection Issues**
   - Ensure Flask server is running on port 5000
   - Check that virtual environment is activated
   - Verify all Python dependencies are installed

2. **File Processing Errors**
   - Ensure Excel file contains required columns
   - Check file format (should be .xlsx or .xls)
   - Verify data is not corrupted

3. **Frontend Issues**
   - Ensure all npm dependencies are installed
   - Check browser console for JavaScript errors
   - Verify xlsx library is properly installed
