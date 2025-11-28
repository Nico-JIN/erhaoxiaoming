"""
Development server runner
"""
import sys
import os
from pathlib import Path

# Add parent directory to Python path
parent_dir = Path(__file__).parent.parent.absolute()
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

# Change working directory to parent (fixes Windows multiprocessing issue)
os.chdir(str(parent_dir))

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("Starting Erhaoxiaoming Backend Server")
    print("=" * 60)
    print("\nAPI Documentation: http://localhost:8000/docs")
    print("ReDoc: http://localhost:8000/redoc")
    print("\nPress CTRL+C to stop the server\n")
    print("=" * 60)
    
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(parent_dir / "backend")],
        log_level="info"
    )
