# Cathay Mail Solution

A comprehensive web application for managing US tariff compliance for Cathay Pacific's international mail services. The system processes CNP (China Post Network) data, integrates with IODA flight information, calculates tariffs using configurable rate tables, and generates compliant output files for China Post and CBP (Customs and Border Protection).

## 🎯 Key Features

- **Multi-Dimensional Tariff Management**: Configure tariff rates by route, goods category, postal service, date range, and weight
- **Automated Data Processing**: Process CNP raw data and merge with IODA flight information
- **Smart Classification**: Automatic goods categorization and postal service detection using configurable keyword mappings  
- **Weight-Based Rate Filtering**: Advanced rate selection based on package weight ranges
- **Batch Operations**: Recalculate all tariffs when rate configurations change
- **Real-Time Analytics**: Business intelligence dashboard with shipment insights
- **Database-Driven Architecture**: No hardcoded values - all rates stored in SQLite database
- **Production Ready**: Database migrations, deployment scripts, and comprehensive error handling

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
CNP Raw Data → Data Processor → IODA Integration → Tariff Calculation → Output Generation
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
cd backend/backend

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
cd ../../frontend

# Install Node.js dependencies
npm install

# Optional: Install specific versions if needed
# npm install react@18.3.1 typescript@5.5.4
```

### Development Mode

Run both servers for development with hot-reloading:

#### Backend Server (Port 5001)
```bash
cd backend/backend
source venv/bin/activate  # Activate virtual environment
python app.py
```
- API available at: `http://localhost:5001`
- Debug mode enabled with auto-reload
- SQLite database: `shipments.db`
- Logs: Console output and `app.log`

#### Frontend Server (Port 5173)
```bash
cd frontend
npm run dev
```
- Web interface: `http://localhost:5173`
- Hot module replacement (HMR) enabled
- TypeScript compilation with Vite
- Auto-opens browser on start

### Production Deployment

For production deployments, use the included deployment script:

```bash
cd backend/backend
source venv/bin/activate
python deploy.py
```

**Deployment Script Features:**
- ✅ Dependency verification
- ✅ Configuration validation
- ✅ Database migration execution
- ✅ Environment setup checks
- ✅ Production readiness verification

### Manual Production Setup

If you prefer manual setup:

```bash
# Backend (Production)
cd backend/backend
source venv/bin/activate

# Run database migrations
flask db upgrade

# Start with production WSGI server (recommended)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app

# Frontend (Production Build)
cd ../../frontend
npm run build
npm run preview  # Or serve with nginx/apache
```

## 📱 Application Usage

### 1. Access the Web Interface
- **Development**: `http://localhost:5173`
- **Production**: Your deployed URL
- **Mobile Compatible**: Responsive design works on tablets and mobile devices

### 2. Navigation Structure
```
📊 Analytics Dashboard (/)
├── Business insights and KPI metrics
├── Shipment volume and value trends  
└── Rate utilization statistics

📤 Data Processing (/data-processing)  
├── CNP file upload and processing
├── IODA data integration
├── Automated tariff calculation
└── Fallback rate usage summary

⚙️  Tariff Management (/tariff-management)
├── Multi-dimensional rate configuration
├── Weight-based filtering setup
├── Batch tariff recalculation
└── Rate testing calculator

🔧 Classification Management (/classification-management)
├── Goods category keyword management
├── Classification testing tool
├── Postal service pattern viewing
└── Real-time classification validation
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
# Development
python app.py                    # Start Flask dev server (auto-reload)
python setup_migrations.py      # Initialize database migrations
python deploy.py                 # Run production deployment checks

# Database Management
flask db init                    # Initialize migrations (one-time)
flask db migrate -m "message"    # Create new migration
flask db upgrade                 # Apply pending migrations
flask db downgrade               # Rollback last migration

# Production
gunicorn -w 4 -b 0.0.0.0:5001 app:app  # WSGI production server
```

