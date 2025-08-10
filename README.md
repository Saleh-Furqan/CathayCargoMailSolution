# Cathay Mail Solution

A comprehensive web application for managing US tariff compliance for Cathay Pacific's international mail services. The system processes CNP (China Post Network) data, integrates with pre-merged IODA (Integrated Operations Data Archive) flight information, calculates tariffs using configurable rate tables, and generates compliant output files for China Post and CBP (Customs and Border Protection).

**Note**: This implementation uses pre-processed IODA data files and does not perform raw CARDIT/MASTER/EVENT data merging. This design simplifies the data integration process while maintaining full functionality for tariff calculation and compliance reporting.

## 🎯 Key Features

- **Multi-Dimensional Tariff Management**: Configure tariff rates by route, goods category, postal service, date range, and weight
- **Automated Data Processing**: Process CNP raw data and merge with pre-processed IODA flight information
- **Smart Classification System**: Automatic goods categorization and postal service detection using configurable keyword mappings with admin interface
- **Weight-Based Rate Filtering**: Advanced rate selection based on package weight ranges with overlap validation
- **Batch Operations**: Recalculate all tariffs when rate configurations change
- **Real-Time Analytics**: Business intelligence dashboard with shipment insights
- **Database-Driven Architecture**: No hardcoded values - all rates stored in SQLite database with migration support
- **Classification Management**: Web interface for managing goods categories, keywords, and testing classification rules

## 🏗️ Architecture Overview

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │   Flask API     │    │  SQLite DB      │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Storage)     │
│                 │    │                 │    │                 │
│ • Tariff Mgmt   │    │ • Data Process  │    │ • Tariff Rates  │
│ • Analytics     │    │ • Rate Calc     │    │ • Processed     │
│ • File Upload   │    │ • API Endpoints │    │   Shipments     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
```
CNP Raw Data → Data Processor → Pre-merged IODA → Tariff Calculation → Output Generation
     ↓              ↓                ↓                    ↓                ↓
Excel Upload → Parse & Clean → Flight Matching → Rate Application → CBP/ChinaPost Files
```

## 🛠️ Tech Stack

### Frontend (React SPA)
- **Framework**: React 18.3+ with TypeScript 5.5+
- **Build Tool**: Vite 6.0+ for fast development and optimized builds
- **Styling**: Tailwind CSS 3.4+ with custom design system
- **State Management**: React hooks (useState, useEffect, useContext)
- **HTTP Client**: Native fetch API with custom service layer
- **Icons**: Lucide React 0.460+ (700+ icons)
- **Charts**: Recharts 2.12+ for analytics visualizations
- **File Processing**: 
  - xlsx library for Excel file handling
  - File upload with drag-and-drop support
- **Routing**: React Router v6 for SPA navigation
- **Development**: 
  - ESLint for code quality
  - TypeScript for type safety
  - Hot module replacement (HMR)

### Backend (Flask API)
- **Framework**: Flask 3.1+ (Python web framework)
- **Database**: 
  - SQLAlchemy 2.0+ (ORM with declarative base)
  - Flask-SQLAlchemy 3.1+ (Flask integration)
  - SQLite 3 (embedded database, production-ready)
  - Flask-Migrate 4.1+ & Alembic 1.16+ (database migrations)
- **Data Processing**:
  - pandas 2.3+ (data manipulation and analysis)
  - numpy (numerical computing dependency)
  - openpyxl 3.1+ (Excel file processing)
- **API Features**:
  - RESTful API design
  - Flask-CORS 6.0+ for cross-origin requests
  - JSON serialization with proper error handling
- **Configuration**: python-dotenv 1.0+ for environment management

### Database Schema
```sql
-- Tariff rate configurations (multi-dimensional)
TariffRate:
  - origin_country, destination_country (route)
  - goods_category, postal_service (classification)
  - start_date, end_date (validity period)
  - min_weight, max_weight (weight range)
  - tariff_rate, minimum_tariff, maximum_tariff

-- Processed shipment data
ProcessedShipment:
  - shipment details (tracking, weight, value)
  - classification (derived category, service)
  - calculated tariff information
  - flight and routing data
```

### File Processing Pipeline
```
Raw CNP Data (Excel) → pandas DataFrame → Data Validation → IODA Integration
                                             ↓
Enhanced Tariff System ← Goods Classification ← Weight-Based Filtering
           ↓
    Rate Application → Database Storage → Export Generation (ChinaPost/CBP)
```

