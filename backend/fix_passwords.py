"""Password migration script."""

from backend.app.core.security import get_password_hash
from backend.app.db.session import SessionLocal
from backend.app.models import User
import hashlib
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def check_password_format():
    """Check if there are users with old password format"""
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.hashed_password.isnot(None)).all()
        print(f"Found {len(users)} users with passwords")
        
        # Note: We can't actually determine if a password is in old or new format
        # without knowing the original password
        print("\nIf you're experiencing password errors, you have two options:")
        print("1. Reset all user passwords (requires users to reset)")
        print("2. Manually reset affected user passwords")
        
        return users
    finally:
        db.close()


def reset_user_password(username: str, new_password: str):
    """Reset a specific user's password to new format"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"User '{username}' not found")
            return False
        
        # Hash the password using the new format (SHA256 + bcrypt)
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        print(f"✓ Password reset successfully for user '{username}'")
        return True
    except Exception as e:
        print(f"✗ Error resetting password: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def reset_admin_password():
    """Reset admin password to default (admin123)"""
    print("\nResetting admin password to 'admin123'...")
    return reset_user_password("admin", "admin123")


if __name__ == "__main__":
    print("="*60)
    print("Password Format Checker and Migrator")
    print("="*60)
    
    print("\nChecking current password status...")
    check_password_format()
    
    print("\n" + "="*60)
    print("Options:")
    print("1. Reset admin password to 'admin123'")
    print("2. Reset a specific user's password")
    print("3. Exit")
    print("="*60)
    
    choice = input("\nEnter your choice (1-3): ").strip()
    
    if choice == "1":
        reset_admin_password()
    elif choice == "2":
        username = input("Enter username: ").strip()
        new_password = input("Enter new password (6-200 characters): ").strip()
        if 6 <= len(new_password) <= 200:
            reset_user_password(username, new_password)
        else:
            print("✗ Password must be between 6 and 200 characters")
    else:
        print("Exiting...")
    
    print("\n" + "="*60)
    print("Done!")
    print("="*60)
