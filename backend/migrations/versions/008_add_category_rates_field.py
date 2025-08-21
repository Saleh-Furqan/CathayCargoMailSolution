"""Add category_rates JSON field to tariff_rates table

Revision ID: 008_add_category_rates_field
Revises: 007_add_file_upload_id_to_shipments
Create Date: 2025-08-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '008_add_category_rates_field'
down_revision = '007_add_file_upload_id_to_shipments'
branch_labels = None
depends_on = None


def upgrade():
    """Add category_rates JSON field to tariff_rates table"""
    with op.batch_alter_table('tariff_rates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('category_rates', sa.JSON(), nullable=True))
    
    # Set default empty dict for existing records
    connection = op.get_bind()
    connection.execute(sa.text("UPDATE tariff_rates SET category_rates = '{}' WHERE category_rates IS NULL"))


def downgrade():
    """Remove category_rates field"""
    with op.batch_alter_table('tariff_rates', schema=None) as batch_op:
        batch_op.drop_column('category_rates')