## 🧠 Classification Management System

The application includes a comprehensive classification management interface that allows administrators to configure and test automatic goods categorization rules.

### Key Features
- **Category Management**: Add, edit, and remove goods categories with associated keywords
- **Keyword Management**: Manage keyword mappings that automatically classify shipment contents
- **Classification Testing**: Test classification rules with real content descriptions to see predicted categories, confidence scores, and matched keywords
- **Service Pattern Viewing**: View postal service detection patterns (EMS, Registered Mail, Air Mail, etc.)
- **Real-time Validation**: Immediate feedback on classification changes with notifications

### How Classification Works
1. **Content Analysis**: When processing shipment data, the system analyzes the declared content description
2. **Keyword Matching**: Matches keywords against predefined category mappings
3. **Confidence Scoring**: Calculates confidence based on keyword matches and content relevance
4. **Service Detection**: Uses tracking number patterns to identify postal service types
5. **Tariff Application**: Uses classified category and service to select appropriate tariff rates

### Accessing Classification Management
Navigate to **Classification Management** from the main menu to:
- Add new goods categories and keywords
- Test classification with sample content
- View service pattern descriptions
- Monitor classification accuracy

## ⚠️ Current Limitations

This implementation includes the following limitations and design decisions:

### Data Integration
- **Pre-merged IODA Files**: Uses pre-processed IODA data files rather than performing raw CARDIT/MASTER/EVENT data merging
- **File-based Integration**: Relies on Excel file uploads rather than real-time data feeds

### Tariff Rate Management
- **Origin/Destination Editing**: Origin and destination fields cannot be modified in existing rates (delete and recreate required)
- **Weight Range Validation**: System prevents overlapping weight ranges but manual verification may be needed for complex scenarios
- **Date Range Constraints**: Overlapping date ranges are restricted per route/category/service combination

### Classification System
- **Service Patterns**: Postal service detection patterns are fixed and require backend configuration changes
- **Keyword Management**: Category keywords are configurable through the UI but service patterns are not
- **Fallback Rates**: System uses configurable fallback rates when specific tariff configurations are not found

### System Architecture
- **Single Database**: Uses SQLite for demonstration purposes (production may require PostgreSQL/MySQL)
- **No Authentication**: Current implementation focuses on functionality without user authentication
- **Local File Storage**: Processes files locally without cloud storage integration

## 🚀 Getting Started

### Prerequisites
- **Node.js**: 18.0+ (for React frontend)
- **Python**: 3.8+ (for Flask backend)
- **Package Managers**: npm 8+ or yarn 1.22+
- **Memory**: 4GB RAM minimum (8GB recommended for large datasets)
- **Storage**: 1GB free space (more for large shipment databases)

### Quick Installation

1. **Clone the repository**
```bash
git clone https://github.com/Saleh-Furqan/CathayCargoMailSolution.git
cd CathayCargoMailSolution
```

2. **Backend Setup**
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Initialize database and migrations (production-ready)
python setup_migrations.py
```

3. **Frontend Setup**
```bash
cd ../frontend

# Install Node.js dependencies
npm install

# Optional: Install specific versions if needed
# npm install react@18.3.1 typescript@5.5.4
```

### Alternative Quick Start
For the fastest setup, use the provided start script:
```bash
# Make executable and run
chmod +x start.sh
./start.sh
```
This script will set up both backend and frontend automatically.

### Development Mode

Run both servers for development with hot-reloading:

#### Backend Server (Port 5001)
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
python src/app.py
```
- API available at: `http://localhost:5001`
- Debug mode enabled with auto-reload
- SQLite database: `backend/data/shipments.db`
- Logs: Console output and `backend/data/app.log`

#### Frontend Server (Port 5173)
```bash
cd frontend
npm run dev
```
- Web interface: `http://localhost:5173`
- Hot module replacement (HMR) enabled
- TypeScript compilation with Vite
- Auto-opens browser on start

### Quick Start for Demo

The fastest way to get the application running for demonstration:

```bash
# 1. Backend Setup (Terminal 1)
cd backend
source venv/bin/activate
python src/app.py

# 2. Frontend Setup (Terminal 2)  
cd frontend
npm run dev
```