### 📁 Project Structure

```
CathayCargoMailSolution/
├── 🖥️ frontend/                    # React SPA (TypeScript + Vite)
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Layout/           # App shell and navigation
│   │   │   └── Dashboard/        # Analytics components  
│   │   ├── pages/                # Route-level components
│   │   │   ├── DataIngestionSimple.tsx     # File upload and processing
│   │   │   ├── TariffManagement.tsx        # Rate configuration
│   │   │   ├── ClassificationManagement.tsx # Category/service management
│   │   │   └── HistoricalData.tsx          # Historical analytics
│   │   ├── services/             # API integration layer
│   │   │   └── api.ts           # HTTP client and endpoints
│   │   └── types/               # TypeScript definitions
│   ├── public/                   # Static assets
│   └── package.json             # Dependencies and scripts
│
├── ⚙️ backend/backend/             # Flask API (Python)
│   ├── 📊 Core Application
│   │   ├── app.py               # Main Flask app with all endpoints
│   │   ├── models.py            # SQLAlchemy database models
│   │   ├── config.py            # Application configuration
│   │   └── data_processor.py    # CNP data processing pipeline
│   │
│   ├── 🗄️ Database & Migrations  
│   │   ├── migrations/          # Alembic database migrations
│   │   ├── setup_migrations.py  # Migration initialization utility
│   │   └── shipments.db         # SQLite database file
│   │
│   ├── 🔧 Configuration & Deployment
│   │   ├── classification_config.py  # Configurable category mappings
│   │   ├── deploy.py                 # Production deployment script
│   │   ├── requirements.txt          # Python dependencies
│   │   └── venv/                     # Virtual environment
│   │
│   └── 📄 Templates & Data
│       ├── templates/           # Excel template files
│       │   ├── CBP transported package worksheet file template.xlsx
│       │   └── China Post data source file template.xlsx
│       └── Sample Data.xlsx     # Example CNP data file
│
└── 📚 Documentation & Analysis
    ├── data processing/         # Jupyter notebooks for data analysis  
    │   ├── script_v4.ipynb     # Original processing workflow
    │   └── master_cardit_inner_event_df.xlsx  # IODA reference data
    ├── ENHANCED_TARIFF_IMPLEMENTATION.md      # Technical specification
    └── README.md               # This comprehensive guide
```

### 🔧 Configuration Management

#### Environment Variables (.env file)
```bash
# Database Configuration
DATABASE_URL=sqlite:///shipments.db
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

### 🚀 Production Deployment Checklist

#### Pre-Deployment
- [ ] Run `python deploy.py` to validate environment
- [ ] Backup existing database: `cp shipments.db shipments.db.backup`
- [ ] Test migrations: `flask db upgrade --sql` (dry run)
- [ ] Build frontend: `npm run build`
- [ ] Update environment variables for production
- [ ] Configure reverse proxy (nginx/apache) if needed

#### Security Considerations
- [ ] Use HTTPS in production
- [ ] Set strong `SECRET_KEY` in Flask config
- [ ] Implement proper access controls
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity

### 🔍 Monitoring & Maintenance

#### Key Metrics to Monitor
- **Database Size**: `du -h shipments.db`
- **Processing Performance**: Check console logs for timing
- **API Response Times**: Monitor `/health` endpoint
- **Memory Usage**: System resource monitoring
- **Error Rates**: Review `app.log` for exceptions

#### Regular Maintenance Tasks
```bash
# Weekly
- Review processed shipment counts
- Check database growth and performance  
- Verify tariff rate configurations

# Monthly  
- Backup database: tar -czf backup-$(date +%Y%m%d).tar.gz shipments.db
- Review and archive old shipments if needed
- Update classification mappings based on new data patterns

# As Needed
- Update dependencies: pip freeze > requirements.txt
- Create database migrations for schema changes
- Monitor and optimize slow queries
```

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
