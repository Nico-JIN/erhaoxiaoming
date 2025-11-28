"""Operation logging helpers."""

from typing import Optional

from sqlalchemy.orm import Session

from backend.app.models import OperationLog


def log_operation(
    db: Session,
    user_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    ip_address: str = "0.0.0.0",
    user_agent: str = "",
    details: Optional[str] = None,
) -> None:
    """Persist a user action for auditing."""

    log = OperationLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
    )
    db.add(log)
    db.commit()