Your application will be available at:
- **Frontend**: http://localhost:5173 (or 3001 if 5173 is busy)
- **Backend API**: http://localhost:5001

### Production Notes

For production deployment:
- Use `gunicorn` or similar WSGI server for the Flask backend
- Build the frontend with `npm run build` and serve with nginx/apache
- Configure environment variables and database settings appropriately
- See the included `deploy.py` script for automated deployment validation

## 📱 Application Usage

### 1. Access the Web Interface
- **Development**: `http://localhost:5173`
- **Production**: Your deployed URL
- **Mobile Compatible**: Responsive design works on tablets and mobile devices

### 2. Navigation Structure
```
📤 Data Processing (/)  
├── CNP file upload and processing via drag-and-drop interface
├── Real-time processing status and validation
├── Pre-merged IODA data integration and matching
├── Automated tariff calculation with rate explanations
├── Business insights dashboard with analytics charts
├── Export capabilities (ChinaPost/CBP formats)
└── Processing history and fallback rate usage summary

📊 Historical Data (/historical-data)
├── Comprehensive shipment history with advanced filtering
├── Search by tracking number, date range, route, or category
├── Detailed shipment views with tariff calculation breakdowns
├── Data export capabilities in multiple formats
├── Historical analytics and trend visualization
└── Bulk operations on historical data

⚙️  Tariff Management (/tariff-management)
├── Multi-dimensional tariff rate configuration interface
├── Route-based rate management (origin → destination)
├── Weight-based filtering with overlap validation and warnings
├── Date range management with conflict detection
├── Interactive tariff calculator for testing rates
├── Batch tariff recalculation for existing shipments
└── System fallback rate configuration

🧠 Classification Management (/classification-management)
├── Interactive goods category and keyword management
├── Real-time classification testing with confidence scoring
├── Keyword-to-category mapping interface
├── Service pattern viewing and documentation
├── Classification accuracy monitoring and validation
└── Admin tools for category maintenance
```

### 3. Core Workflows

#### A. Process New Shipment Data
```
1. Navigate to "Data Processing"
2. Upload CNP Excel file (drag & drop or click)
3. System automatically:
   - Validates file format
   - Merges with IODA flight data
   - Applies tariff calculations
   - Stores in database
4. Download generated ChinaPost/CBP files
```

#### B. Configure Tariff Rates
```
1. Go to "Tariff Management"
2. View existing routes and rates
3. Click "Configure Rate" for any route
4. Set parameters:
   - Route (origin → destination)
   - Goods category and postal service
   - Date range and weight limits  
   - Tariff rate and min/max amounts
5. Save configuration
6. Use "Recalculate All Tariffs" to update existing data
```

#### C. Test Tariff Calculations
```
1. In Tariff Management, click "Tariff Calculator"
2. Enter shipment details:
   - Origin and destination
   - Declared value and weight
   - Goods category and service type
3. View calculated tariff with explanation:
   - Green = Configured rate applied
   - Yellow = System fallback rate used
```

#### D. Manage Classification Rules
```
1. Navigate to "Classification Management"
2. Test Classification:
   - Enter goods description text
   - View predicted category and confidence
   - See matched keywords
3. Manage Categories:
   - Add/remove keywords from existing categories
   - Create new goods categories
   - Keywords automatically classify shipment content
4. Review Service Patterns:
   - View postal service detection patterns
   - Contact administrator for pattern modifications
```

### 4. Data Requirements

#### CNP Input File Format
Your Excel file should contain columns matching this structure:
```
Required CNP Columns (25 total):
- Bag Number, Container Number, Receptacle
- Receptacle Weight, Tracking Number  
- Transfer Station1, Carrier 1, Transfer Station2, Carrier 2
- Destination Station, Sender/Receiver details (name, country, city, street, postal)
- Content, HS code, Customs Declared Value, Currency
```

#### IODA Reference Data
System requires IODA flight data with columns:
```
IODA Columns (17 total):
- Receptacle, PAWB, CARDIT
- Host Origin Station, Host Destination Station
- Flight Carrier 1/2, Flight Number 1/2, Flight Date 1/2
- Actual depart/arrive datetime 1/2
- Arrival Date, Arrival ULD number
```

