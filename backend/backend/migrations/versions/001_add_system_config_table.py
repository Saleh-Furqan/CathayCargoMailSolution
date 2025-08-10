"""Add SystemConfig table and enhance shipment fields

Revision ID: 001
Revises: 
Create Date: 2025-08-10 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create system_config table
    op.create_table('system_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('config_key', sa.String(length=100), nullable=False),
        sa.Column('config_value', sa.String(length=500), nullable=False),
        sa.Column('config_type', sa.String(length=20), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('config_key')
    )
    
    # Add index on config_key for performance
    op.create_index('idx_system_config_key', 'system_config', ['config_key'], unique=True)
    
    # Insert default fallback rate configuration
    op.execute("""
        INSERT INTO system_config (config_key, config_value, config_type, description, created_at, updated_at)
        VALUES ('fallback_tariff_rate', '0.8', 'float', 'Dynamic fallback rate for tariff calculations when no specific rate is configured', DATETIME('now'), DATETIME('now'))
    """)


def downgrade():
    # Drop system_config table
    op.drop_index('idx_system_config_key', table_name='system_config')
    op.drop_table('system_config')