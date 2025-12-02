import sys
sys.path.insert(0, 'backend')

from app.db.session import SessionLocal
from app.models import User, UserRole, Notification

db = SessionLocal()

# Check admin users
print("=== ADMIN USERS ===")
admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
for admin in admins:
    print(f"Admin: {admin.username} (ID: {admin.id})")

# Check total notifications
notif_count = db.query(Notification).count()
print(f"\n=== TOTAL NOTIFICATIONS: {notif_count} ===")

# Check recent notifications
print("\n=== RECENT NOTIFICATIONS ===")
recent = db.query(Notification).order_by(Notification.created_at.desc()).limit(10).all()
for n in recent:
    user = db.query(User).filter(User.id == n.user_id).first()
    actor = db.query(User).filter(User.id == n.actor_id).first()
    print(f"To: {user.username if user else 'Unknown'}, From: {actor.username if actor else 'Unknown'}, Type: {n.notification_type}, Read: {n.is_read}")
    print(f"  Content: {n.content[:80]}")

db.close()