#### Output Files Generated
- **ChinaPost Export**: 23 columns with shipment and tariff details
- **CBP Export**: 6 columns (Carrier Code, Flight Number, Tracking Number, Arrival Port Code, Arrival Date, Declared Value)

## 🔌 API Reference

### Core Data Processing
```http
POST /upload-cnp-file
Content-Type: multipart/form-data
Body: file (Excel file)
Response: { success, message, processed_count }

GET /historical-data
Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Response: Array of processed shipments

POST /generate-chinapost
Response: Excel file download

POST /generate-cbd  
Response: Excel file download
```

### Tariff Management
```http
# Rate Configuration
GET /tariff-routes
Response: Array of route statistics

GET /tariff-rates
Response: Array of configured rates  

POST /tariff-rates
Body: { origin_country, destination_country, goods_category, postal_service, 
        start_date, end_date, min_weight, max_weight, tariff_rate, 
        minimum_tariff, maximum_tariff, notes }

PUT /tariff-rates/:id
Body: Rate update object

DELETE /tariff-rates/:id
Response: { success, message }

# Tariff Calculation
POST /calculate-tariff
Body: { origin_country, destination_country, declared_value, weight?, 
        goods_category?, postal_service?, ship_date? }
Response: { tariff_amount, rate_used, calculation_method, message }

POST /batch-recalculate-tariffs
Body: { start_date?, end_date?, routes[]? }
Response: { success, updated_count, total_shipments }
```

### System Configuration
```http
GET /tariff-system-defaults
Response: { system_defaults, system_stats }

GET /tariff-categories  
Response: { categories: string[] }

GET /tariff-services
Response: { services: string[] }

GET /health
Response: { status: "healthy", timestamp }
```

### Classification Management
```http
# Get classification configuration
GET /classification-config
Response: { category_mappings, service_patterns }

# Test classification
POST /classification-test
Body: { content: "goods description" }
Response: { category, confidence, matched_keywords }

# Manage category keywords  
GET /classification-categories
Response: { categories: string[] }

POST /classification-categories/:category/keywords
Body: { keywords: string[] }
Response: { success, message }

DELETE /classification-categories/:category/keywords
Body: { keywords: string[] }
Response: { success, message }

# View service patterns
GET /classification-services
Response: { services: string[] }

GET /classification-services/:service
Response: { patterns: string[] }
```

### Analytics
```http
GET /get-analytics-data
Query: Date filtering and category filters
Response: Comprehensive analytics object

GET /cbp-analytics
Response: CBP-specific analytics

GET /chinapost-analytics  
Response: ChinaPost-specific analytics
```

## 🛠️ Development & Maintenance

### Development Scripts

#### Frontend Commands
```bash
npm run dev         # Start Vite dev server (http://localhost:5173)
npm run build       # Build for production (outputs to dist/)  
npm run preview     # Preview production build locally
npm run lint        # Run ESLint for code quality
npm run type-check  # Run TypeScript compiler checks
```

#### Backend Commands  
```bash
# Development (run from backend/ directory)
python src/app.py               # Start Flask dev server (auto-reload)
python setup_migrations.py     # Initialize database migrations
python deploy.py                # Run production deployment checks

# Database Management
flask db init                   # Initialize migrations (one-time)
flask db migrate -m "message"   # Create new migration
flask db upgrade                # Apply pending migrations
flask db downgrade              # Rollback last migration

# Production
gunicorn -w 4 -b 0.0.0.0:5001 src.app:app  # WSGI production server
```

### 📁 Project Structure

