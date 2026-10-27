"""${message}"""
revision = ${up_revision}
down_revision = ${down_revision}
branch_labels = ${branch_labels}
depends_on = ${depends_on}

def upgrade() -> None:
    ${upgrade_if}
    pass
${else}
    pass
${end_if}

def downgrade() -> None:
    ${downgrade_if}
    pass
${else}
    pass
${end_if}
