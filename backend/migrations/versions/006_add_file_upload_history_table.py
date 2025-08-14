"""Add file upload history table

Revision ID: 006
Revises: 005
Create Date: 2025-08-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None

def upgrade():
    """Create the file_upload_history table"""
    op.create_table(
        'file_upload_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True, default=datetime.now),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('file_hash', sa.String(length=64), nullable=True),
        sa.Column('upload_timestamp', sa.DateTime(), nullable=True, default=datetime.now),
        sa.Column('processing_status', sa.String(length=50), nullable=True, default='pending'),
        sa.Column('processing_started_at', sa.DateTime(), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(), nullable=True),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('records_imported', sa.Integer(), nullable=True, default=0),
        sa.Column('records_skipped', sa.Integer(), nullable=True, default=0),
        sa.Column('chinapost_records', sa.Integer(), nullable=True, default=0),
        sa.Column('cbd_records', sa.Integer(), nullable=True, default=0),
        sa.Column('original_file_data', sa.LargeBinary(), nullable=True),
        sa.Column('chinapost_file_data', sa.LargeBinary(), nullable=True),
        sa.Column('cbd_file_data', sa.LargeBinary(), nullable=True),
        sa.Column('original_mime_type', sa.String(length=100), nullable=True, default='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        sa.Column('chinapost_mime_type', sa.String(length=100), nullable=True, default='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        sa.Column('cbd_mime_type', sa.String(length=100), nullable=True, default='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        sa.Column('uploaded_by', sa.String(length=100), nullable=True, default='system'),
        sa.Column('upload_notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index on upload_timestamp for efficient date-based queries
    op.create_index('idx_file_upload_timestamp', 'file_upload_history', ['upload_timestamp'])
    
    # Create index on processing_status for filtering
    op.create_index('idx_file_upload_status', 'file_upload_history', ['processing_status'])
    
    # Create index on file_hash for duplicate detection
    op.create_index('idx_file_upload_hash', 'file_upload_history', ['file_hash'])

def downgrade():
    """Drop the file_upload_history table"""
    op.drop_index('idx_file_upload_hash', table_name='file_upload_history')
    op.drop_index('idx_file_upload_status', table_name='file_upload_history')
    op.drop_index('idx_file_upload_timestamp', table_name='file_upload_history')
    op.drop_table('file_upload_history')