```
CathayCargoMailSolution/
├── 📚 docs/                          # Documentation & screenshots
│   └── screenshots/                 # Application screenshots
│
├── 🖥️ frontend/                      # React SPA (TypeScript + Vite)
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Layout/             # App shell and navigation
│   │   │   ├── Dashboard/          # Analytics components
│   │   │   ├── CBPSection/         # CBP-specific UI components
│   │   │   ├── ChinaPostSection/   # ChinaPost-specific UI components
│   │   │   ├── TariffSection/      # Tariff management components
│   │   │   ├── CountryFlag/        # Country flag display components
│   │   │   ├── EnhancedFilters/    # Advanced filtering components
│   │   │   └── Notification/       # Toast and notification components
│   │   ├── pages/                  # Route-level page components
│   │   │   ├── DataIngestionSimple.tsx      # Main file upload and processing
│   │   │   ├── TariffManagement.tsx         # Comprehensive rate configuration
│   │   │   ├── ClassificationManagement.tsx # Category and service management
│   │   │   ├── HistoricalData.tsx           # Shipment history and analytics
│   │   │   ├── CBPReporting.tsx             # CBP-specific reporting
│   │   │   ├── ChinaPostInvoicing.tsx       # ChinaPost-specific features
│   │   │   ├── DataConsolidation.tsx        # Data consolidation tools
│   │   │   ├── Reconciliation.tsx           # Data reconciliation features
│   │   │   ├── Settings.tsx                 # System configuration
│   │   │   └── ShipmentTracking.tsx         # Shipment tracking features
│   │   ├── services/               # API integration layer
│   │   │   └── api.ts             # HTTP client and all API endpoints
│   │   ├── types/                 # TypeScript type definitions
│   │   │   └── index.ts           # Comprehensive type definitions
│   │   └── utils/                 # Utility functions
│   │       └── displayHelpers.ts  # UI formatting and display utilities
│   ├── public/                     # Static assets
│   │   ├── cathay-logo.svg        # Main Cathay logo
│   │   ├── cathay-logo-white.svg  # White variant logo
│   │   └── favicon.ico            # Browser favicon
│   └── package.json               # Dependencies and build scripts
│
├── ⚙️ backend/                       # Flask API (Python)
│   ├── src/                        # Organized source code
│   │   ├── app.py                 # Main Flask application with all API endpoints
│   │   ├── config/                # Configuration files
│   │   │   ├── settings.py        # Flask app configuration and environment
│   │   │   └── classification.py  # Goods classification and service mappings
│   │   ├── models/                # SQLAlchemy database models
│   │   │   └── database.py        # ProcessedShipment, TariffRate, SystemConfig models
│   │   ├── services/              # Core business logic
│   │   │   └── data_processor.py  # CNP data processing and IODA integration
│   │   └── utils/                 # Utility functions and helpers
│   │       ├── data_converter.py  # Safe data type conversion utilities
│   │       └── migrate_db.py      # Database migration utilities
│   ├── migrations/                 # Alembic database migrations
│   │   ├── versions/              # Version-controlled migration files
│   │   ├── alembic.ini           # Alembic configuration
│   │   └── env.py                # Migration environment setup
│   ├── templates/                  # Excel file templates
│   │   ├── CBP transported package worksheet file template.xlsx
│   │   └── China Post data source file template.xlsx
│   ├── data/                      # Runtime data and database
│   │   ├── shipments.db           # SQLite database (production-ready)
│   │   ├── sample_data.json       # Sample data for testing
│   │   ├── app.log               # Application logs
│   │   ├── server.log            # Server operation logs
│   │   └── *.xlsx                # Generated export files
│   ├── debug_test.py              # Development debugging script
│   ├── setup_migrations.py        # Database initialization script
│   ├── deploy.py                  # Production deployment validation
│   ├── run.sh                    # Startup script
│   ├── requirements.txt           # Python dependencies
│   └── venv/                      # Python virtual environment
│
├── 📊 sample-data/                   # Sample data and analysis
│   ├── ioda/                      # Pre-processed IODA reference data files
│   │   ├── CBD EXPORT.xlsx        # CBP export sample data
│   │   ├── CHINAPOST EXPORT.xlsx  # ChinaPost export sample data
│   │   ├── IMPORTED DATA.xlsx     # Sample imported IODA data
│   │   ├── Sample_Data_from_IODA_v4 (China Post).xlsx # IODA sample v4
│   │   └── master_cardit_inner_event_df(IODA DATA).xlsx # Main IODA dataset
│   ├── cnp/                       # CNP sample input files
│   │   └── Sample Data.xlsx       # CNP raw data sample for testing
│   └── notebooks/                 # Data analysis and processing notebooks
│       └── script_v4.ipynb        # Data processing analysis notebook
│
├── start.sh                         # Quick start script for development
├── pyrightconfig.json               # Python language server configuration
├── README.md                        # This comprehensive guide
├── START_HERE.md                    # Quick start documentation
└── ENHANCED_TARIFF_IMPLEMENTATION.md # Technical specification and design
```

### 🔧 Configuration Management

