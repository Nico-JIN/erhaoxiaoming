"""
数据库迁移脚本 - 添加 notifications 表
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from backend.app.db.session import get_db_url

def run_migration():
    """执行数据库迁移"""
    engine = create_engine(get_db_url())
    
    with engine.connect() as conn:
        # 创建 notifications 表
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id CHAR(32) NOT NULL,
            actor_id CHAR(32),
            notification_type ENUM('LIKE', 'COMMENT', 'REPLY', 'DOWNLOAD', 'VIEW') NOT NULL,
            resource_id CHAR(32),
            content TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            INDEX idx_user_id (user_id),
            INDEX idx_actor_id (actor_id),
            INDEX idx_resource_id (resource_id),
            INDEX idx_is_read (is_read),
            INDEX idx_created_at (created_at),
            INDEX idx_notification_type (notification_type),
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        conn.execute(text(create_table_sql))
        conn.commit()
        print("✅ Successfully created notifications table!")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
