"""Add file_upload_id column to processed_shipments table

Revision ID: 007
Revises: 006
Create Date: 2025-08-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    """Add file_upload_id column to processed_shipments table"""
    # Add the new column
    op.add_column('processed_shipments', sa.Column('file_upload_id', sa.Integer(), nullable=True))
    
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_processed_shipments_file_upload_id',
        'processed_shipments', 'file_upload_history',
        ['file_upload_id'], ['id']
    )


def downgrade():
    """Remove file_upload_id column from processed_shipments table"""
    # Drop foreign key constraint
    op.drop_constraint('fk_processed_shipments_file_upload_id', 'processed_shipments', type_='foreignkey')
    
    # Drop the column
    op.drop_column('processed_shipments', 'file_upload_id')
