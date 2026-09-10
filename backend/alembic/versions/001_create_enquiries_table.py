"""create enquiries table

Revision ID: 001_create_enquiries
Revises: 
Create Date: 2026-09-09 14:24:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_create_enquiries'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'enquiries',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('reference', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('company', sa.String(length=150), nullable=True),
        sa.Column('service', sa.String(length=50), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('delivered', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('delivery_channels', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_enquiries_reference'), 'enquiries', ['reference'], unique=True)
    op.create_index(op.f('ix_enquiries_email'), 'enquiries', ['email'], unique=False)
    op.create_index(op.f('ix_enquiries_created_at'), 'enquiries', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_enquiries_created_at'), table_name='enquiries')
    op.drop_index(op.f('ix_enquiries_email'), table_name='enquiries')
    op.drop_index(op.f('ix_enquiries_reference'), table_name='enquiries')
    op.drop_table('enquiries')
