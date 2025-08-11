"""Add surcharge tracking fields to ProcessedShipment model

Revision ID: 003_add_surcharge_tracking_to_shipments
Revises: 002_add_category_surcharge_field
Create Date: 2025-01-14 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_surcharge_tracking_to_shipments'
down_revision = '002_add_category_surcharge_field'
branch_labels = None
depends_on = None


def upgrade():
    """Add surcharge tracking fields to processed_shipments table"""
    # Add tariff surcharge tracking fields
    op.add_column('processed_shipments', 
                  sa.Column('tariff_surcharge_used', sa.Float, default=0.0, nullable=True))
    
    op.add_column('processed_shipments', 
                  sa.Column('base_rate_id', sa.Integer, nullable=True))
    
    op.add_column('processed_shipments', 
                  sa.Column('surcharge_rate_id', sa.Integer, nullable=True))
    
    # Update the tariff_calculation_method column to support new values
    op.alter_column('processed_shipments', 'tariff_calculation_method',
                    existing_type=sa.String(20),
                    type_=sa.String(30),
                    existing_nullable=True)
    
    # Update existing records with default values
    op.execute("UPDATE processed_shipments SET tariff_surcharge_used = 0.0 WHERE tariff_surcharge_used IS NULL")


def downgrade():
    """Remove surcharge tracking fields from processed_shipments table"""
    # Revert tariff_calculation_method column length
    op.alter_column('processed_shipments', 'tariff_calculation_method',
                    existing_type=sa.String(30),
                    type_=sa.String(20),
                    existing_nullable=True)
    
    # Drop the new columns
    op.drop_column('processed_shipments', 'surcharge_rate_id')
    op.drop_column('processed_shipments', 'base_rate_id')
    op.drop_column('processed_shipments', 'tariff_surcharge_used')