#### Environment Variables (.env file)
```bash
# Database Configuration
DATABASE_URL=sqlite:///backend/data/shipments.db
FLASK_ENV=development  # or 'production'

# CORS Settings  
FRONTEND_URL=http://localhost:5173

# File Processing
MAX_FILE_SIZE=50MB
ALLOWED_EXTENSIONS=xlsx,xls

# Logging
LOG_LEVEL=INFO
LOG_FILE=app.log
```

#### Customizable Classification (`classification_config.py`)
```python
# Add new goods categories
CATEGORY_MAPPINGS['Custom Category'] = ['keyword1', 'keyword2']

# Modify postal service patterns
SERVICE_PATTERNS['New Service'] = [
    lambda t: t.startswith('XX') and len(t) == 13,
]
```

### 🚀 Production Deployment Notes

For production deployment beyond demonstration purposes:

- **Database**: Consider PostgreSQL or MySQL for production instead of SQLite
- **Security**: Implement proper authentication, HTTPS, and environment variable management
- **Scalability**: Use proper WSGI servers (gunicorn/uwsgi) and reverse proxies (nginx/apache)
- **Monitoring**: Set up proper logging, monitoring, and backup procedures
- **Validation**: Use the included `deploy.py` script to validate environment setup

This demonstration version focuses on functionality over production infrastructure.

### 🔍 Monitoring & Maintenance

#### Key Metrics to Monitor
- **Database Size**: `du -h shipments.db`
- **Processing Performance**: Check console logs for timing
- **API Response Times**: Monitor `/health` endpoint
- **Memory Usage**: System resource monitoring
- **Error Rates**: Review `app.log` for exceptions

#### Maintenance Tasks for Production
- **Regular**: Monitor database size, review processed shipment counts
- **Periodic**: Update classification mappings based on new data patterns, backup database
- **As Needed**: Update dependencies, create database migrations, optimize performance

### 🐛 Comprehensive Troubleshooting

#### Backend Issues

**Database Connection Errors**
```bash
# Check database file permissions
ls -la shipments.db
chmod 664 shipments.db  # If needed

# Reset database (development only)
rm shipments.db
python setup_migrations.py
```

**Migration Errors**  
```bash
# Check migration status
flask db current
flask db history

# Manually resolve conflicts
flask db stamp head  # Mark as current (careful!)
flask db migrate -m "Fix conflicts"
```

**Processing Pipeline Failures**
```bash
# Enable verbose logging
export LOG_LEVEL=DEBUG
python app.py

# Check IODA data file
ls -la "data processing/master_cardit_inner_event_df.xlsx"
```

#### Frontend Issues

**Build Failures**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

**API Connection Issues**
```bash
# Verify backend is running
curl http://localhost:5001/health

# Check CORS configuration in app.py
# Ensure frontend URL matches CORS origin
```

**File Upload Problems**
- Maximum file size: 50MB (configurable)
- Supported formats: .xlsx, .xls only
- Check browser developer tools for JavaScript errors
- Verify file contains required CNP columns

#### Performance Optimization

**Large File Processing**
```python
# Increase processing chunk size in data_processor.py
CHUNK_SIZE = 10000  # Process in smaller batches

# Monitor memory usage during processing
import psutil
print(f"Memory: {psutil.virtual_memory().percent}%")
```

**Database Performance**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_shipment_date ON processed_shipments(arrival_date);
CREATE INDEX idx_route ON tariff_rates(origin_country, destination_country);
```

### 📞 Support & Handover Information

#### Key Contact Points for New Team
1. **Database Schema**: See `models.py` for complete data structure
2. **Business Logic**: Primary processing in `data_processor.py`
3. **API Definitions**: All endpoints documented in `app.py`
4. **Frontend Components**: Check `components/` and `pages/` directories
5. **Configuration**: Customizable settings in `classification_config.py`

#### Common Change Requests
- **New Goods Categories**: Edit `CATEGORY_MAPPINGS` in `classification_config.py`
- **Additional API Endpoints**: Add to `app.py` following existing patterns
- **UI Modifications**: Update React components in `frontend/src/`
- **Database Schema Changes**: Create migrations with `flask db migrate`
- **Business Rules**: Modify logic in `TariffRate.calculate_tariff_for_shipment()`

This system is designed for easy maintenance and extension. The modular architecture allows for independent development of frontend and backend components, while the configurable classification system enables business users to adapt the system without code changes.
