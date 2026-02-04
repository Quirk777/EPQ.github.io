from fastapi import APIRouter
from pathlib import Path

router = APIRouter(prefix="/debug", tags=["debug"])

@router.get("/reports")
def debug_reports():
    project_root = Path(__file__).resolve().parents[2]
    reports_dir = project_root / "reports"
    files = []
    if reports_dir.exists():
        files = sorted([p.name for p in reports_dir.glob("*.pdf")])
    return {
        "PROJECT_ROOT": str(project_root),
        "REPORTS_DIR": str(reports_dir),
        "report_files": files,
    }
