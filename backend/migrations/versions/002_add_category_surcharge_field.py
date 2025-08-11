"""Add category surcharge field to support base + surcharge tariff calculation

Revision ID: 002_add_category_surcharge_field
Revises: 001_add_system_config_table
Create Date: 2025-01-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_category_surcharge_field'
down_revision = '3ba6a9d1f183'
branch_labels = None
depends_on = None


def upgrade():
    """Add category_surcharge field to tariff_rates table"""
    # Add the category_surcharge column as nullable with default
    op.add_column('tariff_rates', 
                  sa.Column('category_surcharge', sa.Float, nullable=True, default=0.0))
    
    # Update existing records to have 0.0 as default category_surcharge
    op.execute("UPDATE tariff_rates SET category_surcharge = 0.0 WHERE category_surcharge IS NULL")


def downgrade():
    """Remove category_surcharge field from tariff_rates table"""
    # Drop the column
    op.drop_column('tariff_rates', 'category_surcharge')